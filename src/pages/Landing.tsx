import { motion } from "framer-motion";
import { ArrowRight, Book } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

const controllables = [
  { emoji: "🦉", name: "Awareness" },
  { emoji: "🐢", name: "Perspective" },
  { emoji: "🦈", name: "Habit" },
  { emoji: "🛰️", name: "Wellness" },
  { emoji: "🚀", name: "Environment" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-md mx-auto w-full">
        <Logo />
        <Link to="/auth">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            Sign in
          </Button>
        </Link>
      </nav>

      {/* Hero Content */}
      <main className="flex-1 px-6 py-12 max-w-md mx-auto w-full flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            Regain control in 7 days.
          </h1>

          <p className="text-muted-foreground mb-8 text-balance">
            A calm, daily reset that takes under 2 minutes. Control what you can. Give the rest to God.
          </p>

          {/* Controllables */}
          <div className="flex justify-center gap-3 mb-10">
            {controllables.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                className="text-2xl"
                title={c.name}
              >
                {c.emoji}
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="space-y-3"
          >
            <Link to="/auth?mode=signup">
              <Button
                size="lg"
                className="w-full h-14 text-base font-medium group"
              >
                Begin Your Reset
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <a
              href="https://a.co/d/1DGPGEV"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button variant="ghost" className="w-full text-muted-foreground">
                <Book className="w-4 h-4 mr-2" />
                Read the Book
              </Button>
            </a>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} The Controllables
        </p>
      </footer>
    </div>
  );
}
