"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResourceHealthMap } from "@/components/charts/resource-health-map";
import { SubscriptionPicker } from "@/components/dashboard/subscription-picker";
import { KPICard } from "@/components/dashboard/kpi-card";
import { useHealth } from "@/hooks/use-azure-data";
import { formatPercentage } from "@/lib/utils";

export default function ReliabilityPage() {
  const [subscriptionId, setSubscriptionId] = useState("");
  const { data: healthData, isLoading } = useHealth(subscriptionId);

  const healthEvents = healthData?.healthEvents || [];
  const resourceHealth = healthData?.resourceHealth || [];
  const available = resourceHealth.filter((r) => r.availabilityState === "Available");
  const unavailable = resourceHealth.filter((r) => r.availabilityState !== "Available");
  const availabilityPct = resourceHealth.length > 0
    ? (available.length / resourceHealth.length) * 100
    : 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reliability & Operations</h1>
          <p className="text-sm text-muted-foreground">Service health, resource availability, and alerts</p>
        </div>
        <SubscriptionPicker value={subscriptionId} onChange={setSubscriptionId} />
      </div>

      {!subscriptionId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Select a subscription to view reliability data</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard metric={{
              label: "Resource Availability",
              value: formatPercentage(availabilityPct),
              trend: availabilityPct >= 99 ? "stable" : "down",
              trendIsPositive: availabilityPct >= 99,
              source: "Resource Health API",
            }} />
            <KPICard metric={{
              label: "Unavailable Resources",
              value: unavailable.length.toString(),
              trend: unavailable.length > 0 ? "up" : "stable",
              trendIsPositive: unavailable.length === 0,
              source: "Resource Health API",
            }} />
            <KPICard metric={{
              label: "Active Health Events",
              value: healthEvents.filter((e) => !e.endTime).length.toString(),
              source: "Service Health API",
            }} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResourceHealthMap data={resourceHealth} />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Service Health Events</CardTitle>
              </CardHeader>
              <CardContent>
                {healthEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No active health events</p>
                ) : (
                  <div className="space-y-3">
                    {healthEvents.slice(0, 10).map((event) => (
                      <div key={event.id} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={event.eventType === "ServiceIssue" ? "critical" : "medium"}>
                            {event.eventType}
                          </Badge>
                          <Badge variant={event.endTime ? "low" : "high"}>
                            {event.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{event.summary?.slice(0, 200)}</p>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Started: {new Date(event.startTime).toLocaleDateString()}</span>
                          {event.endTime && <span>Resolved: {new Date(event.endTime).toLocaleDateString()}</span>}
                          <span>Services: {event.impactedServices.join(", ")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {unavailable.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Unavailable Resources</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Resource</th>
                      <th className="text-left p-3 font-medium">State</th>
                      <th className="text-left p-3 font-medium">Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unavailable.map((r, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        <td className="p-3 text-xs font-mono max-w-md truncate">{r.resourceId}</td>
                        <td className="p-3">
                          <Badge variant={r.availabilityState === "Unavailable" ? "critical" : "medium"}>
                            {r.availabilityState}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{r.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
