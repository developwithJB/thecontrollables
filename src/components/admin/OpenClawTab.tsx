import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Zap, Copy, Check, Loader2, Trash2, ChevronDown, ChevronRight,
  Send, Clock, Target, Megaphone, Mail as MailIcon, Globe,
  ShieldCheck, CreditCard, Wallet, AlertCircle, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const OBJECTIVES = [
  { value: "traffic", label: "Traffic", icon: Globe },
  { value: "signups", label: "Signups", icon: Target },
  { value: "paid_conversions", label: "Paid Conversions", icon: Zap },
  { value: "full_funnel", label: "Full Funnel", icon: Megaphone },
] as const;

const CHANNELS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X (Twitter)" },
  { value: "email", label: "Email" },
  { value: "facebook_ads", label: "Facebook Ads" },
  { value: "google_ads", label: "Google Ads" },
  { value: "reddit", label: "Reddit" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "landing_page", label: "Landing Page" },
] as const;

const QUICK_ACTIONS = [
  { label: "LinkedIn Full Funnel", objective: "full_funnel", channel: "linkedin", icon: Megaphone },
  { label: "X Traffic Campaign", objective: "traffic", channel: "x", icon: Globe },
  { label: "Email Re-engagement", objective: "paid_conversions", channel: "email", icon: MailIcon },
  { label: "Reddit Signup Push", objective: "signups", channel: "reddit", icon: Target },
  { label: "Google Ads Conversions", objective: "paid_conversions", channel: "google_ads", icon: Zap },
  { label: "TikTok Awareness", objective: "traffic", channel: "tiktok", icon: Globe },
];

const EXECUTION_STATUSES = ["draft", "generated", "approved", "launched"] as const;
type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

const CONNECTION_STATUSES = ["connected", "disconnected", "error"] as const;
type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

const ATTRIBUTION_MODELS = ["manual", "last_click", "first_touch", "assisted", "channel_reported"] as const;
type AttributionModel = (typeof ATTRIBUTION_MODELS)[number];

interface CampaignRecord {
  id: string;
  objective: string;
  channel: string;
  execution_status: ExecutionStatus;
  execution_status_updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  launched_at: string | null;
  launched_by: string | null;
  audience: string | null;
  offer: string | null;
  tone: string | null;
  budget_level: string | null;
  spend_amount_usd: number;
  attributed_signups: number;
  attributed_paid_conversions: number;
  attributed_revenue_usd: number;
  payment_attribution_model: AttributionModel;
  payment_attribution_notes: string | null;
  attribution_updated_at: string | null;
  output_content: any;
  is_raw: boolean;
  created_at: string;
  notes: string | null;
}

interface ChannelConnection {
  id: string;
  channel: string;
  provider: string;
  connection_status: ConnectionStatus;
  api_account_id: string | null;
  display_name: string | null;
  last_checked_at: string | null;
  last_sync_at: string | null;
  spend_sync_supported: boolean;
  attribution_supported: boolean;
  payment_attribution_model: AttributionModel;
  health_message: string | null;
}

interface CampaignOpsDraft {
  execution_status: ExecutionStatus;
  spend_amount_usd: number;
  attributed_signups: number;
  attributed_paid_conversions: number;
  attributed_revenue_usd: number;
  payment_attribution_model: AttributionModel;
  payment_attribution_notes: string;
}

interface ChannelConnectionDraft {
  provider: string;
  connection_status: ConnectionStatus;
  api_account_id: string;
  display_name: string;
  spend_sync_supported: boolean;
  attribution_supported: boolean;
  payment_attribution_model: AttributionModel;
  health_message: string;
}

const ACTIVE_WINDOW_DAYS = 7;

function formatRelativeTime(dateStr: string): string {
  const createdAt = new Date(dateStr).getTime();
  const diffMs = Date.now() - createdAt;

  if (!Number.isFinite(diffMs) || diffMs < 0) return "just now";

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatUsd(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(normalized);
}

function getExecutionStatusBadge(status: ExecutionStatus): string {
  switch (status) {
    case "draft":
      return "bg-muted text-muted-foreground";
    case "generated":
      return "bg-blue-500/10 text-blue-700 border-blue-500/30";
    case "approved":
      return "bg-amber-500/10 text-amber-700 border-amber-500/30";
    case "launched":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getConnectionStatusBadge(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
    case "error":
      return "bg-destructive/10 text-destructive border-destructive/30";
    default:
      return "bg-muted text-muted-foreground border-muted";
  }
}

function getEffectiveExecutionStatus(campaign: Pick<CampaignRecord, "execution_status" | "is_raw">): ExecutionStatus {
  // Backward-compatible behavior: historical non-raw generated rows are treated as launched.
  if (campaign.execution_status === "generated" && !campaign.is_raw) {
    return "launched";
  }
  return campaign.execution_status;
}

function hasCampaignIssue(campaign: Pick<CampaignRecord, "execution_status" | "is_raw">): boolean {
  return campaign.is_raw && getEffectiveExecutionStatus(campaign) !== "launched";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleCopy}>
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </Button>
  );
}

