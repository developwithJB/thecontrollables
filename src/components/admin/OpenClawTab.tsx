import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Zap, Copy, Check, Loader2, Trash2, ChevronDown, ChevronRight,
  Send, Clock, Target, Megaphone, Mail as MailIcon, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface CampaignRecord {
  id: string;
  objective: string;
  channel: string;
  audience: string | null;
  offer: string | null;
  tone: string | null;
  budget_level: string | null;
  output_content: any;
  is_raw: boolean;
  created_at: string;
  notes: string | null;
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
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from("open_claw_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);

    if (!error && data) {
      setHistory(data as unknown as CampaignRecord[]);
    }
  };

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
          audience: audience.trim() || null,
          offer: offer.trim() || null,
          tone: tone.trim() || null,
          budget_level: budgetLevel,
          variation_count: variationCount,
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

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
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
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2">
                {history.map(campaign => (
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
                            {campaign.is_raw && <Badge variant="destructive" className="text-[10px]">Raw</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
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
                          <div className="mt-2">
                            <CampaignOutput content={campaign.output_content} isRaw={campaign.is_raw} />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
