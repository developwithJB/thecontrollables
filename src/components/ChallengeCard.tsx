import { useState } from "react";
import { motion } from "framer-motion";
import { Compass, Users, User, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { CHALLENGE_DAYS, type Challenge } from "@/hooks/useChallenge";

interface ChallengeCardProps {
  activeChallenge: Challenge | null;
  onStartSolo: () => Promise<Challenge | null>;
  onStartWithFriends: () => Promise<Challenge | null>;
  onJoin: (code: string) => Promise<boolean>;
  onViewChallenge: () => void;
}

export function ChallengeCard({
  activeChallenge,
  onStartSolo,
  onStartWithFriends,
  onJoin,
  onViewChallenge,
}: ChallengeCardProps) {
  const [mode, setMode] = useState<"choice" | "join">("choice");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (activeChallenge) {
    const startDate = new Date(activeChallenge.start_date);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const currentDay = Math.min(Math.max(diffDays, 1), 7);
    const dayInfo = CHALLENGE_DAYS[currentDay - 1];

    const copyInviteCode = async () => {
      if (activeChallenge.invite_code) {
        await navigator.clipboard.writeText(activeChallenge.invite_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
          title: "Copied!",
          description: "Share this code with friends.",
        });
      }
    };

    return (
      <motion.div
        className="p-5 rounded-xl bg-card border shadow-soft cursor-pointer group hover:border-accent/30 transition-all"
        whileHover={{ y: -2 }}
        onClick={onViewChallenge}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
            <span className="text-xl">{dayInfo.emoji}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-foreground">
              Day {currentDay}: {dayInfo.theme}
            </h3>
            <p className="text-xs text-muted-foreground">
              {activeChallenge.is_solo ? "Solo Challenge" : "Group Challenge"}
            </p>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-3">
          {dayInfo.action}
        </p>

        {!activeChallenge.is_solo && activeChallenge.invite_code && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyInviteCode();
            }}
            className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            Code: {activeChallenge.invite_code}
          </button>
        )}
      </motion.div>
    );
  }

  if (mode === "join") {
    return (
      <motion.div
        className="p-5 rounded-xl bg-card border shadow-soft"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Join a Challenge</h3>
            <p className="text-xs text-muted-foreground">Enter invite code</p>
          </div>
        </div>

        <div className="space-y-3">
          <Input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-character code"
            className="text-center font-mono text-lg tracking-widest uppercase"
            maxLength={6}
          />
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setMode("choice");
                setInviteCode("");
              }}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={inviteCode.length !== 6 || isLoading}
              onClick={async () => {
                setIsLoading(true);
                await onJoin(inviteCode);
                setIsLoading(false);
              }}
            >
              {isLoading ? "Joining..." : "Join"}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-5 rounded-xl bg-card border shadow-soft"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <Compass className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">7-Day Challenge</h3>
          <p className="text-xs text-muted-foreground">A guided journey through all 5 Controllables</p>
        </div>
      </div>

      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-auto py-3"
          onClick={async () => {
            setIsLoading(true);
            const challenge = await onStartSolo();
            setIsLoading(false);
            if (challenge) onViewChallenge();
          }}
          disabled={isLoading}
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
          onClick={async () => {
            setIsLoading(true);
            const challenge = await onStartWithFriends();
            setIsLoading(false);
            if (challenge) onViewChallenge();
          }}
          disabled={isLoading}
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
