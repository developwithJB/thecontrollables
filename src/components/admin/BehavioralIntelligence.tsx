import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UserActivity, UserActivityStats, ActionFlow, AnalyticsSummary } from "./types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown, ChevronRight, User, Route, MousePointerClick, Activity } from "lucide-react";
import { getActivityIcon } from "./helpers";

interface BehavioralIntelligenceProps {
  userActivities: UserActivity[];
  userActivityStats: UserActivityStats | null;
  actionFlows: ActionFlow[];
  summary: AnalyticsSummary | null;
}

export default function BehavioralIntelligence({
  userActivities,
  userActivityStats,
  actionFlows,
  summary,
}: BehavioralIntelligenceProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const toggleSession = (id: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Feature adoption from summary
  const adoption = summary?.featureAdoption;

  return (
    <div className="space-y-6">
      {/* Activity Stats */}
      {userActivityStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{userActivityStats.uniqueUsersToday}</div>
              <p className="text-xs text-muted-foreground">Active Users (24h)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-emerald-600">{userActivityStats.usersWithCheckin}</div>
              <p className="text-xs text-muted-foreground">Completed Check-in</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold" style={{ color: "hsl(var(--habit))" }}>{userActivityStats.usersWithAIChat}</div>
              <p className="text-xs text-muted-foreground">Used AI Chat</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-muted-foreground">{userActivityStats.totalActivitiesToday}</div>
              <p className="text-xs text-muted-foreground">Total Actions</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feature Adoption */}
      {adoption && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Controllable Adoption (7d)</CardTitle>
            <CardDescription>Feature usage across the five controllables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "🦉 Awareness", value: adoption.quest, key: "awareness" },
                { label: "🐢 Perspective", value: adoption.build, key: "perspective" },
                { label: "🦈 Habit", value: adoption.checkin, key: "habit" },
                { label: "🛰️ Wellness", value: adoption.time, key: "wellness" },
                { label: "🚀 Environment", value: adoption.integrity, key: "environment" },
              ].sort((a, b) => b.value - a.value).map((item) => {
                const maxVal = Math.max(adoption.quest, adoption.build, adoption.checkin, adoption.time, adoption.integrity, 1);
                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{item.label}</span>
                      <span className="text-sm font-bold">{item.value}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(item.value / maxVal) * 100}%`,
                          backgroundColor: `hsl(var(--${item.key}))`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Common Flows */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <MousePointerClick className="h-4 w-4 text-primary" />
              Common User Flows
            </CardTitle>
            <CardDescription>Most frequent action sequences (7d)</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {actionFlows.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Not enough data yet</p>
                ) : (
                  actionFlows.map((flow, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm">
                      <span className="font-mono text-xs truncate flex-1 mr-2">{flow.flow}</span>
                      <Badge>{flow.count}x</Badge>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Action Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-emerald-500" />
              Action Breakdown (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {summary?.actionBreakdown?.map((action, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span>{getActivityIcon(action.action.split(":")[0])}</span>
                      <span className="font-mono text-xs truncate">{action.action}</span>
                    </div>
                    <Badge variant="outline">{action.count}</Badge>
                  </div>
                )) || <p className="text-muted-foreground text-sm">No actions tracked yet</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* User Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Route className="h-4 w-4 text-primary" />
            User Activity (Last 24h)
          </CardTitle>
          <CardDescription>See who was active, when, and what they did</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {userActivities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No user activity in last 24h</p>
              ) : (
                userActivities.map((user) => (
                  <Collapsible key={user.anonymousId} open={expandedSessions.has(user.anonymousId)} onOpenChange={() => toggleSession(user.anonymousId)}>
                    <Card className="border-l-4 border-l-primary/30">
                      <CollapsibleTrigger asChild>
                        <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {expandedSessions.has(user.anonymousId) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{user.anonymousId}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Active: {new Date(user.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    {user.sessionCount > 1 && ` • ${user.sessionCount} sessions`}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">{user.activityCount} actions</Badge>
                          </div>
                          {user.keyActions.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5 ml-11">
                              {user.keyActions.map((action, i) => (
                                <Badge key={i} variant="secondary" className="text-xs font-normal">{action}</Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 border-t">
                          <p className="text-xs text-muted-foreground pt-3 mb-2">Recent Activity Timeline</p>
                          <div className="space-y-2">
                            {user.recentActivities.map((activity, i) => (
                              <div key={i} className="flex items-center gap-3 text-sm">
                                <span className="text-base">{getActivityIcon(activity.type)}</span>
                                <span className="flex-1 min-w-0 text-muted-foreground">
                                  {activity.type === "page_view" ? `Viewed ${activity.name}` : activity.name}
                                </span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(activity.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
