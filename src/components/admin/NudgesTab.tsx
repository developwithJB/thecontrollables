import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import type { NudgeLog, NudgeStats, NudgePotentialIssue } from "./types";
import { formatTime } from "./helpers";

interface NudgesTabProps {
  nudgeLogs: NudgeLog[];
  nudgeStats: NudgeStats | null;
  nudgePotentialIssues: NudgePotentialIssue[];
}

export default function NudgesTab({ nudgeLogs, nudgeStats, nudgePotentialIssues }: NudgesTabProps) {
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{nudgeStats?.sentToday || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{nudgeStats?.sentThisWeek || 0} this week</p>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: "hsl(var(--habit))" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Coverage Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: "hsl(var(--habit))" }}>{nudgeStats?.coverageRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">of {nudgeStats?.nudgeEnabledUsers || 0} enabled users</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{nudgeStats?.failedToday || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{nudgeStats?.failedThisWeek || 0} this week</p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${(nudgeStats?.potentialIssuesCount || 0) > 0 ? "border-l-amber-500" : "border-l-muted"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Potential Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(nudgeStats?.potentialIssuesCount || 0) > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
              {nudgeStats?.potentialIssuesCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Users missing nudges (48h)</p>
          </CardContent>
        </Card>
      </div>

      {/* Potential Issues */}
      {nudgePotentialIssues.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Users Missing Nudges (Last 48h)
            </CardTitle>
            <CardDescription>Check timezone settings</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {nudgePotentialIssues.map((issue) => (
                  <div key={issue.user_id} className="flex items-center justify-between p-2 bg-background rounded border">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{issue.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{issue.nudge_time}</Badge>
                      <Badge variant="secondary" className="font-mono text-xs">{issue.timezone || "No TZ set"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Recent Nudge Emails
          </CardTitle>
          <CardDescription>Last 100 nudge emails sent</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nudgeLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No nudge emails sent yet</TableCell>
                  </TableRow>
                ) : (
                  nudgeLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.user_email || "Unknown"}</TableCell>
                      <TableCell>{log.nudge_date}</TableCell>
                      <TableCell className="text-muted-foreground">{formatTime(log.sent_at)}</TableCell>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{log.user_timezone}</Badge></TableCell>
                      <TableCell>
                        {log.status === "sent" ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">
                            <CheckCircle className="h-3 w-3 mr-1" />Sent
                          </Badge>
                        ) : (
                          <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{log.status}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
