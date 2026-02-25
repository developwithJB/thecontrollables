import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, AlertTriangle, TrendingUp, FlaskConical, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Insight {
  type: "behavioral" | "retention_risk" | "growth_opportunity" | "experiment";
  title: string;
  detail: string;
  confidence: "high" | "medium" | "low";
}

const typeConfig = {
  behavioral: { icon: Brain, label: "Behavioral Insight", color: "text-blue-500", bg: "bg-blue-500/10" },
  retention_risk: { icon: AlertTriangle, label: "Retention Risk", color: "text-amber-500", bg: "bg-amber-500/10" },
  growth_opportunity: { icon: TrendingUp, label: "Growth Opportunity", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  experiment: { icon: FlaskConical, label: "Experiment", color: "text-purple-500", bg: "bg-purple-500/10" },
};

const confidenceColors = {
  high: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  low: "bg-muted text-muted-foreground",
};

export default function AIInsightsPanel() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-insights`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      setInsights(data.insights || []);
      setGeneratedAt(data.generatedAt);
      toast({ title: "Insights Generated", description: `${data.insights?.length || 0} insights ready.` });
    } catch (err: any) {
      setError(err.message);
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const grouped = {
    behavioral: insights.filter((i) => i.type === "behavioral"),
    retention_risk: insights.filter((i) => i.type === "retention_risk"),
    growth_opportunity: insights.filter((i) => i.type === "growth_opportunity"),
    experiment: insights.filter((i) => i.type === "experiment"),
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Weekly Intelligence
              </CardTitle>
              <CardDescription>
                AI-generated insights from 7-day aggregated metrics
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {generatedAt && (
                <span className="text-xs text-muted-foreground">
                  Generated {new Date(generatedAt).toLocaleString()}
                </span>
              )}
              <Button onClick={generateInsights} disabled={isLoading} size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                {insights.length > 0 ? "Regenerate" : "Generate Insights"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && !isLoading && (
        <Card className="border-destructive/30">
          <CardContent className="p-5 text-center space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={generateInsights}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && insights.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Click "Generate Insights" to analyze your 7-day metrics with AI.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && insights.length > 0 && (
        <div className="space-y-6">
          {(Object.keys(grouped) as Array<keyof typeof grouped>).map((type) => {
            const items = grouped[type];
            if (items.length === 0) return null;
            const config = typeConfig[type];
            const Icon = config.icon;

            return (
              <div key={type} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <h3 className="font-semibold text-sm">{config.label}s</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {items.map((insight, idx) => (
                    <Card key={idx} className="hover:bg-muted/30 transition-colors">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm leading-tight">{insight.title}</h4>
                          <Badge className={`text-[10px] shrink-0 ${confidenceColors[insight.confidence]}`}>
                            {insight.confidence}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {insight.detail}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
