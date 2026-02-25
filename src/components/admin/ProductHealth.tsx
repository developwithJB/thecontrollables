import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Eye, Activity, CheckCircle, XCircle, Clock } from "lucide-react";
import type { AppError, PageView, AppEvent, AnalyticsSummary } from "./types";
import { formatTime, truncate, getActivityIcon } from "./helpers";

interface ProductHealthProps {
  errors: AppError[];
  pageViews: PageView[];
  events: AppEvent[];
  summary: AnalyticsSummary | null;
  onResolveError: (errorId: string) => void;
  actionLoading: string | null;
}

export default function ProductHealth({
  errors,
  pageViews,
  events,
  summary,
  onResolveError,
  actionLoading,
}: ProductHealthProps) {
  const [errorUserFilter, setErrorUserFilter] = useState("");
  const [pageViewPathFilter, setPageViewPathFilter] = useState("");
  const [pageViewUserFilter, setPageViewUserFilter] = useState("");
  const [activeSection, setActiveSection] = useState<"overview" | "errors" | "pageviews" | "events">("overview");

  const unresolvedCount = errors.filter((e) => !e.resolved).length;

  return (
    <div className="space-y-4">
      {/* Quick nav */}
      <div className="flex gap-2 flex-wrap">
        {(["overview", "errors", "pageviews", "events"] as const).map((s) => (
          <Button
            key={s}
            variant={activeSection === s ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSection(s)}
          >
            {s === "overview" && "Overview"}
            {s === "errors" && (
              <>
                Errors
                {unresolvedCount > 0 && (
                  <Badge variant="destructive" className="ml-1.5 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {unresolvedCount}
                  </Badge>
                )}
              </>
            )}
            {s === "pageviews" && "Page Views"}
            {s === "events" && "Events"}
          </Button>
        ))}
      </div>

      {/* Overview */}
      {activeSection === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Page Views (24h)</p>
                <div className="text-2xl font-bold">{summary?.pageViews24h || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Unique Sessions (24h)</p>
                <div className="text-2xl font-bold">{summary?.uniqueSessions24h || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Events (24h)</p>
                <div className="text-2xl font-bold">{summary?.events24h || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Unresolved Errors</p>
                <div className="text-2xl font-bold text-destructive">{unresolvedCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Breakdowns */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top Pages (7d)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary?.topPages?.map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="truncate text-muted-foreground">{p.path}</span>
                      <Badge variant="secondary">{p.count}</Badge>
                    </div>
                  )) || <p className="text-muted-foreground text-sm">No data</p>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Event Types (7d)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary?.eventBreakdown?.map((e, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="truncate text-muted-foreground">{e.type}</span>
                      <Badge variant="secondary">{e.count}</Badge>
                    </div>
                  )) || <p className="text-muted-foreground text-sm">No data</p>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Error Types (7d)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary?.errorBreakdown?.map((e, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="truncate text-muted-foreground">{e.type}</span>
                      <Badge variant="destructive">{e.count}</Badge>
                    </div>
                  )) || <p className="text-muted-foreground text-sm">No errors</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Errors */}
      {activeSection === "errors" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Error Tracking
                </CardTitle>
                <CardDescription>{unresolvedCount} unresolved errors</CardDescription>
              </div>
              <select
                value={errorUserFilter}
                onChange={(e) => setErrorUserFilter(e.target.value)}
                className="text-sm border rounded-md px-2 py-1 bg-background"
              >
                <option value="">All Users</option>
                <option value="__anonymous__">Anonymous Only</option>
                {[...new Set(errors.filter((e) => e.user_email).map((e) => e.user_email))].sort().map((email) => (
                  <option key={email} value={email || ""}>{email}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 p-6">
                {errors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No errors recorded yet 🎉</p>
                ) : (
                  errors
                    .filter((error) => {
                      if (!errorUserFilter) return true;
                      if (errorUserFilter === "__anonymous__") return !error.user_id;
                      return error.user_email === errorUserFilter;
                    })
                    .map((error) => (
                      <Card key={error.id} className={error.resolved ? "opacity-50" : ""}>
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {error.resolved ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                                <Badge variant="outline">{error.error_type}</Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />{formatTime(error.created_at)}
                                </span>
                              </div>
                              {!error.resolved && (
                                <Button size="sm" variant="outline" onClick={() => onResolveError(error.id)} disabled={actionLoading === error.id}>
                                  {actionLoading === error.id ? "..." : "Mark Resolved"}
                                </Button>
                              )}
                            </div>
                            <p className="font-medium text-sm break-words">{error.error_message}</p>
                            <p className="text-xs text-muted-foreground">
                              {error.page_path}
                              {error.component_name && ` • ${error.component_name}`}
                              {error.user_email && <span className="ml-2 text-primary">• {error.user_email}</span>}
                            </p>
                            {error.error_stack && (
                              <pre className="p-2 bg-muted rounded text-xs overflow-x-auto max-h-24">
                                {truncate(error.error_stack, 300)}
                              </pre>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Page Views */}
      {activeSection === "pageviews" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-emerald-500" />
                  Page Views
                </CardTitle>
                <CardDescription>Last 100 page views</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={pageViewPathFilter} onChange={(e) => setPageViewPathFilter(e.target.value)} className="text-sm border rounded-md px-2 py-1 bg-background">
                  <option value="">All Pages</option>
                  <option value="/dashboard">Dashboard</option>
                  <option value="/auth">Auth</option>
                  <option value="/">Landing</option>
                </select>
                <select value={pageViewUserFilter} onChange={(e) => setPageViewUserFilter(e.target.value)} className="text-sm border rounded-md px-2 py-1 bg-background">
                  <option value="">All Users</option>
                  <option value="__anonymous__">Anonymous</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Load Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageViews
                    .filter((v) => {
                      if (pageViewPathFilter && !v.page_path.startsWith(pageViewPathFilter)) return false;
                      if (pageViewUserFilter === "__anonymous__") return !v.user_id;
                      return true;
                    })
                    .map((view) => (
                      <TableRow key={view.id}>
                        <TableCell className="text-xs text-muted-foreground">{formatTime(view.created_at)}</TableCell>
                        <TableCell className="font-medium">{view.page_path}</TableCell>
                        <TableCell className="text-xs">
                          {view.user_email ? <span className="text-primary">{view.user_email}</span> : <span className="text-muted-foreground/50">anonymous</span>}
                        </TableCell>
                        <TableCell>
                          {view.load_time_ms !== null ? (
                            <Badge variant={view.load_time_ms < 1000 ? "secondary" : "destructive"}>{view.load_time_ms}ms</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">virtual</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Events */}
      {activeSection === "events" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Event Log
            </CardTitle>
            <CardDescription>Last 100 tracked events</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Page</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatTime(event.created_at)}</TableCell>
                      <TableCell><Badge variant="outline">{event.event_type}</Badge></TableCell>
                      <TableCell className="font-medium">{event.event_name}</TableCell>
                      <TableCell className="text-muted-foreground">{event.page_path}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
