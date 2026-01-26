import { motion } from "framer-motion";
import { Bot } from "lucide-react";

export function TrustDisclosure() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="py-8 px-6"
    >
      <div className="max-w-md mx-auto">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
          <div className="p-1.5 rounded-lg bg-accent/10 shrink-0 mt-0.5">
            <Bot className="w-4 h-4 text-accent" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Not a chatbot.</span>{" "}
            These guides are AI-powered, trained on The Controllables philosophy and behavior change best practices. They guide, not diagnose. They learn, not lecture.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
