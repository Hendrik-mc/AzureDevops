"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SecurityScoreGauge } from "@/components/charts/security-score";
import { SubscriptionPicker } from "@/components/dashboard/subscription-picker";
import { useSecurityData, useIdentity } from "@/hooks/use-azure-data";

export default function SecurityPage() {
  const [subscriptionId, setSubscriptionId] = useState("");
  const { data: securityData, isLoading } = useSecurityData(subscriptionId);
  const { data: identityData } = useIdentity(subscriptionId);

  const unhealthy = securityData?.assessments.filter((a) => a.status === "Unhealthy") || [];
  const healthy = securityData?.assessments.filter((a) => a.status === "Healthy") || [];
  const bySeverity = {
    High: unhealthy.filter((a) => a.severity === "High"),
    Medium: unhealthy.filter((a) => a.severity === "Medium"),
    Low: unhealthy.filter((a) => a.severity === "Low"),
  };

  const privilegedRoles = identityData?.roleAssignments.filter((ra) =>
    ["Owner", "Contributor", "User Access Administrator"].includes(ra.roleDefinitionName)
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security & Compliance</h1>
          <p className="text-sm text-muted-foreground">Defender for Cloud findings, identity hygiene, and compliance</p>
        </div>
        <SubscriptionPicker value={subscriptionId} onChange={setSubscriptionId} />
      </div>

      {!subscriptionId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Select a subscription to view security data</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : securityData ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <SecurityScoreGauge score={securityData.secureScore} />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Findings Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">High Severity</span>
                  <Badge variant="critical">{bySeverity.High.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Medium Severity</span>
                  <Badge variant="medium">{bySeverity.Medium.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Low Severity</span>
                  <Badge variant="low">{bySeverity.Low.length}</Badge>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Healthy</span>
                  <Badge variant="low">{healthy.length}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Identity Hygiene</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Role Assignments</span>
                  <span className="font-semibold">{identityData?.roleAssignments.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Privileged Roles</span>
                  <Badge variant={privilegedRoles.length > 10 ? "high" : "info"}>
                    {privilegedRoles.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-20">
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {securityData.assessments.length > 0
                        ? Math.round((healthy.length / securityData.assessments.length) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Controls Passing</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="unhealthy">
            <TabsList>
              <TabsTrigger value="unhealthy">Unhealthy ({unhealthy.length})</TabsTrigger>
              <TabsTrigger value="healthy">Healthy ({healthy.length})</TabsTrigger>
              <TabsTrigger value="roles">Role Assignments</TabsTrigger>
            </TabsList>

            <TabsContent value="unhealthy">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Severity</th>
                          <th className="text-left p-3 font-medium">Finding</th>
                          <th className="text-left p-3 font-medium">Category</th>
                          <th className="text-left p-3 font-medium">Remediation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unhealthy.slice(0, 50).map((a) => (
                          <tr key={a.id} className="border-b hover:bg-muted/30">
                            <td className="p-3">
                              <Badge variant={a.severity === "High" ? "critical" : a.severity === "Medium" ? "medium" : "low"}>
                                {a.severity}
                              </Badge>
                            </td>
                            <td className="p-3 max-w-md">
                              <p className="font-medium">{a.displayName}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                            </td>
                            <td className="p-3">{a.category}</td>
                            <td className="p-3 max-w-sm text-xs text-muted-foreground line-clamp-2">{a.remediation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="healthy">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Finding</th>
                          <th className="text-left p-3 font-medium">Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {healthy.slice(0, 50).map((a) => (
                          <tr key={a.id} className="border-b hover:bg-muted/30">
                            <td className="p-3">{a.displayName}</td>
                            <td className="p-3">{a.category}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roles">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Role</th>
                          <th className="text-left p-3 font-medium">Principal Type</th>
                          <th className="text-left p-3 font-medium">Scope</th>
                        </tr>
                      </thead>
                      <tbody>
                        {identityData?.roleAssignments.map((ra) => (
                          <tr key={ra.id} className="border-b hover:bg-muted/30">
                            <td className="p-3">
                              <Badge variant={["Owner", "Contributor"].includes(ra.roleDefinitionName) ? "high" : "outline"}>
                                {ra.roleDefinitionName}
                              </Badge>
                            </td>
                            <td className="p-3">{ra.principalType}</td>
                            <td className="p-3 text-xs text-muted-foreground max-w-md truncate">{ra.scope}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}
