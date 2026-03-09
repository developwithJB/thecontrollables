import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 grid-bg opacity-30" />
      
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px]">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,hsl(var(--accent)/0.12),transparent_60%)]" />
      </div>

      <div className="text-center relative z-10">
        <h1 className="mb-4 text-7xl font-display font-bold text-accent animate-glow-pulse" style={{ textShadow: '0 0 40px hsl(var(--accent) / 0.3)' }}>
          404
        </h1>
        <p className="mb-6 text-lg text-muted-foreground">This page doesn't exist.</p>
        <a href="/" className="text-accent hover:underline font-medium">
          ← Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
