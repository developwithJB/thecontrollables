import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Curated automation recipes
const RECIPES: Record<string, {
  label: string;
  description: string;
  affected_systems: string[];
  confirmation_required: boolean;
  steps: Array<{ key: string; system: string; description: string }>;
}> = {
  replan_day: {
    label: "Replan my day",
    description: "Move incomplete tasks to sensible time slots based on remaining hours",
    affected_systems: ["planner"],
    confirmation_required: false,
    steps: [
      { key: "gather_incomplete", system: "planner", description: "Find incomplete tasks" },
      { key: "reorder_by_priority", system: "planner", description: "Sort by energy and priority" },
    ],
  },
  lighten_today: {
    label: "Lighten today",
    description: "Defer non-essential tasks to tomorrow, keep only top 3",
    affected_systems: ["planner"],
    confirmation_required: false,
    steps: [
      { key: "identify_deferrable", system: "planner", description: "Find tasks to defer" },
      { key: "move_to_tomorrow", system: "planner", description: "Reschedule to tomorrow" },
    ],
  },
  prep_tomorrow: {
    label: "Prep tomorrow",
    description: "Create a balanced plan for tomorrow based on today's unfinished work and routines",
    affected_systems: ["planner"],
    confirmation_required: false,
    steps: [
      { key: "carry_forward", system: "planner", description: "Move unfinished tasks" },
      { key: "add_routines", system: "planner", description: "Stamp routine items" },
    ],
  },
  build_recovery_day: {
    label: "Build a recovery day",
    description: "Clear tomorrow's heavy tasks, add rest-focused items",
    affected_systems: ["planner", "mode"],
    confirmation_required: true,
    steps: [
      { key: "clear_heavy", system: "planner", description: "Defer intense tasks" },
      { key: "add_recovery", system: "planner", description: "Add light recovery items" },
      { key: "set_mode", system: "mode", description: "Switch to Recovery Mode" },
    ],
  },
  move_unfinished_forward: {
    label: "Move unfinished tasks forward",
    description: "Push all incomplete tasks from today to tomorrow",
    affected_systems: ["planner"],
    confirmation_required: false,
    steps: [
      { key: "find_incomplete", system: "planner", description: "Find incomplete tasks" },
      { key: "reschedule", system: "planner", description: "Move to next day" },
    ],
  },
  create_focus_block: {
    label: "Create a focus block",
    description: "Block 2 hours for your top priorities with no interruptions",
    affected_systems: ["planner"],
    confirmation_required: false,
    steps: [
      { key: "find_top_tasks", system: "planner", description: "Identify top 2 tasks" },
      { key: "create_block", system: "planner", description: "Create timed block" },
    ],
  },
  money_reset: {
    label: "Money reset for this week",
    description: "Review upcoming bills and flag items needing attention",
    affected_systems: ["money"],
    confirmation_required: false,
    steps: [
      { key: "check_bills", system: "money", description: "Review upcoming bills" },
      { key: "flag_overdue", system: "money", description: "Flag overdue items" },
    ],
  },
  meal_to_grocery: {
    label: "Meal plan to grocery list",
    description: "Convert today's meal plan into a grocery checklist",
    affected_systems: ["meals"],
    confirmation_required: false,
    steps: [
      { key: "extract_ingredients", system: "meals", description: "Get ingredients from plan" },
      { key: "build_list", system: "meals", description: "Create grocery list" },
    ],
  },
  shutdown_routine: {
    label: "Build a shutdown routine",
    description: "Create an end-of-day wind-down sequence",
    affected_systems: ["planner"],
    confirmation_required: false,
    steps: [
      { key: "add_review", system: "planner", description: "Add daily review item" },
      { key: "add_prep", system: "planner", description: "Add tomorrow prep item" },
      { key: "add_wind_down", system: "planner", description: "Add wind-down item" },
    ],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // List recipes
    if (action === "list" || !action) {
      return new Response(JSON.stringify({
        recipes: Object.entries(RECIPES).map(([key, recipe]) => ({
          key,
          ...recipe,
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Run a specific recipe
    if (action === "run") {
      const recipeKey = body?.recipe_key;
      const recipe = RECIPES[recipeKey];
      if (!recipe) {
        return new Response(JSON.stringify({ error: "Unknown recipe" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

      // Create run record
      const { data: run, error: runError } = await admin.from("automation_runs").insert({
        user_id: userId,
        recipe_key: recipeKey,
        status: "running",
        inputs: body?.inputs || {},
      }).select("id").single();

      if (runError || !run) {
        return new Response(JSON.stringify({ error: "Failed to create run" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const runId = run.id;
      const stepResults: any[] = [];
      let hasError = false;

      try {
        // Execute recipe-specific logic
        if (recipeKey === "lighten_today") {
          // Get all incomplete tasks for today
          const { data: tasks } = await admin.from("planner_items")
            .select("id, title, sort_order, energy_level")
            .eq("user_id", userId).eq("scheduled_date", today)
            .eq("status", "todo").eq("item_type", "task")
            .order("sort_order", { ascending: true });

          const allTasks = tasks || [];
          const keep = allTasks.slice(0, 3);
          const defer = allTasks.slice(3);

          await admin.from("automation_run_steps").insert({
            run_id: runId, step_key: "identify_deferrable",
            status: "completed", affected_system: "planner",
            result: { kept: keep.length, deferred: defer.length },
            completed_at: new Date().toISOString(),
          });

          if (defer.length > 0) {
            const deferIds = defer.map((t: any) => t.id);
            await admin.from("planner_items")
              .update({ scheduled_date: tomorrow })
              .in("id", deferIds);

            await admin.from("automation_run_steps").insert({
              run_id: runId, step_key: "move_to_tomorrow",
              status: "completed", affected_system: "planner",
              result: { moved: deferIds.length, target_date: tomorrow },
              completed_at: new Date().toISOString(),
            });
          }

          stepResults.push({ action: "lighten_today", kept: keep.length, deferred: defer.length });

        } else if (recipeKey === "move_unfinished_forward") {
          const { data: incomplete } = await admin.from("planner_items")
            .select("id, title")
            .eq("user_id", userId).eq("scheduled_date", today)
            .eq("status", "todo").eq("item_type", "task");

          const items = incomplete || [];
          if (items.length > 0) {
            await admin.from("planner_items")
              .update({ scheduled_date: tomorrow })
              .in("id", items.map((i: any) => i.id));
          }

          await admin.from("automation_run_steps").insert({
            run_id: runId, step_key: "reschedule",
            status: "completed", affected_system: "planner",
            result: { moved: items.length },
            completed_at: new Date().toISOString(),
          });

          stepResults.push({ action: "move_forward", moved: items.length });

        } else if (recipeKey === "create_focus_block") {
          const { data: topTasks } = await admin.from("planner_items")
            .select("id, title")
            .eq("user_id", userId).eq("scheduled_date", today)
            .eq("status", "todo").eq("item_type", "task")
            .order("sort_order", { ascending: true })
            .limit(2);

          const tasks = topTasks || [];
          // Create a focus block event
          await admin.from("planner_items").insert({
            user_id: userId,
            title: `⚡ Focus Block: ${tasks.map((t: any) => t.title).join(" + ") || "Deep Work"}`,
            item_type: "event",
            scheduled_date: today,
            start_time: "09:00",
            end_time: "11:00",
            energy_level: "high",
            description: "Auto-generated focus block",
          });

          await admin.from("automation_run_steps").insert({
            run_id: runId, step_key: "create_block",
            status: "completed", affected_system: "planner",
            result: { tasks: tasks.length, block: "09:00-11:00" },
            completed_at: new Date().toISOString(),
          });

          stepResults.push({ action: "focus_block", tasks: tasks.length });

        } else if (recipeKey === "build_recovery_day") {
          // Defer heavy tasks from tomorrow
          const { data: heavyTasks } = await admin.from("planner_items")
            .select("id").eq("user_id", userId).eq("scheduled_date", tomorrow)
            .eq("status", "todo").in("energy_level", ["high"]);

          const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0];
          if (heavyTasks && heavyTasks.length > 0) {
            await admin.from("planner_items")
              .update({ scheduled_date: dayAfter })
              .in("id", heavyTasks.map((t: any) => t.id));
          }

          // Add recovery items
          const recoveryItems = [
            { title: "🧘 Gentle stretch or walk", energy_level: "low" },
            { title: "💧 Hydration check (8 glasses)", energy_level: "low" },
            { title: "📖 Light reading or reflection", energy_level: "low" },
          ];

          for (const item of recoveryItems) {
            await admin.from("planner_items").insert({
              user_id: userId,
              title: item.title,
              item_type: "task",
              scheduled_date: tomorrow,
              energy_level: item.energy_level,
            });
          }

          // Set recovery mode
          await admin.from("user_modes").upsert({
            user_id: userId,
            active_mode: "recovery",
            source: "automation",
            reasons: ["Recovery day built via automation"],
            activated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 2 * 86400000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

          await admin.from("automation_run_steps").insert({
            run_id: runId, step_key: "set_mode",
            status: "completed", affected_system: "mode",
            result: { mode: "recovery" },
            completed_at: new Date().toISOString(),
          });

          stepResults.push({ action: "recovery_day", deferred: heavyTasks?.length || 0, added: recoveryItems.length });

        } else if (recipeKey === "prep_tomorrow") {
          // Carry forward unfinished
          const { data: unfinished } = await admin.from("planner_items")
            .select("id, title")
            .eq("user_id", userId).eq("scheduled_date", today)
            .eq("status", "todo").eq("item_type", "task");

          if (unfinished && unfinished.length > 0) {
            await admin.from("planner_items")
              .update({ scheduled_date: tomorrow })
              .in("id", unfinished.map((i: any) => i.id));
          }

          await admin.from("automation_run_steps").insert({
            run_id: runId, step_key: "carry_forward",
            status: "completed", affected_system: "planner",
            result: { carried: unfinished?.length || 0 },
            completed_at: new Date().toISOString(),
          });

          stepResults.push({ action: "prep_tomorrow", carried: unfinished?.length || 0 });

        } else if (recipeKey === "shutdown_routine") {
          const shutdownItems = [
            { title: "📝 Review today — what worked?", sort_order: 100 },
            { title: "📋 Prep tomorrow's top 3", sort_order: 101 },
            { title: "📱 Screens off, wind down", sort_order: 102 },
          ];

          for (const item of shutdownItems) {
            await admin.from("planner_items").insert({
              user_id: userId,
              title: item.title,
              item_type: "task",
              scheduled_date: today,
              sort_order: item.sort_order,
              energy_level: "low",
            });
          }

          await admin.from("automation_run_steps").insert({
            run_id: runId, step_key: "add_wind_down",
            status: "completed", affected_system: "planner",
            result: { added: shutdownItems.length },
            completed_at: new Date().toISOString(),
          });

          stepResults.push({ action: "shutdown_routine", added: shutdownItems.length });

        } else {
          // Generic fallback — mark as completed with no-op
          await admin.from("automation_run_steps").insert({
            run_id: runId, step_key: "generic",
            status: "completed", affected_system: "planner",
            result: { message: "Recipe executed (preview only)" },
            completed_at: new Date().toISOString(),
          });
          stepResults.push({ action: recipeKey, message: "Preview only" });
        }

        // Mark run complete
        await admin.from("automation_runs").update({
          status: "completed",
          result: { steps: stepResults },
          completed_at: new Date().toISOString(),
        }).eq("id", runId);

      } catch (execError) {
        hasError = true;
        await admin.from("automation_runs").update({
          status: "failed",
          error_message: execError.message || "Execution failed",
          result: { steps: stepResults },
        }).eq("id", runId);
      }

      return new Response(JSON.stringify({
        run_id: runId,
        recipe_key: recipeKey,
        status: hasError ? "failed" : "completed",
        steps: stepResults,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in run-automation:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
