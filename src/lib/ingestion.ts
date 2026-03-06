import { prisma } from "./db";
import { fetchAllDashboardData } from "./azure";
import type { AzureResource, CostData, SecureScore, SecurityAssessment, HealthEvent, ActivityLogEvent } from "@/types/azure";

export async function ingestSubscriptionData(
  token: string,
  subscriptionId: string
) {
  const results = await fetchAllDashboardData(token, subscriptionId);

  const dbSubscription = await prisma.subscription.findUnique({
    where: { azureSubscriptionId: subscriptionId },
  });

  if (!dbSubscription) {
    throw new Error(`Subscription ${subscriptionId} not found in database`);
  }

  const now = new Date();
  const summary = { resources: 0, costs: 0, findings: 0, events: 0 };

  // Ingest resources
  if (results.resources?.status === "success") {
    const resources = results.resources.data as AzureResource[];
    for (const r of resources) {
      await prisma.resource.upsert({
        where: { azureResourceId: r.id },
        update: {
          name: r.name,
          type: r.type,
          resourceGroup: r.resourceGroup,
          location: r.location,
          tags: r.tags ? JSON.stringify(r.tags) : null,
          lastSyncedAt: now,
        },
        create: {
          azureResourceId: r.id,
          name: r.name,
          type: r.type,
          resourceGroup: r.resourceGroup,
          location: r.location,
          tags: r.tags ? JSON.stringify(r.tags) : null,
          subscriptionId: dbSubscription.id,
          lastSyncedAt: now,
        },
      });
    }
    summary.resources = resources.length;
  }

  // Ingest costs
  if (results.costs?.status === "success") {
    const costData = results.costs.data as { dailyCosts: CostData[] };
    for (const c of costData.dailyCosts) {
      await prisma.costRecord.create({
        data: {
          subscriptionId: dbSubscription.id,
          date: new Date(c.date),
          serviceName: c.serviceName || "Total",
          cost: c.cost,
          currency: c.currency,
        },
      });
    }
    summary.costs = costData.dailyCosts.length;
  }

  // Ingest security assessments as findings
  if (results.assessments?.status === "success") {
    const assessments = results.assessments.data as SecurityAssessment[];
    for (const a of assessments.filter((a) => a.status === "Unhealthy")) {
      await prisma.finding.upsert({
        where: { id: a.id.slice(-25) },
        update: {
          lastSeenAt: now,
          description: a.description,
        },
        create: {
          subscriptionId: dbSubscription.id,
          source: "defender",
          category: "security",
          severity: a.severity.toLowerCase(),
          title: a.displayName,
          description: a.description,
          resourceId: a.resourceId,
          firstSeenAt: now,
          lastSeenAt: now,
        },
      });
    }
    summary.findings = assessments.filter((a) => a.status === "Unhealthy").length;
  }

  // Ingest health events
  if (results.healthEvents?.status === "success") {
    const events = results.healthEvents.data as HealthEvent[];
    for (const e of events) {
      await prisma.healthEvent.create({
        data: {
          subscriptionId: dbSubscription.id,
          eventType: e.eventType,
          title: e.title,
          status: e.status,
          impactedServices: JSON.stringify(e.impactedServices),
          startTime: new Date(e.startTime),
          endTime: e.endTime ? new Date(e.endTime) : null,
          lastUpdated: new Date(e.lastUpdateTime),
        },
      });
    }
    summary.events = events.length;
  }

  // Create daily snapshot
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const secureScore = results.secureScore?.status === "success"
    ? (results.secureScore.data as SecureScore)
    : null;

  const totalCost = results.costs?.status === "success"
    ? (results.costs.data as { totalCost: number }).totalCost
    : null;

  await prisma.dailySnapshot.upsert({
    where: {
      subscriptionId_date: {
        subscriptionId: dbSubscription.id,
        date: today,
      },
    },
    update: {
      secureScore: secureScore?.percentage,
      totalCost,
      resourceCount: summary.resources,
      criticalFindings: summary.findings,
    },
    create: {
      subscriptionId: dbSubscription.id,
      date: today,
      secureScore: secureScore?.percentage,
      totalCost,
      resourceCount: summary.resources,
      criticalFindings: summary.findings,
    },
  });

  return summary;
}
