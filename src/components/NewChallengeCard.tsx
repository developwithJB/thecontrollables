import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Users, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Challenge } from "@/hooks/useChallenge";

interface NewChallengeCardProps {
  onStartSolo: (name: string) => Promise<Challenge | null>;
  onStartWithFriends: (name: string) => Promise<Challenge | null>;
  onJoin: (code: string) => Promise<boolean>;
  onViewChallenge: () => void;
}

export function NewChallengeCard({
  onStartSolo,
  onStartWithFriends,
  onJoin,
  onViewChallenge,
}: NewChallengeCardProps) {
  const [mode, setMode] = useState<"idle" | "naming" | "join">("idle");
  const [challengeType, setChallengeType] = useState<"solo" | "friends">("solo");
  const [challengeName, setChallengeName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleStartChallenge = async () => {
    setIsLoading(true);
    const name = challengeName.trim() || "7-Day Dashboard Challenge";
    const challenge = challengeType === "solo" 
      ? await onStartSolo(name)
      : await onStartWithFriends(name);
    setIsLoading(false);
    if (challenge) {
      setMode("idle");
      setChallengeName("");
      onViewChallenge();
    }
  };

  const handleJoin = async () => {
    setIsLoading(true);
    const success = await onJoin(inviteCode);
    setIsLoading(false);
    if (success) {
      setMode("idle");
      setInviteCode("");
      onViewChallenge();
    }
  };

  if (mode === "naming") {
    return (
      <motion.div
        className="p-5 rounded-xl bg-card border shadow-soft"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-foreground">Name Your Challenge</h3>
          <Button variant="ghost" size="icon" onClick={() => setMode("idle")}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <Input
            value={challengeName}
            onChange={(e) => setChallengeName(e.target.value)}
            placeholder="e.g., January Reset, Morning Focus..."
            className="text-sm"
          />
          
          <div className="flex gap-2">
            <Button
              variant={challengeType === "solo" ? "default" : "outline"}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setChallengeType("solo")}
            >
              <User className="w-4 h-4" />
              Solo
            </Button>
            <Button
              variant={challengeType === "friends" ? "default" : "outline"}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setChallengeType("friends")}
            >
              <Users className="w-4 h-4" />
              With Friends
            </Button>
          </div>

          <Button
            className="w-full"
            onClick={handleStartChallenge}
            disabled={isLoading}
          >
            {isLoading ? "Starting..." : "Start Challenge"}
          </Button>
        </div>
      </motion.div>
    );
  }

  if (mode === "join") {
    return (
      <motion.div
        className="p-5 rounded-xl bg-card border shadow-soft"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-foreground">Join Challenge</h3>
          <Button variant="ghost" size="icon" onClick={() => setMode("idle")}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <Input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-character code"
            className="text-center font-mono text-lg tracking-widest uppercase"
            maxLength={6}
          />
          
          <Button
            className="w-full"
            onClick={handleJoin}
            disabled={inviteCode.length !== 6 || isLoading}
          >
            {isLoading ? "Joining..." : "Join"}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-5 rounded-xl bg-card border shadow-soft"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <Plus className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">New Challenge</h3>
          <p className="text-xs text-muted-foreground">Start a 7-day journey</p>
        </div>
      </div>

      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-auto py-3"
          onClick={() => {
            setChallengeType("solo");
            setMode("naming");
          }}
        >
          <User className="w-4 h-4 text-muted-foreground" />
          <div className="text-left">
            <div className="font-medium">Go Solo</div>
            <div className="text-xs text-muted-foreground">Just me and the mission</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-auto py-3"
          onClick={() => {
            setChallengeType("friends");
            setMode("naming");
          }}
        >
          <Users className="w-4 h-4 text-muted-foreground" />
          <div className="text-left">
            <div className="font-medium">With Friends</div>
            <div className="text-xs text-muted-foreground">Invite others to join</div>
          </div>
        </Button>

        <Button
          variant="ghost"
          className="w-full text-sm text-muted-foreground"
          onClick={() => setMode("join")}
        >
          Have an invite code?
        </Button>
      </div>
    </motion.div>
  );
}
