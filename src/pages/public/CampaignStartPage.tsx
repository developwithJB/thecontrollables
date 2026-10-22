import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { readAlongCampaignPath } from "@/lib/launchFunnel";
import { captureAttribution } from "@/lib/growthAttribution";
import { trackGrowthEvent } from "@/lib/growthEvents";

export default function CampaignStartPage() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const started = useRef(false);
  const destination = readAlongCampaignPath(search);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    captureAttribution({
      pathname: "/start",
      search: destination.split("?")[1],
    });
    trackGrowthEvent("landing_view", { placement: "link_in_bio" });
    navigate(destination, { replace: true });
  }, [destination, navigate]);
  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="font-display text-2xl">Start with Read Along</h1>
      <Link
        className="inline-flex min-h-11 items-center text-primary underline"
        to={destination}
      >
        Continue to your free first practice
      </Link>
    </main>
  );
}
