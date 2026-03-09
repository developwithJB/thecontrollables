import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Copy, UserPlus, LogOut, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircleLeaderboard } from "./CircleLeaderboard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { JoinCircleDialog } from "./JoinCircleDialog";

interface CircleMember {
  id: string;
  user_id: string;
  display_name: string | null;
  showedUpToday: boolean;
  totalDaysCompleted: number;
}

interface CircleCardProps {
  myCircle: {
    id: string;
    name: string;
    invite_code: string | null;
    journey_id: string | null;
    max_members: number;
    duration_days: number;
    creator_id: string;
  } | null;
  circleMembers: CircleMember[];
  showedUpTodayCount: number;
  currentDay: number;
  displayName: string;
  currentUserId: string;
  currentJourneyId?: string | null;
  isCreatingCircle: boolean;
  isLeavingCircle: boolean;
  onCreateCircle: (params: { journeyId: string; displayName: string }) => void;
  onLeaveCircle: () => void;
  onJoinCircle: (params: { inviteCode: string; displayName: string }) => void;
  isJoiningCircle: boolean;
  lookupCircle: (code: string) => Promise<any>;
  joinDialogOpen?: boolean;
  onJoinDialogOpenChange?: (open: boolean) => void;
  initialJoinCode?: string;
  streakLeaderboard?: { user_id: string; display_name: string | null; streak: number }[];
}

export function CircleCard({
  myCircle,
  circleMembers,
  showedUpTodayCount,
  currentDay,
  displayName,
  currentUserId,
  currentJourneyId,
  isCreatingCircle,
  isLeavingCircle,
  onCreateCircle,
  onLeaveCircle,
  onJoinCircle,
  isJoiningCircle,
  lookupCircle,
  joinDialogOpen,
  onJoinDialogOpenChange,
  initialJoinCode,
  streakLeaderboard = [],
}: CircleCardProps) {
  const { toast } = useToast();
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const isJoinOpen = joinDialogOpen ?? showJoinDialog;
  const setIsJoinOpen = onJoinDialogOpenChange ?? setShowJoinDialog;

  const handleCopyCode = () => {
    if (!myCircle?.invite_code) return;
    navigator.clipboard.writeText(myCircle.invite_code);
    setCopied(true);
    toast({ title: "Invite code copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  // No circle state
  if (!myCircle) {
    return (
      <>
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Run This Snapshot Together</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Invite 2–5 people to run the same 7-day Snapshot. See who showed up each day.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (!currentJourneyId) return;
                  onCreateCircle({ journeyId: currentJourneyId, displayName });
                }}
                disabled={isCreatingCircle || !currentJourneyId}
                className="flex-1"
              >
                <Users className="w-3.5 h-3.5 mr-1.5" />
                Create a Circle
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsJoinOpen(true)}
                className="flex-1"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                Join a Circle
              </Button>
            </div>
          </CardContent>
        </Card>

        <JoinCircleDialog
          isOpen={isJoinOpen}
          onOpenChange={setIsJoinOpen}
          onJoin={onJoinCircle}
          isJoining={isJoiningCircle}
          displayName={displayName}
          lookupCircle={lookupCircle}
          initialCode={initialJoinCode}
        />
      </>
    );
  }

  // Has circle state
  return (
    <Card>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Snapshot Circle</h3>
          </div>
          {myCircle.invite_code && circleMembers.length < myCircle.max_members && (
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted px-2.5 py-1 rounded-md"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : myCircle.invite_code}
            </button>
          )}
        </div>

        {/* Member dots */}
        <div className="flex items-center gap-3 mb-4">
          {circleMembers.map((member) => (
            <motion.div
              key={member.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-1"
            >
              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    member.showedUpToday
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {(member.display_name || "?")[0].toUpperCase()}
                </div>
                {member.showedUpToday && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-card"
                  />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground truncate max-w-[48px]">
                {member.display_name?.split(" ")[0] || "?"}
              </span>
            </motion.div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, myCircle.max_members - circleMembers.length) })
            .slice(0, 2) // Show max 2 empty slots
            .map((_, i) => (
              <div key={`empty-${i}`} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                  <UserPlus className="w-3.5 h-3.5 text-muted-foreground/30" />
                </div>
                <span className="text-[10px] text-transparent">.</span>
              </div>
            ))}
        </div>

        {/* Day counter */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Day {Math.min(currentDay, 7)} of {myCircle.duration_days} ·{" "}
            <span className="text-foreground font-medium">
              {showedUpTodayCount}/{circleMembers.length} showed up today
            </span>
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                <LogOut className="w-3 h-3" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave this Circle?</AlertDialogTitle>
                <AlertDialogDescription>
                  You'll lose your progress in this circle. Your solo Snapshot continues.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Stay</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onLeaveCircle}
                  disabled={isLeavingCircle}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Leave
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Streak Leaderboard */}
        <CircleLeaderboard entries={streakLeaderboard} currentUserId={currentUserId} />
      </CardContent>
    </Card>
  );
}
