"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubscriptionPicker } from "@/components/dashboard/subscription-picker";
import { KPICard } from "@/components/dashboard/kpi-card";
import { useCosts, useSecurityData, useResources, useHealth } from "@/hooks/use-azure-data";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { FileText, Download, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function ReportsPage() {
  const [subscriptionId, setSubscriptionId] = useState("");
  const [generating, setGenerating] = useState(false);

  const { data: costData } = useCosts(subscriptionId);
  const { data: securityData } = useSecurityData(subscriptionId);
  const { data: resourceData } = useResources(subscriptionId ? [subscriptionId] : []);
  const { data: healthData } = useHealth(subscriptionId);

  const unhealthyCount = securityData?.assessments.filter((a) => a.status === "Unhealthy" && a.severity === "High").length || 0;
  const unavailableCount = healthData?.resourceHealth?.filter((r) => r.availabilityState !== "Available").length || 0;

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/reports/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "executive_overview",
          subscriptionIds: [subscriptionId],
          dateRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `control-tower-report-${new Date().toISOString().split("T")[0]}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setGenerating(false);
    }
  };

  const kpiTable = [
    {
      name: "Monthly Cloud Spend",
      target: "Within budget",
      actual: costData ? formatCurrency(costData.totalCost) : "-",
      trend: "up" as const,
    },
    {
      name: "Secure Score",
      target: ">80%",
      actual: securityData ? formatPercentage(securityData.secureScore.percentage) : "-",
      trend: "stable" as const,
    },
    {
      name: "Critical Findings",
      target: "0",
      actual: unhealthyCount.toString(),
      trend: unhealthyCount > 0 ? "up" as const : "stable" as const,
    },
    {
      name: "Resource Availability",
      target: "99.9%",
      actual: healthData?.resourceHealth
        ? formatPercentage(
            ((healthData.resourceHealth.length - unavailableCount) / Math.max(healthData.resourceHealth.length, 1)) * 100
          )
        : "-",
      trend: unavailableCount > 0 ? "down" as const : "stable" as const,
    },
    {
      name: "Total Resources",
      target: "N/A",
      actual: resourceData ? resourceData.resources.length.toString() : "-",
      trend: "stable" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Evidence & Reports</h1>
          <p className="text-sm text-muted-foreground">KPI tracking, PDF reports, and audit evidence</p>
        </div>
        <div className="flex items-center gap-3">
          <SubscriptionPicker value={subscriptionId} onChange={setSubscriptionId} />
          <Button onClick={handleGenerateReport} disabled={!subscriptionId || generating}>
            <Download className="h-4 w-4 mr-2" />
            {generating ? "Generating..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {!subscriptionId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Select a subscription to view reports</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard metric={{ label: "MTD Spend", value: costData ? formatCurrency(costData.totalCost) : "-", source: "Cost Management" }} />
            <KPICard metric={{ label: "Secure Score", value: securityData ? formatPercentage(securityData.secureScore.percentage) : "-", source: "Defender" }} />
            <KPICard metric={{ label: "Resources", value: resourceData ? resourceData.resources.length.toString() : "-", source: "Resource Graph" }} />
            <KPICard metric={{ label: "Health Events", value: healthData?.healthEvents?.length?.toString() || "0", source: "Service Health" }} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">KPI Scorecard</CardTitle>
              <CardDescription>Target vs. Actual with trend indicators</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">KPI</th>
                    <th className="text-left p-3 font-medium">Target</th>
                    <th className="text-left p-3 font-medium">Actual</th>
                    <th className="text-left p-3 font-medium">Trend</th>
                    <th className="text-left p-3 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {kpiTable.map((kpi) => (
                    <tr key={kpi.name} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{kpi.name}</td>
                      <td className="p-3">{kpi.target}</td>
                      <td className="p-3 font-semibold">{kpi.actual}</td>
                      <td className="p-3">
                        {kpi.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : kpi.trend === "down" ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <Minus className="h-4 w-4 text-green-500" />
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">Azure API</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: "Executive Overview", desc: "KPIs, costs, security, and health summary" },
                  { title: "Security Evidence Pack", desc: "Detailed findings for compliance audits" },
                  { title: "Cost Analysis", desc: "Spend breakdown, trends, and savings" },
                  { title: "Weekly Summary", desc: "Week-over-week changes and highlights" },
                ].map((template) => (
                  <div key={template.title} className="p-4 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">{template.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{template.desc}</p>
                    <Button variant="outline" size="sm" className="w-full mt-2" disabled>
                      <Clock className="h-3 w-3 mr-1" /> Coming Soon
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
