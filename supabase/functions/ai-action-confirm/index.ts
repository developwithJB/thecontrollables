/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const toJson = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function normalizePlannerPayload(payload: any, fallbackDate: string) {
  const title = typeof payload?.title === "string" ? payload.title.trim().slice(0, 120) : "";
  if (!title) throw new Error("Planner item title is required");

  const itemType = payload?.item_type === "time_block" ? "time_block" : "task";
  const energy = ["low", "medium", "high"].includes(payload?.energy_level) ? payload.energy_level : "medium";

  return {
    title,
    description: typeof payload?.description === "string" ? payload.description.slice(0, 500) : null,
    scheduled_date:
      typeof payload?.scheduled_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.scheduled_date)
        ? payload.scheduled_date
        : fallbackDate,
    item_type: itemType,
    start_time: typeof payload?.start_time === "string" ? payload.start_time : null,
    end_time: typeof payload?.end_time === "string" ? payload.end_time : null,
    energy_level: energy,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return toJson({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return toJson({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const proposalId = typeof body.proposalId === "string" ? body.proposalId : null;
    const decision = body.decision === "approved" || body.decision === "rejected" ? body.decision : null;
    const editedPayload = body.editedPayload && typeof body.editedPayload === "object" ? body.editedPayload : null;
    const feedback = typeof body.feedback === "string" ? body.feedback.slice(0, 500) : null;

    if (!proposalId || !decision) return toJson({ error: "proposalId and decision are required" }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const userId = user.id;

    const { data: proposal, error: proposalError } = await admin
      .from("ai_action_proposals")
      .select("*, ai_daily_plans(plan_date)")
      .eq("id", proposalId)
      .eq("user_id", userId)
      .maybeSingle();

    if (proposalError || !proposal) return toJson({ error: "Proposal not found" }, 404);
    if (proposal.status !== "pending") return toJson({ error: "Proposal is no longer pending" }, 409);

    if (decision === "rejected") {
      const now = new Date().toISOString();
      await admin
        .from("ai_action_proposals")
        .update({ status: "rejected", rejected_at: now, updated_at: now, result: { feedback } })
        .eq("id", proposalId);
      await admin.from("ai_feedback_events").insert({
        user_id: userId,
        daily_plan_id: proposal.daily_plan_id,
        proposal_id: proposalId,
        feedback_type: "rejected",
        feedback_text: feedback,
      });
      return toJson({ status: "rejected" });
    }

    const now = new Date().toISOString();
    const payload = editedPayload || proposal.payload || {};
    let result: Record<string, unknown> = {};
    let nextPath: string | null = null;

    if (proposal.proposal_type === "planner_create_item") {
      const fallbackDate = proposal.ai_daily_plans?.plan_date || new Date().toISOString().slice(0, 10);
      const plannerPayload = normalizePlannerPayload(payload, fallbackDate);
      const { data: existing } = await admin
        .from("planner_items")
        .select("sort_order")
        .eq("user_id", userId)
        .eq("scheduled_date", plannerPayload.scheduled_date)
        .order("sort_order", { ascending: false })
        .limit(1);
      const sortOrder = existing && existing.length > 0 ? (existing[0].sort_order || 0) + 1 : 0;

      const { data: plannerItem, error: plannerError } = await admin
        .from("planner_items")
        .insert({
          ...plannerPayload,
          user_id: userId,
          status: "todo",
          sort_order: sortOrder,
        })
        .select("id, title, scheduled_date")
        .single();

      if (plannerError) throw plannerError;
      result = { planner_item_id: plannerItem.id, title: plannerItem.title, scheduled_date: plannerItem.scheduled_date };
      nextPath = "/planner";
    } else if (proposal.proposal_type === "daily_checkin_prompt") {
      result = {
        prompt: typeof payload.prompt === "string" ? payload.prompt : proposal.title,
      };
      nextPath = typeof payload.deep_link === "string" ? payload.deep_link : "/growth";
    } else {
      result = { message: "This proposal is tracked for attention but has no automatic action yet." };
      nextPath = typeof payload.deep_link === "string" ? payload.deep_link : null;
    }

    await admin
      .from("ai_action_proposals")
      .update({
        status: proposal.proposal_type === "planner_create_item" ? "executed" : "approved",
        approved_at: now,
        executed_at: proposal.proposal_type === "planner_create_item" ? now : null,
        updated_at: now,
        payload,
        result,
      })
      .eq("id", proposalId);

    await admin.from("ai_feedback_events").insert({
      user_id: userId,
      daily_plan_id: proposal.daily_plan_id,
      proposal_id: proposalId,
      feedback_type: "approved",
      feedback_text: feedback,
      metadata: { proposal_type: proposal.proposal_type },
    });

    if (proposal.daily_plan_id) {
      await admin
        .from("ai_daily_plans")
        .update({ status: "accepted", accepted_at: now, updated_at: now })
        .eq("id", proposal.daily_plan_id)
        .eq("user_id", userId);
    }

    return toJson({ status: "approved", result, nextPath });
  } catch (error) {
    console.error("ai-action-confirm error:", error);
    return toJson({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
