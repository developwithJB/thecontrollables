import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Send, Eye, Users, Mail, FileText, Megaphone, Trophy,
  MessageSquare, UserX, Clock, CheckCircle, XCircle, History, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SEGMENT_OPTIONS = [
  { value: "all", label: "All Users", icon: Users, desc: "Every registered user" },
  { value: "all_free", label: "Free Users", icon: Users, desc: "Users without active entitlement" },
  { value: "all_paid", label: "Paid Users", icon: CheckCircle, desc: "Users with active subscription" },
  { value: "inactive_3d", label: "Inactive 3+ Days", icon: Clock, desc: "Haven't signed in for 3+ days" },
  { value: "inactive_7d", label: "Inactive 7+ Days", icon: UserX, desc: "Haven't signed in for 7+ days" },
  { value: "no_snapshot", label: "No Active Snapshot", icon: FileText, desc: "No current Snapshot running" },
  { value: "completed_no_new", label: "Completed, No New", icon: History, desc: "Finished a Snapshot but haven't started another" },
  { value: "manual", label: "Manual Email List", icon: Mail, desc: "Paste specific email addresses" },
];

const TEMPLATE_OPTIONS = [
  { value: "re_engagement", label: "Re-engagement", icon: Megaphone, desc: "Bring inactive users back" },
  { value: "milestone", label: "Milestone", icon: Trophy, desc: "Celebrate user progress" },
  { value: "announcement", label: "Announcement", icon: FileText, desc: "Share news or updates" },
  { value: "custom", label: "Custom Freeform", icon: MessageSquare, desc: "Write your own message" },
];

interface BroadcastHistory {
  id: string;
  segment_type: string;
  template_key: string;
  subject: string;
  recipient_count: number;
  sent_at: string;
}

export default function CampaignComposer() {
  const [segmentType, setSegmentType] = useState("all_free");
  const [manualEmails, setManualEmails] = useState("");
  const [templateKey, setTemplateKey] = useState("re_engagement");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");

  const [previewData, setPreviewData] = useState<{
    recipientCount: number;
    sampleEmails: string[];
    subject: string;
    previewHtml: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<BroadcastHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const { toast } = useToast();

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
    };
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const emailList = segmentType === "manual"
        ? manualEmails.split(/[,\n]/).map((e) => e.trim()).filter(Boolean)
        : [];

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-broadcast?action=preview`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            segmentType,
            segmentEmails: emailList,
            templateKey,
            customSubject: customSubject.trim() || undefined,
            customBody: customBody.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Preview failed");
      }
      const data = await response.json();
      setPreviewData(data);
    } catch (error: any) {
      toast({ title: "Preview Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const headers = await getAuthHeaders();
      const emailList = segmentType === "manual"
        ? manualEmails.split(/[,\n]/).map((e) => e.trim()).filter(Boolean)
        : [];

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-broadcast?action=send`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            segmentType,
            segmentEmails: emailList,
            templateKey,
            customSubject: customSubject.trim() || undefined,
            customBody: customBody.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Send failed");
      }
      const data = await response.json();
      toast({
        title: "Campaign Sent!",
        description: `${data.sent} emails sent, ${data.failed} failed out of ${data.total} recipients.`,
      });
      setPreviewData(null);
    } catch (error: any) {
      toast({ title: "Send Error", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleLoadHistory = async () => {
    setHistoryLoading(true);
    setShowHistory(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-broadcast?action=history`,
        { method: "POST", headers, body: JSON.stringify({}) }
      );
      if (!response.ok) throw new Error("Failed to load history");
      const data = await response.json();
      setHistory(data.broadcasts || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setHistoryLoading(false);
    }
  };

  const selectedSegment = SEGMENT_OPTIONS.find((s) => s.value === segmentType);
  const selectedTemplate = TEMPLATE_OPTIONS.find((t) => t.value === templateKey);

  return (
    <div className="space-y-6">
      {/* Composer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration */}
        <div className="space-y-5">
          {/* Segment Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Audience Segment
              </CardTitle>
              <CardDescription>Who should receive this email?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={segmentType} onValueChange={setSegmentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground ml-1">— {opt.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {segmentType === "manual" && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Paste email addresses (comma or newline separated)
                  </Label>
                  <Textarea
                    placeholder="user1@example.com&#10;user2@example.com"
                    value={manualEmails}
                    onChange={(e) => setManualEmails(e.target.value)}
                    rows={4}
                    className="text-sm font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    {manualEmails.split(/[,\n]/).map((e) => e.trim()).filter(Boolean).length} email(s) entered
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Template Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Email Template
              </CardTitle>
              <CardDescription>Choose a template or write custom</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTemplateKey(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
                      templateKey === opt.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <opt.icon className={`h-5 w-5 ${templateKey === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Subject Line (optional override)</Label>
                  <Input
                    placeholder={selectedTemplate ? `Default: "${TEMPLATE_OPTIONS.find(t => t.value === templateKey)?.label}"` : "Custom subject..."}
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="text-sm"
                    maxLength={120}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Custom Message Body (optional)</Label>
                  <Textarea
                    placeholder="Write your custom message here. Supports plain text — it will be styled automatically..."
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    rows={4}
                    className="text-sm"
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground">{customBody.length}/2000</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handlePreview}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
              Preview
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="flex-1"
                  disabled={sending || !previewData}
                >
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Send Campaign
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Send</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send "{previewData?.subject}" to {previewData?.recipientCount} recipient(s). This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSend}>Send Now</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Email Preview
              </CardTitle>
              <CardDescription>
                {previewData
                  ? `${previewData.recipientCount} recipients will receive this email`
                  : "Click Preview to see the email and recipient count"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {previewData ? (
                <div className="space-y-4">
                  {/* Recipients summary */}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {previewData.recipientCount} recipients
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {selectedSegment?.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {selectedTemplate?.label}
                    </Badge>
                  </div>

                  {/* Sample emails */}
                  {previewData.sampleEmails.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Sample Recipients:</p>
                      <div className="flex flex-wrap gap-1">
                        {previewData.sampleEmails.map((email) => (
                          <Badge key={email} variant="outline" className="text-xs font-mono">
                            {email}
                          </Badge>
                        ))}
                        {previewData.recipientCount > 10 && (
                          <Badge variant="outline" className="text-xs">
                            +{previewData.recipientCount - 10} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Subject */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Subject:</p>
                    <p className="text-sm font-medium">{previewData.subject}</p>
                  </div>

                  {/* HTML Preview */}
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <ScrollArea className="h-[400px]">
                      <div
                        className="p-0"
                        dangerouslySetInnerHTML={{ __html: previewData.previewHtml }}
                      />
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <Mail className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">Configure your campaign on the left,</p>
                  <p className="text-sm">then click <strong>Preview</strong> to see it here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Broadcast History
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleLoadHistory} disabled={historyLoading}>
              {historyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Load History"}
            </Button>
          </div>
        </CardHeader>
        {showHistory && (
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No broadcasts sent yet.</p>
            ) : (
              <ScrollArea className="max-h-[250px]">
                <div className="space-y-2">
                  {history.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{b.subject}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{b.segment_type}</Badge>
                          <Badge variant="secondary" className="text-xs">{b.template_key}</Badge>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-medium">{b.recipient_count} sent</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(b.sent_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
