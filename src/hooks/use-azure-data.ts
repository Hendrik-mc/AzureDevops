"use client";

import { useQuery } from "@tanstack/react-query";
import type { CostSummary, SecureScore, SecurityAssessment, AdvisorRecommendation, HealthEvent, ResourceHealth, ActivityLogEvent, RoleAssignment, MonitorAlert, AzureResource } from "@/types/azure";

async function fetchApi<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  return res.json();
}

export function useResources(subscriptionIds: string[]) {
  return useQuery<{ resources: AzureResource[] }>({
    queryKey: ["resources", subscriptionIds],
    queryFn: () => fetchApi(`/api/azure/resources?subscriptions=${subscriptionIds.join(",")}`),
    enabled: subscriptionIds.length > 0,
  });
}

export function useCosts(subscriptionId: string) {
  return useQuery<CostSummary>({
    queryKey: ["costs", subscriptionId],
    queryFn: () => fetchApi(`/api/azure/costs?subscriptionId=${subscriptionId}`),
    enabled: !!subscriptionId,
  });
}

export function useSecurityData(subscriptionId: string) {
  return useQuery<{ secureScore: SecureScore; assessments: SecurityAssessment[] }>({
    queryKey: ["security", subscriptionId],
    queryFn: () => fetchApi(`/api/azure/security?subscriptionId=${subscriptionId}`),
    enabled: !!subscriptionId,
  });
}

export function useAdvisor(subscriptionId: string, category?: string) {
  const params = new URLSearchParams({ subscriptionId });
  if (category) params.set("category", category);

  return useQuery<{ recommendations: AdvisorRecommendation[] }>({
    queryKey: ["advisor", subscriptionId, category],
    queryFn: () => fetchApi(`/api/azure/advisor?${params}`),
    enabled: !!subscriptionId,
  });
}

export function useHealth(subscriptionId: string) {
  return useQuery<{ healthEvents: HealthEvent[]; resourceHealth: ResourceHealth[] }>({
    queryKey: ["health", subscriptionId],
    queryFn: () => fetchApi(`/api/azure/health?subscriptionId=${subscriptionId}`),
    enabled: !!subscriptionId,
  });
}

export function useActivityLog(subscriptionId: string, days = 7) {
  return useQuery<{ activityEvents: ActivityLogEvent[] }>({
    queryKey: ["activity", subscriptionId, days],
    queryFn: () => fetchApi(`/api/azure/activity?subscriptionId=${subscriptionId}&days=${days}`),
    enabled: !!subscriptionId,
  });
}

export function useChangeVelocity(subscriptionId: string, days = 7) {
  return useQuery<{ changeVelocity: { date: string; count: number }[] }>({
    queryKey: ["velocity", subscriptionId, days],
    queryFn: () => fetchApi(`/api/azure/activity?subscriptionId=${subscriptionId}&days=${days}&view=velocity`),
    enabled: !!subscriptionId,
  });
}

export function useIdentity(subscriptionId: string) {
  return useQuery<{ roleAssignments: RoleAssignment[] }>({
    queryKey: ["identity", subscriptionId],
    queryFn: () => fetchApi(`/api/azure/identity?subscriptionId=${subscriptionId}`),
    enabled: !!subscriptionId,
  });
}

export function useAlerts(subscriptionId: string) {
  return useQuery<{ alerts: MonitorAlert[] }>({
    queryKey: ["alerts", subscriptionId],
    queryFn: () => fetchApi(`/api/azure/health?subscriptionId=${subscriptionId}&view=service`),
    enabled: !!subscriptionId,
  });
}
