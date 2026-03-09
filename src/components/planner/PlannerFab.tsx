import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlannerFabProps {
  onClick: () => void;
}

export const PlannerFab = ({ onClick }: PlannerFabProps) => {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40 md:hidden"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
};
