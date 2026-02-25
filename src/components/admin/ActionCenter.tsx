import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Send, Gift, Tag, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AdminUser } from "./types";

interface ActionCenterProps {
  users: AdminUser[];
}

export default function ActionCenter({ users }: ActionCenterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
    };
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchSearch = !searchTerm || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSegment =
      segmentFilter === "all" ||
      (segmentFilter === "paid" && u.isPaid) ||
      (segmentFilter === "free" && !u.isPaid) ||
      (segmentFilter === "admin" && u.isAdmin);
    return matchSearch && matchSegment;
  });

  // CSV export
  const handleExportCSV = () => {
    const headers = ["Email", "Signed Up", "Last Sign In", "Is Paid", "Source"];
    const rows = filteredUsers.map((u) => [
      u.email,
      u.created_at,
      u.last_sign_in_at || "",
      u.isPaid ? "Yes" : "No",
      u.entitlement?.source || "free",
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Export Complete", description: `Exported ${filteredUsers.length} users to CSV` });
  };

  // Grant access
  const handleGrantAccess = async (userId: string) => {
    setActionLoading(userId);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=grant_access`,
        { method: "POST", headers, body: JSON.stringify({ targetUserId: userId }) }
      );
      if (!response.ok) throw new Error("Failed to grant access");
      toast({ title: "Access Granted", description: "User now has full access." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  // Revoke access
  const handleRevokeAccess = async (userId: string) => {
    setActionLoading(userId);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=revoke_access`,
        { method: "POST", headers, body: JSON.stringify({ targetUserId: userId }) }
      );
      if (!response.ok) throw new Error("Failed to revoke access");
      toast({ title: "Access Revoked" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleExportCSV}>
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <Download className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium">Export Users</span>
            <span className="text-xs text-muted-foreground">CSV download</span>
          </CardContent>
        </Card>
        <Card className="opacity-60">
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <Send className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">Send Campaign</span>
            <span className="text-xs text-muted-foreground">Coming soon</span>
          </CardContent>
        </Card>
        <Card className="opacity-60">
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <Tag className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">Tag Users</span>
            <span className="text-xs text-muted-foreground">Coming soon</span>
          </CardContent>
        </Card>
        <Card className="opacity-60">
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <Gift className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">Trial Extension</span>
            <span className="text-xs text-muted-foreground">Coming soon</span>
          </CardContent>
        </Card>
      </div>

      {/* User Segment Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                User Actions
              </CardTitle>
              <CardDescription>{filteredUsers.length} users</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-48 pl-8 text-sm"
                />
              </div>
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger className="h-9 w-32 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="paid">Paid Only</SelectItem>
                  <SelectItem value="free">Free Only</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredUsers.slice(0, 50).map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {user.isPaid ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-xs">
                        Paid
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Free</Badge>
                    )}
                    {user.isAdmin && (
                      <Badge variant="secondary" className="text-xs">Admin</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!user.isPaid ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={actionLoading === user.id}
                      onClick={() => handleGrantAccess(user.id)}
                    >
                      <Gift className="h-3 w-3 mr-1" />
                      Grant
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive"
                      disabled={actionLoading === user.id}
                      onClick={() => handleRevokeAccess(user.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {filteredUsers.length > 50 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Showing first 50 of {filteredUsers.length} users. Use search to narrow down.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
