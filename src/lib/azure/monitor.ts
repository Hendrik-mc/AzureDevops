import { azureFetch } from "./client";
import type { MonitorAlert } from "@/types/azure";

interface AlertsResponse {
  value: {
    id: string;
    name: string;
    properties: {
      severity: string;
      monitorCondition: string;
      targetResource?: string;
      startDateTime?: string;
      monitorConditionResolvedDateTime?: string;
    };
  }[];
  nextLink?: string;
}

export async function getFiredAlerts(
  token: string,
  subscriptionId: string,
  days = 7
): Promise<MonitorAlert[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const allAlerts: MonitorAlert[] = [];
  let nextUrl: string | null =
    `/subscriptions/${subscriptionId}/providers/Microsoft.AlertsManagement/alerts?api-version=2019-05-05-preview&timeRange=7d`;

  while (nextUrl) {
    const currentUrl = nextUrl;
    nextUrl = null;
    const response: AlertsResponse = await azureFetch<AlertsResponse>(token, currentUrl);

    for (const a of response.value) {
      allAlerts.push({
        id: a.id,
        name: a.name,
        severity: a.properties.severity,
        status: a.properties.monitorCondition,
        targetResource: a.properties.targetResource,
        firedTime: a.properties.startDateTime,
        resolvedTime: a.properties.monitorConditionResolvedDateTime,
      });
    }

    if (response.nextLink) {
      nextUrl = response.nextLink;
    }
  }

  return allAlerts;
}

export async function getAlertsSummary(
  token: string,
  subscriptionId: string
): Promise<{ total: number; fired: number; resolved: number; bySeverity: Record<string, number> }> {
  const alerts = await getFiredAlerts(token, subscriptionId);

  const fired = alerts.filter((a) => a.status === "Fired").length;
  const resolved = alerts.filter((a) => a.status === "Resolved").length;

  const bySeverity: Record<string, number> = {};
  for (const a of alerts) {
    bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
  }

  return { total: alerts.length, fired, resolved, bySeverity };
}
