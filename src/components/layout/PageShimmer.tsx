import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export const PageShimmer = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.15 }}
    className="space-y-4 py-2"
  >
    <Skeleton className="h-8 w-48 rounded-lg" />
    <Skeleton className="h-24 w-full rounded-xl" />
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
    <Skeleton className="h-40 w-full rounded-xl" />
  </motion.div>
);
