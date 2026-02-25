import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown } from "lucide-react";
import { AccessGrantModal, type AccessDuration } from "./AccessGrantModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AdminUser } from "./types";
import { formatDate } from "./helpers";

interface UserManagementProps {
  users: AdminUser[];
  onRefresh: () => void;
}

export default function UserManagement({ users, onRefresh }: UserManagementProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const { toast } = useToast();

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
    };
  };

  const handleGrantAccess = async (duration: AccessDuration) => {
    if (!selectedUser) return;
    setActionLoading(selectedUser.id);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=grant`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ userId: selectedUser.id, durationType: duration.type, months: duration.months }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to grant access");
      }
      const result = await response.json();
      let description = "User now has paid access";
      if (result.expiresAt) {
        const expiryDate = new Date(result.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        description = `Access granted until ${expiryDate}`;
      } else {
        description = "Lifetime access granted";
      }
      toast({ title: "Access Granted", description });
      setGrantModalOpen(false);
      setSelectedUser(null);
      onRefresh();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    setActionLoading(userId);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=revoke`,
        { method: "POST", headers, body: JSON.stringify({ userId }) }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to revoke access");
      }
      toast({ title: "Access Revoked", description: "User is now on Free tier" });
      onRefresh();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusDisplay = (user: AdminUser) => {
    if (!user.isPaid) return { label: "Free", variant: "secondary" as const, expiry: null };
    const entitlement = user.entitlement;
    if (!entitlement?.expires_at) return { label: "Lifetime", variant: "default" as const, expiry: null };
    const expiryDate = new Date(entitlement.expires_at);
    const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return { label: "Expired", variant: "destructive" as const, expiry: expiryDate };
    if (daysLeft <= 7) return { label: `${daysLeft}d left`, variant: "outline" as const, expiry: expiryDate };
    return { label: "Paid", variant: "default" as const, expiry: expiryDate };
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            User Management
          </CardTitle>
          <CardDescription>{users.length} registered users</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const status = getStatusDisplay(user);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.email}
                        {user.isAdmin && <Badge variant="outline" className="ml-2">Admin</Badge>}
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>{formatDate(user.last_sign_in_at)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {status.expiry && (
                            <span className="text-xs text-muted-foreground">
                              {status.expiry.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {user.isPaid ? (
                            <Button size="sm" variant="destructive" onClick={() => handleRevokeAccess(user.id)} disabled={actionLoading === user.id || user.isAdmin}>
                              {actionLoading === user.id ? "..." : "Revoke"}
                            </Button>
                          ) : (
                            <Button size="sm" variant="default" onClick={() => { setSelectedUser(user); setGrantModalOpen(true); }} disabled={actionLoading === user.id || user.isAdmin}>
                              {actionLoading === user.id ? "..." : "Grant"}
                            </Button>
                          )}
                          {user.isPaid && (
                            <Button size="sm" variant="outline" onClick={() => { setSelectedUser(user); setGrantModalOpen(true); }} disabled={actionLoading === user.id || user.isAdmin}>
                              Extend
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <AccessGrantModal
        open={grantModalOpen}
        onOpenChange={setGrantModalOpen}
        userEmail={selectedUser?.email || ""}
        onGrant={handleGrantAccess}
        isLoading={actionLoading === selectedUser?.id}
      />
    </>
  );
}
