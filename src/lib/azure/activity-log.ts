import { azureFetch } from "./client";
import type { ActivityLogEvent } from "@/types/azure";

interface ActivityLogResponse {
  value: {
    id: string;
    operationName: { localizedValue: string; value: string };
    status: { localizedValue: string; value: string };
    caller: string;
    resourceId?: string;
    eventTimestamp: string;
    category: { localizedValue: string; value: string };
    level: string;
    description?: string;
  }[];
  nextLink?: string;
}

export async function getActivityLogs(
  token: string,
  subscriptionId: string,
  days = 7
): Promise<ActivityLogEvent[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const filter = `eventTimestamp ge '${startDate.toISOString()}' and eventTimestamp le '${endDate.toISOString()}'`;

  const allEvents: ActivityLogEvent[] = [];
  let nextUrl: string | null =
    `/subscriptions/${subscriptionId}/providers/Microsoft.Insights/eventtypes/management/values?api-version=2015-04-01&$filter=${encodeURIComponent(filter)}`;

  while (nextUrl) {
    const currentUrl = nextUrl;
    nextUrl = null;
    const response: ActivityLogResponse = await azureFetch<ActivityLogResponse>(token, currentUrl);

    for (const e of response.value) {
      allEvents.push({
        id: e.id,
        operationName: e.operationName.localizedValue || e.operationName.value,
        status: e.status.localizedValue || e.status.value,
        caller: e.caller,
        resourceId: e.resourceId,
        timestamp: e.eventTimestamp,
        category: e.category.localizedValue || e.category.value,
        level: e.level,
        description: e.description,
      });
    }

    if (response.nextLink) {
      nextUrl = response.nextLink;
    }
  }

  return allEvents;
}

export async function getChangeVelocity(
  token: string,
  subscriptionId: string,
  days = 7
): Promise<{ date: string; count: number }[]> {
  const events = await getActivityLogs(token, subscriptionId, days);

  const writeOps = events.filter(
    (e) =>
      e.status === "Succeeded" &&
      (e.operationName.includes("write") ||
        e.operationName.includes("delete") ||
        e.operationName.includes("create"))
  );

  const grouped: Record<string, number> = {};
  for (const e of writeOps) {
    const date = e.timestamp.split("T")[0];
    grouped[date] = (grouped[date] || 0) + 1;
  }

  return Object.entries(grouped)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
