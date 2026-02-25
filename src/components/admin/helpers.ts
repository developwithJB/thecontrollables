export const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const truncate = (str: string, len: number) => {
  return str.length > len ? str.slice(0, len) + "..." : str;
};

export const getActivityIcon = (type: string) => {
  switch (type) {
    case "page_view": return "📄";
    case "button_click": return "👆";
    case "quest": return "🎯";
    case "reset": return "🔄";
    case "guide": return "🤖";
    case "build": return "🏗️";
    case "navigation": return "🧭";
    case "feature": return "⚡";
    case "modal": return "📦";
    case "upgrade": return "💎";
    case "time": return "⏰";
    case "integrity": return "🤝";
    case "xp": return "✨";
    default: return "📌";
  }
};

export const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

export const formatMetricValue = (value: number, format?: 'number' | 'percent' | 'currency'): string => {
  switch (format) {
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'currency':
      return `$${value.toFixed(0)}`;
    default:
      return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString();
  }
};

export const getHealthColor = (status?: 'healthy' | 'warning' | 'critical') => {
  switch (status) {
    case 'healthy': return 'bg-emerald-500';
    case 'warning': return 'bg-amber-500';
    case 'critical': return 'bg-destructive';
    default: return 'bg-muted-foreground';
  }
};