function CampaignOutput({ content, isRaw }: { content: any; isRaw: boolean }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["summary"]));

  const toggle = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (isRaw || content?.raw) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-amber-600">Raw Output (JSON parse failed)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs whitespace-pre-wrap text-muted-foreground">{content?.raw || JSON.stringify(content, null, 2)}</pre>
        </CardContent>
      </Card>
    );
  }

  const { campaignSummary, funnelPlan, copyAssets, experiments, next7Days } = content || {};

  return (
    <div className="space-y-3">
      {/* Campaign Summary */}
      {campaignSummary && (
        <Collapsible open={expandedSections.has("summary")} onOpenChange={() => toggle("summary")}>
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">📋 Campaign Summary</CardTitle>
                  {expandedSections.has("summary") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {Object.entries(campaignSummary).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2">
                  <span className="text-xs font-medium text-muted-foreground capitalize min-w-[100px]">{key.replace(/([A-Z])/g, " $1").trim()}:</span>
                  <span className="text-xs flex-1">{String(value)}</span>
                  <CopyButton text={String(value)} />
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Funnel Plan */}
      {funnelPlan && (
        <Collapsible open={expandedSections.has("funnel")} onOpenChange={() => toggle("funnel")}>
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">🔄 Funnel Plan</CardTitle>
                  {expandedSections.has("funnel") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-4">
              {["traffic", "signup", "paidConversion"].map(stage => {
                const data = funnelPlan[stage];
                if (!data) return null;
                return (
                  <div key={stage} className="border rounded-lg p-3 space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-primary">{stage.replace(/([A-Z])/g, " $1")}</h4>
                    <div className="text-xs"><span className="font-medium">Goal:</span> {data.goal}</div>
                    <div className="text-xs"><span className="font-medium">Strategy:</span> {data.strategy}</div>
                    <div className="text-xs"><span className="font-medium">KPI:</span> {data.kpi}</div>
                    {data.tactics && (
                      <div className="text-xs">
                        <span className="font-medium">Tactics:</span>
                        <ul className="ml-3 mt-1 space-y-0.5">{data.tactics.map((t: string, i: number) => <li key={i}>• {t}</li>)}</ul>
                      </div>
                    )}
                    {data.frictionFixes && (
                      <div className="text-xs">
                        <span className="font-medium">Friction Fixes:</span>
                        <ul className="ml-3 mt-1 space-y-0.5">{data.frictionFixes.map((f: string, i: number) => <li key={i}>• {f}</li>)}</ul>
                      </div>
                    )}
                    {data.objectionsToHandle && (
                      <div className="text-xs">
                        <span className="font-medium">Objections:</span>
                        <ul className="ml-3 mt-1 space-y-0.5">{data.objectionsToHandle.map((o: string, i: number) => <li key={i}>• {o}</li>)}</ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Copy Assets */}
      {copyAssets && (
        <Collapsible open={expandedSections.has("copy")} onOpenChange={() => toggle("copy")}>
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">✍️ Copy Assets</CardTitle>
                  {expandedSections.has("copy") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-4">
              {/* Social Posts */}
              {copyAssets.socialPosts?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Social Posts</h4>
                  {copyAssets.socialPosts.map((post: any, i: number) => (
                    <div key={i} className="border rounded-lg p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <p className="text-xs font-semibold">{post.hook}</p>
                          <p className="text-xs text-muted-foreground">{post.body}</p>
                          <p className="text-xs text-primary font-medium">{post.cta}</p>
                        </div>
                        <CopyButton text={`${post.hook}\n\n${post.body}\n\n${post.cta}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ad Variants */}
              {copyAssets.adVariants?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Ad Variants</h4>
                  {copyAssets.adVariants.map((ad: any, i: number) => (
                    <div key={i} className="border rounded-lg p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <p className="text-xs font-bold">{ad.headline}</p>
                          <p className="text-xs text-muted-foreground">{ad.body}</p>
                          <p className="text-xs text-primary font-medium">{ad.cta}</p>
                        </div>
                        <CopyButton text={`${ad.headline}\n${ad.body}\n${ad.cta}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Emails */}
              {copyAssets.emails?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Email Variants</h4>
                  {copyAssets.emails.map((email: any, i: number) => (
                    <div key={i} className="border rounded-lg p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <p className="text-xs"><span className="font-semibold">Subject:</span> {email.subject}</p>
                          <p className="text-xs text-muted-foreground italic">{email.previewText}</p>
                          <p className="text-xs">{email.body}</p>
                          <p className="text-xs text-primary font-medium">{email.cta}</p>
                        </div>
                        <CopyButton text={`Subject: ${email.subject}\nPreview: ${email.previewText}\n\n${email.body}\n\n${email.cta}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Experiments */}
      {experiments?.length > 0 && (
        <Collapsible open={expandedSections.has("experiments")} onOpenChange={() => toggle("experiments")}>
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">🧪 Experiments ({experiments.length})</CardTitle>
                  {expandedSections.has("experiments") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {experiments.map((exp: any, i: number) => (
                <div key={i} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{exp.name}</span>
                    <Badge variant="outline" className="text-[10px]">Effort: {exp.effort}</Badge>
                    <Badge variant="secondary" className="text-[10px]">Impact: {exp.impact}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{exp.hypothesis}</p>
                  <p className="text-xs"><span className="font-medium">Metric:</span> {exp.primaryMetric} · <span className="font-medium">Success:</span> {exp.successCriteria}</p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Next 7 Days */}
      {next7Days?.length > 0 && (
        <Collapsible open={expandedSections.has("next7")} onOpenChange={() => toggle("next7")}>
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">📅 Next 7 Days</CardTitle>
                  {expandedSections.has("next7") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-1">
              {next7Days.map((day: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <Badge variant="outline" className="text-[10px] shrink-0">Day {i + 1}</Badge>
                  <span>{day}</span>
                  <CopyButton text={day} />
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

export default function OpenClawTab() {
  const [objective, setObjective] = useState("full_funnel");
  const [channel, setChannel] = useState("linkedin");
  const [audience, setAudience] = useState("");
  const [offer, setOffer] = useState("");
  const [tone, setTone] = useState("");
  const [budgetLevel, setBudgetLevel] = useState("medium");
  const [variationCount, setVariationCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveResult, setLiveResult] = useState<any>(null);
  const [liveIsRaw, setLiveIsRaw] = useState(false);
  const [history, setHistory] = useState<CampaignRecord[]>([]);
  const [channelConnections, setChannelConnections] = useState<ChannelConnection[]>([]);
  const [campaignDrafts, setCampaignDrafts] = useState<Record<string, CampaignOpsDraft>>({});
  const [connectionDrafts, setConnectionDrafts] = useState<Record<string, ChannelConnectionDraft>>({});
  const [savingCampaignId, setSavingCampaignId] = useState<string | null>(null);
  const [savingConnectionChannel, setSavingConnectionChannel] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const { toast } = useToast();

  const hydrateCampaignDrafts = useCallback((campaigns: CampaignRecord[]) => {
    const nextDrafts: Record<string, CampaignOpsDraft> = {};
    for (const campaign of campaigns) {
      nextDrafts[campaign.id] = {
        execution_status: campaign.execution_status ?? "generated",
        spend_amount_usd: Number(campaign.spend_amount_usd ?? 0),
        attributed_signups: Number(campaign.attributed_signups ?? 0),
        attributed_paid_conversions: Number(campaign.attributed_paid_conversions ?? 0),
        attributed_revenue_usd: Number(campaign.attributed_revenue_usd ?? 0),
        payment_attribution_model: campaign.payment_attribution_model ?? "manual",
        payment_attribution_notes: campaign.payment_attribution_notes ?? "",
      };
    }
    setCampaignDrafts(nextDrafts);
  }, []);

  const hydrateConnectionDrafts = useCallback((connections: ChannelConnection[]) => {
    const nextDrafts: Record<string, ChannelConnectionDraft> = {};
    for (const connection of connections) {
      nextDrafts[connection.channel] = {
        provider: connection.provider ?? "manual",
        connection_status: connection.connection_status ?? "disconnected",
        api_account_id: connection.api_account_id ?? "",
        display_name: connection.display_name ?? "",
        spend_sync_supported: !!connection.spend_sync_supported,
        attribution_supported: !!connection.attribution_supported,
        payment_attribution_model: connection.payment_attribution_model ?? "manual",
        health_message: connection.health_message ?? "",
      };
    }

    for (const channelItem of CHANNELS) {
      if (!nextDrafts[channelItem.value]) {
        nextDrafts[channelItem.value] = {
          provider: "manual",
          connection_status: "disconnected",
          api_account_id: "",
          display_name: "",
          spend_sync_supported: false,
          attribution_supported: false,
          payment_attribution_model: "manual",
          health_message: "",
        };
      }
    }
    setConnectionDrafts(nextDrafts);
  }, []);

  const activeCampaigns = useMemo(() => {
    const activeSince = Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return history.filter((campaign) => new Date(campaign.created_at).getTime() >= activeSince);
  }, [history]);

  const launchedCampaigns = useMemo(
    () =>
      activeCampaigns.filter(
        (campaign) => getEffectiveExecutionStatus(campaign) === "launched"
      ),
    [activeCampaigns]
  );

  const readyCampaigns = useMemo(
    () => activeCampaigns.filter((campaign) => !hasCampaignIssue(campaign)),
    [activeCampaigns]
  );

  const needsReviewCampaigns = useMemo(
    () => activeCampaigns.filter((campaign) => hasCampaignIssue(campaign)),
    [activeCampaigns]
  );

  const latestCampaign = history[0] ?? null;
  const totalActiveSpend = useMemo(
    () => activeCampaigns.reduce((total, campaign) => total + Number(campaign.spend_amount_usd ?? 0), 0),
    [activeCampaigns]
  );
  const totalActiveRevenue = useMemo(
    () => activeCampaigns.reduce((total, campaign) => total + Number(campaign.attributed_revenue_usd ?? 0), 0),
    [activeCampaigns]
  );
  const totalActiveSignups = useMemo(
    () => activeCampaigns.reduce((total, campaign) => total + Number(campaign.attributed_signups ?? 0), 0),
    [activeCampaigns]
  );
  const totalActivePaid = useMemo(
    () => activeCampaigns.reduce((total, campaign) => total + Number(campaign.attributed_paid_conversions ?? 0), 0),
    [activeCampaigns]
  );
  const activeRoas = totalActiveSpend > 0 ? totalActiveRevenue / totalActiveSpend : null;

  const loadHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from("open_claw_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);

    if (!error && data) {
      const campaigns = data as unknown as CampaignRecord[];
      setHistory(campaigns);
      hydrateCampaignDrafts(campaigns);
    }
  }, [hydrateCampaignDrafts]);

  const loadChannelConnections = useCallback(async () => {
    const { data, error } = await supabase
      .from("open_claw_channel_connections")
      .select("*")
      .order("channel", { ascending: true });

    if (!error && data) {
      const connections = data as unknown as ChannelConnection[];
      setChannelConnections(connections);
      hydrateConnectionDrafts(connections);
    }
  }, [hydrateConnectionDrafts]);

  useEffect(() => {
    void loadHistory();
    void loadChannelConnections();
  }, [loadHistory, loadChannelConnections]);

  const generateCampaign = useCallback(async (quickObjective?: string, quickChannel?: string) => {
    const obj = quickObjective || objective;
    const ch = quickChannel || channel;

    setIsGenerating(true);
    setLiveResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const body: any = {
        objective: obj,
        channel: ch,
        variationCount,
        budgetLevel,
      };
      if (audience.trim()) body.audience = audience.trim();
      if (offer.trim()) body.offer = offer.trim();
      if (tone.trim()) body.tone = tone.trim();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/open-claw-marketing`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Failed (${response.status})`);
      }

      const result = await response.json();
      const content = result.content;
      const isRaw = !!content?.raw;

      setLiveResult(content);
      setLiveIsRaw(isRaw);

      // Save to database
      const { error: insertError } = await supabase
        .from("open_claw_campaigns")
        .insert({
          generated_by: session.user.id,
          objective: obj,
          channel: ch,
          execution_status: "generated",
          execution_status_updated_at: new Date().toISOString(),
          audience: audience.trim() || null,
          offer: offer.trim() || null,
          tone: tone.trim() || null,
          budget_level: budgetLevel,
          variation_count: variationCount,
          spend_amount_usd: 0,
          attributed_signups: 0,
          attributed_paid_conversions: 0,
          attributed_revenue_usd: 0,
          payment_attribution_model: "manual",
          payment_attribution_notes: null,
          input_params: body,
          output_content: content,
          is_raw: isRaw,
        } as any);

      if (insertError) {
        console.error("Failed to save campaign:", insertError);
      } else {
        loadHistory();
      }

      toast({ title: "🦀 Open Claw delivered", description: `${obj} campaign on ${ch}` });
    } catch (error: any) {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }, [objective, channel, audience, offer, tone, budgetLevel, variationCount, toast]);

  const deleteCampaign = async (id: string) => {
    const { error } = await supabase.from("open_claw_campaigns").delete().eq("id", id);
    if (!error) {
      setHistory(prev => prev.filter(c => c.id !== id));
      if (expandedHistoryId === id) setExpandedHistoryId(null);
      toast({ title: "Campaign deleted" });
    }
  };

  const setCampaignDraftField = (campaignId: string, patch: Partial<CampaignOpsDraft>) => {
    setCampaignDrafts((prev) => ({
      ...prev,
      [campaignId]: {
        ...(prev[campaignId] ?? {
          execution_status: "generated",
          spend_amount_usd: 0,
          attributed_signups: 0,
          attributed_paid_conversions: 0,
          attributed_revenue_usd: 0,
          payment_attribution_model: "manual",
          payment_attribution_notes: "",
        }),
        ...patch,
      },
    }));
  };

  const setConnectionDraftField = (channelKey: string, patch: Partial<ChannelConnectionDraft>) => {
    setConnectionDrafts((prev) => ({
      ...prev,
      [channelKey]: {
        ...(prev[channelKey] ?? {
          provider: "manual",
          connection_status: "disconnected",
          api_account_id: "",
          display_name: "",
          spend_sync_supported: false,
          attribution_supported: false,
          payment_attribution_model: "manual",
          health_message: "",
        }),
        ...patch,
      },
    }));
  };

  const saveCampaignOperations = async (campaign: CampaignRecord) => {
    const draft = campaignDrafts[campaign.id];
    if (!draft) return;

    setSavingCampaignId(campaign.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData.session?.user?.id ?? null;
      const now = new Date().toISOString();

      const spendAmount = Math.max(0, Number(draft.spend_amount_usd) || 0);
      const attributedSignups = Math.max(0, Math.round(Number(draft.attributed_signups) || 0));
      const attributedPaid = Math.max(0, Math.round(Number(draft.attributed_paid_conversions) || 0));
      const attributedRevenue = Math.max(0, Number(draft.attributed_revenue_usd) || 0);

      const updatePayload: Record<string, unknown> = {
        execution_status: draft.execution_status,
        execution_status_updated_at: now,
        spend_amount_usd: spendAmount,
        attributed_signups: attributedSignups,
        attributed_paid_conversions: attributedPaid,
        attributed_revenue_usd: attributedRevenue,
        payment_attribution_model: draft.payment_attribution_model,
        payment_attribution_notes: draft.payment_attribution_notes.trim() || null,
        attribution_updated_at: now,
      };

      if (draft.execution_status === "approved" || draft.execution_status === "launched") {
        updatePayload.approved_at = campaign.approved_at || now;
        updatePayload.approved_by = campaign.approved_by || currentUserId;
      } else {
        updatePayload.approved_at = null;
        updatePayload.approved_by = null;
      }

      if (draft.execution_status === "launched") {
        updatePayload.launched_at = campaign.launched_at || now;
        updatePayload.launched_by = campaign.launched_by || currentUserId;
      } else {
        updatePayload.launched_at = null;
        updatePayload.launched_by = null;
      }

      const { data, error } = await supabase
        .from("open_claw_campaigns")
        .update(updatePayload as any)
        .eq("id", campaign.id)
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        const updatedCampaign = data as unknown as CampaignRecord;
        setHistory((prev) => prev.map((item) => (item.id === campaign.id ? updatedCampaign : item)));
        setCampaignDraftField(campaign.id, {
          execution_status: updatedCampaign.execution_status,
          spend_amount_usd: Number(updatedCampaign.spend_amount_usd ?? 0),
          attributed_signups: Number(updatedCampaign.attributed_signups ?? 0),
          attributed_paid_conversions: Number(updatedCampaign.attributed_paid_conversions ?? 0),
          attributed_revenue_usd: Number(updatedCampaign.attributed_revenue_usd ?? 0),
          payment_attribution_model: updatedCampaign.payment_attribution_model,
          payment_attribution_notes: updatedCampaign.payment_attribution_notes ?? "",
        });
      }

      toast({
        title: "Campaign operations updated",
        description: `${campaign.channel} marked as ${draft.execution_status}.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to save campaign operations",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingCampaignId(null);
    }
  };

  const saveChannelConnection = async (channelKey: string) => {
    const draft = connectionDrafts[channelKey];
    if (!draft) return;

    setSavingConnectionChannel(channelKey);
    try {
      const now = new Date().toISOString();
      const existing = channelConnections.find((row) => row.channel === channelKey);

      const payload = {
        channel: channelKey,
        provider: draft.provider.trim() || "manual",
        connection_status: draft.connection_status,
        api_account_id: draft.api_account_id.trim() || null,
        display_name: draft.display_name.trim() || null,
        spend_sync_supported: draft.spend_sync_supported,
        attribution_supported: draft.attribution_supported,
        payment_attribution_model: draft.payment_attribution_model,
        health_message: draft.health_message.trim() || null,
        last_checked_at: now,
        last_sync_at:
          draft.connection_status === "connected"
            ? (existing?.last_sync_at ?? now)
            : existing?.last_sync_at ?? null,
      };

      const { data, error } = await supabase
        .from("open_claw_channel_connections")
        .upsert(payload, { onConflict: "channel" })
        .select("*")
        .single();

      if (error) throw error;
      if (data) {
        const updated = data as unknown as ChannelConnection;
        setChannelConnections((prev) => {
          const hasExisting = prev.some((row) => row.channel === updated.channel);
          if (!hasExisting) return [...prev, updated];
          return prev.map((row) => (row.channel === updated.channel ? updated : row));
        });
      }

      toast({
        title: "Connection status saved",
        description: `${channelKey} is now ${draft.connection_status}.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to save connection",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingConnectionChannel(null);
    }
  };

  const channelConnectionMap = useMemo(() => {
    const map = new Map<string, ChannelConnection>();
    for (const connection of channelConnections) {
      map.set(connection.channel, connection);
    }
    return map;
  }, [channelConnections]);

  const connectionRows = useMemo(() => {
    return CHANNELS.map((channelItem) => ({
      channel: channelItem.value,
      label: channelItem.label,
      connection: channelConnectionMap.get(channelItem.value) ?? null,
      draft:
        connectionDrafts[channelItem.value] ?? {
          provider: "manual",
          connection_status: "disconnected" as ConnectionStatus,
          api_account_id: "",
          display_name: "",
          spend_sync_supported: false,
          attribution_supported: false,
          payment_attribution_model: "manual" as AttributionModel,
          health_message: "",
        },
    }));
  }, [channelConnectionMap, connectionDrafts]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Operations Overview */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Open Claw Operations
          </CardTitle>
          <CardDescription className="text-xs">
            Live operator status, billing signals, and infrastructure notes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-background p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Active Claws ({ACTIVE_WINDOW_DAYS}d)</p>
              <p className="text-lg font-semibold">{activeCampaigns.length}</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-[10px]">
                  Ready: {readyCampaigns.length}
                </Badge>
                <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700">
                  Launched: {launchedCampaigns.length}
                </Badge>
                <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700">
                  Needs Review: {needsReviewCampaigns.length}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Last run: {latestCampaign ? `${formatRelativeTime(latestCampaign.created_at)} (${latestCampaign.channel})` : "No runs yet"}
              </p>
            </div>

            <div className="rounded-lg border bg-background p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                Payment & Usage
              </p>
              <div className="text-xs space-y-1">
                <p>
                  Spend (active): <span className="font-medium">{formatUsd(totalActiveSpend)}</span>
                </p>
                <p>
                  Attributed revenue: <span className="font-medium">{formatUsd(totalActiveRevenue)}</span>
                </p>
                <p>
                  Attributed paid conversions: <span className="font-medium">{totalActivePaid}</span>
                </p>
                <p>
                  Attributed signups: <span className="font-medium">{totalActiveSignups}</span>
                </p>
                <p>
                  ROAS:{" "}
                  <span className="font-medium">
                    {activeRoas === null ? "N/A" : `${activeRoas.toFixed(2)}x`}
                  </span>
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground">
                AI runtime billing is backend usage (`LOVABLE_API_KEY`). Watch for `402` or `429` in errors/toasts.
              </p>
            </div>

            <div className="rounded-lg border bg-background p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                Wallet Requirement
              </p>
              <p className="text-xs">
                <span className="font-medium">MetaMask not required.</span> Open Claw has no on-chain wallet or crypto transaction dependency.
              </p>
              <p className="text-[10px] text-muted-foreground">
                Access model: authenticated admin user + Supabase RLS.
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-background p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">What \"Needs Review\" means</p>
            <div className="flex items-start gap-2 text-xs">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-amber-600 shrink-0" />
              <p className="text-muted-foreground">
                The model returned output that could not be parsed into the expected JSON structure. Content is still captured as raw text for manual use.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Claws Feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Active Claws
            <Badge variant="outline" className="text-[10px]">{activeCampaigns.length}</Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Most recent campaigns in the last {ACTIVE_WINDOW_DAYS} days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeCampaigns.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No active Claws in the current window.
            </p>
          ) : (
            <div className="space-y-2">
              {activeCampaigns.slice(0, 8).map((campaign) => {
                const effectiveExecutionStatus = getEffectiveExecutionStatus(campaign);
                const campaignNeedsReview = hasCampaignIssue(campaign);

                return (
                  <div key={campaign.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{campaign.objective}</Badge>
                        <Badge variant="outline" className="text-[10px]">{campaign.channel}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${getExecutionStatusBadge(effectiveExecutionStatus)}`}>
                          {effectiveExecutionStatus}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            campaignNeedsReview
                              ? "text-[10px] border-amber-500/40 text-amber-700"
                              : "text-[10px] border-emerald-500/40 text-emerald-700"
                          }
                        >
                          {campaignNeedsReview ? "Needs Review" : "Ready"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {!campaignNeedsReview ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        {formatRelativeTime(campaign.created_at)}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Budget: {campaign.budget_level || "medium"} · Variants: {campaign.variation_count || 3}
                      {` · Spend: ${formatUsd(Number(campaign.spend_amount_usd || 0))}`}
                      {` · Attributed Revenue: ${formatUsd(Number(campaign.attributed_revenue_usd || 0))}`}
                      {campaign.offer ? ` · Offer: ${campaign.offer}` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel API Connections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Channel API Connections
          </CardTitle>
          <CardDescription className="text-xs">
            Connection health and attribution model by channel. This drives explicit payment attribution context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {connectionRows.map((row) => {
            const draft = row.draft;
            const currentStatus = row.connection?.connection_status ?? draft.connection_status;
            return (
              <div key={row.channel} className="rounded-lg border p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{row.label}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${getConnectionStatusBadge(currentStatus)}`}>
                      {currentStatus}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Last checked: {row.connection?.last_checked_at ? formatTime(row.connection.last_checked_at) : "never"} ·
                    Last sync: {row.connection?.last_sync_at ? formatTime(row.connection.last_sync_at) : "never"}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Status</Label>
                    <Select
                      value={draft.connection_status}
                      onValueChange={(value) => setConnectionDraftField(row.channel, { connection_status: value as ConnectionStatus })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONNECTION_STATUSES.map((status) => (
                          <SelectItem key={status} value={status} className="text-xs">
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Provider</Label>
                    <Input
                      value={draft.provider}
                      onChange={(e) => setConnectionDraftField(row.channel, { provider: e.target.value })}
                      placeholder="meta-ads, google-ads, manual"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px]">API Account ID</Label>
                    <Input
                      value={draft.api_account_id}
                      onChange={(e) => setConnectionDraftField(row.channel, { api_account_id: e.target.value })}
                      placeholder="acct_123 / ad-account-id"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Display Name</Label>
                    <Input
                      value={draft.display_name}
                      onChange={(e) => setConnectionDraftField(row.channel, { display_name: e.target.value })}
                      placeholder="Primary ads account"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Attribution Model</Label>
                    <Select
                      value={draft.payment_attribution_model}
                      onValueChange={(value) => setConnectionDraftField(row.channel, { payment_attribution_model: value as AttributionModel })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ATTRIBUTION_MODELS.map((model) => (
                          <SelectItem key={model} value={model} className="text-xs">
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Spend Sync</Label>
                    <Select
                      value={draft.spend_sync_supported ? "yes" : "no"}
                      onValueChange={(value) => setConnectionDraftField(row.channel, { spend_sync_supported: value === "yes" })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes" className="text-xs">Enabled</SelectItem>
                        <SelectItem value="no" className="text-xs">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Conversion Attribution</Label>
                    <Select
                      value={draft.attribution_supported ? "yes" : "no"}
                      onValueChange={(value) => setConnectionDraftField(row.channel, { attribution_supported: value === "yes" })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes" className="text-xs">Enabled</SelectItem>
                        <SelectItem value="no" className="text-xs">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Health Message</Label>
                    <Input
                      value={draft.health_message}
                      onChange={(e) => setConnectionDraftField(row.channel, { health_message: e.target.value })}
                      placeholder="Connected, token valid"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingConnectionChannel === row.channel}
                    onClick={() => saveChannelConnection(row.channel)}
                  >
                    {savingConnectionChannel === row.channel ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Connection"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription className="text-xs">One-tap campaign generation with pre-filled params</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {QUICK_ACTIONS.map(action => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="text-xs h-auto py-2 px-3 flex items-center gap-1.5 justify-start"
                disabled={isGenerating}
                onClick={() => generateCampaign(action.objective, action.channel)}
              >
                <action.icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Generator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Campaign Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Objective</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map(c => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Budget</Label>
              <Select value={budgetLevel} onValueChange={setBudgetLevel}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-xs">Low</SelectItem>
                  <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                  <SelectItem value="high" className="text-xs">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Variations</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={variationCount}
                onChange={e => setVariationCount(Math.min(5, Math.max(1, parseInt(e.target.value) || 3)))}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Audience (optional)</Label>
            <Input
              value={audience}
              onChange={e => setAudience(e.target.value)}
              placeholder="Adults rebuilding consistency after a setback..."
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Offer (optional)</Label>
              <Input
                value={offer}
                onChange={e => setOffer(e.target.value)}
                placeholder="Start a free 7-day snapshot"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tone (optional)</Label>
              <Input
                value={tone}
                onChange={e => setTone(e.target.value)}
                placeholder="direct, practical, confident"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <Button
            onClick={() => generateCampaign()}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Open Claw is working...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Generate Campaign
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Live Result */}
      {liveResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                🦀 Latest Output
                {liveIsRaw && <Badge variant="secondary" className="text-[10px]">Raw</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CampaignOutput content={liveResult} isRaw={liveIsRaw} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Campaign History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Campaign History
            <Badge variant="outline" className="text-[10px]">{history.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No campaigns generated yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((campaign) => {
                const draft = campaignDrafts[campaign.id] ?? {
                  execution_status: campaign.execution_status ?? "generated",
                  spend_amount_usd: Number(campaign.spend_amount_usd ?? 0),
                  attributed_signups: Number(campaign.attributed_signups ?? 0),
                  attributed_paid_conversions: Number(campaign.attributed_paid_conversions ?? 0),
                  attributed_revenue_usd: Number(campaign.attributed_revenue_usd ?? 0),
                  payment_attribution_model: campaign.payment_attribution_model ?? "manual",
                  payment_attribution_notes: campaign.payment_attribution_notes ?? "",
                };
                const effectiveExecutionStatus = getEffectiveExecutionStatus(campaign);
                const campaignNeedsReview = hasCampaignIssue(campaign);

                return (
                  <Collapsible
                    key={campaign.id}
                    open={expandedHistoryId === campaign.id}
                    onOpenChange={() => setExpandedHistoryId(expandedHistoryId === campaign.id ? null : campaign.id)}
                  >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          {expandedHistoryId === campaign.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          <Badge variant="secondary" className="text-[10px]">{campaign.objective}</Badge>
                          <Badge variant="outline" className="text-[10px]">{campaign.channel}</Badge>
                          <Badge variant="outline" className={`text-[10px] ${getExecutionStatusBadge(effectiveExecutionStatus)}`}>
                            {effectiveExecutionStatus}
                          </Badge>
                          {campaignNeedsReview && <Badge variant="destructive" className="text-[10px]">Needs Review</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{formatUsd(Number(campaign.spend_amount_usd || 0))} spend</span>
                          <span className="text-[10px] text-muted-foreground">{formatTime(campaign.created_at)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); deleteCampaign(campaign.id); }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 border-t">
                        {campaign.audience && <p className="text-[10px] text-muted-foreground mt-2">Audience: {campaign.audience}</p>}
                        <div className="grid gap-3 md:grid-cols-2 mt-3">
                          <div className="space-y-1.5">
                            <Label className="text-[10px]">Execution Status</Label>
                            <Select
                              value={draft.execution_status}
                              onValueChange={(value) => setCampaignDraftField(campaign.id, { execution_status: value as ExecutionStatus })}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {EXECUTION_STATUSES.map((status) => (
                                  <SelectItem key={status} value={status} className="text-xs">
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-[10px]">Attribution Model</Label>
                            <Select
                              value={draft.payment_attribution_model}
                              onValueChange={(value) => setCampaignDraftField(campaign.id, { payment_attribution_model: value as AttributionModel })}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ATTRIBUTION_MODELS.map((model) => (
                                  <SelectItem key={model} value={model} className="text-xs">
                                    {model}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-4 mt-3">
                          <div className="space-y-1.5">
                            <Label className="text-[10px]">Spend (USD)</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className="h-8 text-xs"
                              value={draft.spend_amount_usd}
                              onChange={(e) =>
                                setCampaignDraftField(campaign.id, {
                                  spend_amount_usd: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px]">Attributed Signups</Label>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 text-xs"
                              value={draft.attributed_signups}
                              onChange={(e) =>
                                setCampaignDraftField(campaign.id, {
                                  attributed_signups: Math.max(0, parseInt(e.target.value || "0", 10) || 0),
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px]">Attributed Paid</Label>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 text-xs"
                              value={draft.attributed_paid_conversions}
                              onChange={(e) =>
                                setCampaignDraftField(campaign.id, {
                                  attributed_paid_conversions: Math.max(0, parseInt(e.target.value || "0", 10) || 0),
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px]">Attributed Revenue (USD)</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className="h-8 text-xs"
                              value={draft.attributed_revenue_usd}
                              onChange={(e) =>
                                setCampaignDraftField(campaign.id, {
                                  attributed_revenue_usd: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 mt-3">
                          <Label className="text-[10px]">Attribution Notes</Label>
                          <Textarea
                            value={draft.payment_attribution_notes}
                            onChange={(e) => setCampaignDraftField(campaign.id, { payment_attribution_notes: e.target.value })}
                            placeholder="Document why conversions/revenue are attributed to this campaign."
                            className="text-xs min-h-[70px]"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                          <p className="text-[10px] text-muted-foreground">
                            Approved: {campaign.approved_at ? formatTime(campaign.approved_at) : "—"} ·
                            Launched: {campaign.launched_at ? formatTime(campaign.launched_at) : "—"} ·
                            Attribution updated: {campaign.attribution_updated_at ? formatTime(campaign.attribution_updated_at) : "—"}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingCampaignId === campaign.id}
                            onClick={() => saveCampaignOperations(campaign)}
                          >
                            {savingCampaignId === campaign.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save Operations"
                            )}
                          </Button>
                        </div>

                        <div className="mt-2">
                          <CampaignOutput content={campaign.output_content} isRaw={campaign.is_raw} />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
