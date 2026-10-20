import { toSafeInternalPath } from "@/lib/safeNavigation";
import { Link, useNavigate } from "react-router-dom";
import { ControllableHub } from "@/components/dashboard/ControllableHub";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
export default function Coach() {
  const user = useLifeOSUser();
  const navigate=useNavigate();
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <Link
          to="/formation/today"
          className="inline-flex min-h-11 items-center text-primary underline"
        >
          Back to Today
        </Link>
        <h1 className="font-display text-2xl font-bold">Optional AI coach</h1>
        <p className="text-muted-foreground">
          Start a conversation, bring your own key, or practice without AI.
          Awareness draws from Scripture at{" "}
          <a
            href="https://www.bible.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Bible.com
          </a>
          . AI responses can be mistaken and are not reviewed Scripture lessons.
        </p>
      </header>
      <ControllableHub userId={user.id} completedCount={0} onNavigate={destination=>{
        const paths:Record<string,string>={"meal-tracker":"/wellness",planner:"/planner"};
        navigate(toSafeInternalPath(paths[destination]??destination,"/formation/today"));
      }}/>
    </div>
  );
}
