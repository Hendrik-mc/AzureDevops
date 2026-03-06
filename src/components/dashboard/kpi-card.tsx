import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { KPIMetric } from "@/types/dashboard";

interface KPICardProps {
  metric: KPIMetric;
  className?: string;
}

export function KPICard({ metric, className }: KPICardProps) {
  const TrendIcon =
    metric.trend === "up"
      ? TrendingUp
      : metric.trend === "down"
        ? TrendingDown
        : Minus;

  const trendColor =
    metric.trend === "up"
      ? metric.trendIsPositive
        ? "text-green-500"
        : "text-red-500"
      : metric.trend === "down"
        ? metric.trendIsPositive
          ? "text-red-500"
          : "text-green-500"
        : "text-muted-foreground";

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
          {metric.trend && (
            <TrendIcon className={cn("h-4 w-4", trendColor)} />
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-2xl font-bold">
            {metric.value}
            {metric.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{metric.unit}</span>}
          </p>
        </div>
        {metric.source && (
          <p className="mt-2 text-xs text-muted-foreground">
            Source: {metric.source}
            {metric.lastRefreshed && ` | ${metric.lastRefreshed}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
