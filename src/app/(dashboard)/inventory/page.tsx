"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SubscriptionPicker } from "@/components/dashboard/subscription-picker";
import { KPICard } from "@/components/dashboard/kpi-card";
import { useResources } from "@/hooks/use-azure-data";
import { formatNumber } from "@/lib/utils";
import { Search } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1", "#14b8a6", "#f43f5e"];

export default function InventoryPage() {
  const [subscriptionId, setSubscriptionId] = useState("");
  const [search, setSearch] = useState("");
  const { data: resourceData, isLoading } = useResources(subscriptionId ? [subscriptionId] : []);

  const resources = resourceData?.resources || [];

  const filteredResources = useMemo(() => {
    if (!search) return resources;
    const lower = search.toLowerCase();
    return resources.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        r.type.toLowerCase().includes(lower) ||
        r.resourceGroup.toLowerCase().includes(lower) ||
        r.location.toLowerCase().includes(lower)
    );
  }, [resources, search]);

  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of resources) {
      const shortType = r.type.split("/").pop() || r.type;
      counts[shortType] = (counts[shortType] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [resources]);

  const taggedCount = resources.filter((r) => r.tags && Object.keys(r.tags).length > 0).length;
  const tagCoveragePct = resources.length > 0 ? Math.round((taggedCount / resources.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Inventory</h1>
          <p className="text-sm text-muted-foreground">Resource Graph-powered infrastructure inventory</p>
        </div>
        <SubscriptionPicker value={subscriptionId} onChange={setSubscriptionId} />
      </div>

      {!subscriptionId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Select a subscription to view inventory</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard metric={{ label: "Total Resources", value: formatNumber(resources.length), source: "Resource Graph" }} />
            <KPICard metric={{ label: "Resource Types", value: formatNumber(typeDistribution.length), source: "Resource Graph" }} />
            <KPICard metric={{ label: "Tag Coverage", value: `${tagCoveragePct}%`, trend: tagCoveragePct > 80 ? "stable" : "down", trendIsPositive: tagCoveragePct > 80, source: "Resource Graph" }} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Resources</CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search resources..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm w-64"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background z-10">
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Name</th>
                          <th className="text-left p-3 font-medium">Type</th>
                          <th className="text-left p-3 font-medium">Resource Group</th>
                          <th className="text-left p-3 font-medium">Location</th>
                          <th className="text-left p-3 font-medium">Tags</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResources.slice(0, 100).map((r) => (
                          <tr key={r.id} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-medium">{r.name}</td>
                            <td className="p-3 text-xs text-muted-foreground">{r.type.split("/").pop()}</td>
                            <td className="p-3">{r.resourceGroup}</td>
                            <td className="p-3">{r.location}</td>
                            <td className="p-3">
                              {r.tags && Object.keys(r.tags).length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(r.tags).slice(0, 3).map(([k, v]) => (
                                    <Badge key={k} variant="secondary" className="text-xs">
                                      {k}: {v}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">No tags</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredResources.length > 100 && (
                      <p className="p-3 text-xs text-muted-foreground text-center">
                        Showing 100 of {filteredResources.length} resources
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resource Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                      >
                        {typeDistribution.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
