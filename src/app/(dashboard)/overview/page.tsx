"use client";

import { useState } from "react";
import { KPICard } from "@/components/dashboard/kpi-card";
import { CostTrendChart } from "@/components/charts/cost-trend";
import { SecurityScoreGauge } from "@/components/charts/security-score";
import { ActivityTimeline } from "@/components/charts/activity-timeline";
import { FindingCard } from "@/components/dashboard/finding-card";
import { SubscriptionPicker } from "@/components/dashboard/subscription-picker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCosts, useSecurityData, useResources, useChangeVelocity } from "@/hooks/use-azure-data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { KPIMetric, FindingItem } from "@/types/dashboard";

export default function OverviewPage() {
  const [subscriptionId, setSubscriptionId] = useState("");

  const { data: costData, isLoading: costsLoading } = useCosts(subscriptionId);
  const { data: securityData, isLoading: securityLoading } = useSecurityData(subscriptionId);
  const { data: resourceData, isLoading: resourcesLoading } = useResources(subscriptionId ? [subscriptionId] : []);
  const { data: velocityData } = useChangeVelocity(subscriptionId);

  const isLoading = costsLoading || securityLoading || resourcesLoading;

  const kpis: KPIMetric[] = [
    {
      label: "Month-to-Date Spend",
      value: costData ? formatCurrency(costData.totalCost) : "-",
      trend: "up",
      trendIsPositive: false,
      source: "Cost Management API",
    },
    {
      label: "Secure Score",
      value: securityData ? `${Math.round(securityData.secureScore.percentage)}%` : "-",
      trend: "stable",
      source: "Defender for Cloud",
    },
    {
      label: "Total Resources",
      value: resourceData ? formatNumber(resourceData.resources.length) : "-",
      source: "Resource Graph",
    },
    {
      label: "Critical Findings",
      value: securityData
        ? securityData.assessments.filter((a) => a.status === "Unhealthy" && a.severity === "High").length.toString()
        : "-",
      trend: "down",
      trendIsPositive: true,
      source: "Defender for Cloud",
    },
  ];

  const topFindings: FindingItem[] = securityData
    ? securityData.assessments
        .filter((a) => a.status === "Unhealthy")
        .sort((a, b) => {
          const order = { High: 0, Medium: 1, Low: 2 };
          return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
        })
        .slice(0, 5)
        .map((a) => ({
          id: a.id,
          source: "defender",
          category: a.category,
          severity: a.severity.toLowerCase() as FindingItem["severity"],
          title: a.displayName,
          description: a.description,
          resourceId: a.resourceId,
          status: a.status,
          firstSeenAt: "",
          lastSeenAt: "",
        }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Executive Overview</h1>
          <p className="text-sm text-muted-foreground">Real-time Azure infrastructure health and metrics</p>
        </div>
        <SubscriptionPicker value={subscriptionId} onChange={setSubscriptionId} />
      </div>

      {!subscriptionId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Select a subscription to view dashboard data</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <KPICard key={kpi.label} metric={kpi} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {costData && <CostTrendChart data={costData.dailyCosts} title="Daily Spend (MTD)" />}
            </div>
            <div>
              {securityData && <SecurityScoreGauge score={securityData.secureScore} />}
            </div>
          </div>

          {velocityData && (
            <ActivityTimeline data={velocityData.changeVelocity} title="Changes per Day (Last 7 Days)" />
          )}

          {topFindings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold">Top Security Findings</h2>
                <Badge variant="destructive">{topFindings.length}</Badge>
              </div>
              <div className="space-y-3">
                {topFindings.map((finding) => (
                  <FindingCard key={finding.id} finding={finding} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
