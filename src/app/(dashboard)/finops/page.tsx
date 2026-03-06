"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CostTrendChart } from "@/components/charts/cost-trend";
import { SubscriptionPicker } from "@/components/dashboard/subscription-picker";
import { KPICard } from "@/components/dashboard/kpi-card";
import { useCosts, useAdvisor } from "@/hooks/use-azure-data";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1"];

export default function FinOpsPage() {
  const [subscriptionId, setSubscriptionId] = useState("");
  const { data: costData, isLoading: costsLoading } = useCosts(subscriptionId);
  const { data: advisorData } = useAdvisor(subscriptionId, "Cost");

  const costRecs = advisorData?.recommendations || [];
  const totalSavings = costRecs.reduce((sum, r) => sum + (r.estimatedSavings || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">FinOps</h1>
          <p className="text-sm text-muted-foreground">Cost analysis, trends, and optimization recommendations</p>
        </div>
        <SubscriptionPicker value={subscriptionId} onChange={setSubscriptionId} />
      </div>

      {!subscriptionId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Select a subscription to view cost data</p>
          </CardContent>
        </Card>
      ) : costsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : costData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              metric={{
                label: "Month-to-Date Spend",
                value: formatCurrency(costData.totalCost),
                source: "Cost Management API",
              }}
            />
            <KPICard
              metric={{
                label: "Top Service",
                value: costData.costByService[0]?.serviceName || "N/A",
                source: "Cost Management API",
              }}
            />
            <KPICard
              metric={{
                label: "Identified Savings",
                value: formatCurrency(totalSavings),
                trend: totalSavings > 0 ? "down" : "stable",
                trendIsPositive: true,
                source: "Azure Advisor",
              }}
            />
          </div>

          <CostTrendChart data={costData.dailyCosts} title="Daily Cost Trend (MTD)" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cost by Service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costData.costByService.slice(0, 8)}
                        dataKey="cost"
                        nameKey="serviceName"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ serviceName, cost }) =>
                          `${(serviceName as string).slice(0, 20)}: ${formatCurrency(cost as number)}`
                        }
                      >
                        {costData.costByService.slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cost by Resource Group</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costData.costByResourceGroup.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                      <YAxis dataKey="resourceGroup" type="category" width={150} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="cost" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {costRecs.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Cost Optimization Recommendations</CardTitle>
                  <Badge variant="info">{costRecs.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {costRecs.map((rec) => (
                    <div key={rec.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={rec.impact === "High" ? "high" : rec.impact === "Medium" ? "medium" : "low"}>
                            {rec.impact} Impact
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{rec.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                      </div>
                      {rec.estimatedSavings && (
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-sm font-bold text-green-600">{formatCurrency(rec.estimatedSavings)}</p>
                          <p className="text-xs text-muted-foreground">potential savings</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
