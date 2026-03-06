import { azureFetch } from "./client";
import type { HealthEvent, ResourceHealth } from "@/types/azure";

interface ServiceHealthResponse {
  value: {
    id: string;
    properties: {
      eventType: string;
      title: string;
      status: string;
      impactedServices: { impactedServiceName: string }[];
      impactStartTime: string;
      impactMitigationTime?: string;
      lastUpdateTime: string;
      summary: string;
    };
  }[];
}

interface ResourceHealthResponse {
  value: {
    id: string;
    properties: {
      availabilityState: string;
      summary: string;
      occurredTime: string;
    };
  }[];
  nextLink?: string;
}

export async function getServiceHealthEvents(
  token: string,
  subscriptionId: string
): Promise<HealthEvent[]> {
  const response = await azureFetch<ServiceHealthResponse>(
    token,
    `/subscriptions/${subscriptionId}/providers/Microsoft.ResourceHealth/events`,
    { apiVersion: "2024-02-01" }
  );

  return response.value.map((e) => ({
    id: e.id,
    eventType: e.properties.eventType as HealthEvent["eventType"],
    title: e.properties.title,
    status: e.properties.status,
    impactedServices: e.properties.impactedServices.map(
      (s) => s.impactedServiceName
    ),
    startTime: e.properties.impactStartTime,
    endTime: e.properties.impactMitigationTime,
    lastUpdateTime: e.properties.lastUpdateTime,
    summary: e.properties.summary,
  }));
}

export async function getResourceHealthStatuses(
  token: string,
  subscriptionId: string
): Promise<ResourceHealth[]> {
  const allStatuses: ResourceHealth[] = [];
  let nextUrl: string | null =
    `/subscriptions/${subscriptionId}/providers/Microsoft.ResourceHealth/availabilityStatuses?api-version=2024-02-01`;

  while (nextUrl) {
    const currentUrl = nextUrl;
    nextUrl = null;
    const response: ResourceHealthResponse = await azureFetch<ResourceHealthResponse>(token, currentUrl);

    for (const r of response.value) {
      const resourceId = r.id.replace(
        /\/providers\/Microsoft\.ResourceHealth\/availabilityStatuses\/current$/,
        ""
      );

      allStatuses.push({
        resourceId,
        availabilityState: r.properties
          .availabilityState as ResourceHealth["availabilityState"],
        summary: r.properties.summary,
        occurredTime: r.properties.occurredTime,
      });
    }

    if (response.nextLink) {
      nextUrl = response.nextLink;
    }
  }

  return allStatuses;
}

export async function getUnavailableResources(
  token: string,
  subscriptionId: string
): Promise<ResourceHealth[]> {
  const all = await getResourceHealthStatuses(token, subscriptionId);
  return all.filter((r) => r.availabilityState !== "Available");
}
