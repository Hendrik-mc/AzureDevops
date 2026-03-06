import type { Agent } from "./engine";
import type { AgentInput, AgentOutput, AgentFinding } from "@/types/agents";
import type { HealthEvent, ResourceHealth, MonitorAlert } from "@/types/azure";

export const reliabilityAgent: Agent = {
  type: "reliability",

  async analyze(input: AgentInput): Promise<AgentOutput> {
    const findings: AgentFinding[] = [];
    const healthEvents = input.data.healthEvents as HealthEvent[] | undefined;
    const resourceHealth = input.data.resourceHealth as ResourceHealth[] | undefined;
    const alerts = input.data.alerts as MonitorAlert[] | undefined;

    if (resourceHealth) {
      const unavailable = resourceHealth.filter((r) => r.availabilityState !== "Available");
      if (unavailable.length > 0) {
        findings.push({
          agentType: "reliability",
          finding: `${unavailable.length} resource(s) are currently not in Available state`,
          evidence: {
            apiSource: "Microsoft.ResourceHealth/availabilityStatuses",
            query: "Resources where availabilityState != Available",
            subscriptionId: input.subscriptionId,
            resourceIds: unavailable.map((r) => r.resourceId),
            timeRange: "Current",
            lastRefreshed: new Date().toISOString(),
          },
          impact: "Service disruption for affected resources and dependent workloads",
          riskLevel: unavailable.length > 5 ? "critical" : "high",
          recommendation: "Investigate unavailable resources and check for Azure service issues.",
          steps: [
            "Check Azure Service Health for platform-level incidents",
            "Review resource-specific health details for root cause",
            "Verify redundancy configuration for critical workloads",
            "Open a support ticket if Azure-side issue is suspected",
          ],
        });
      }
    }

    if (healthEvents) {
      const activeIncidents = healthEvents.filter(
        (e) => e.eventType === "ServiceIssue" && !e.endTime
      );
      if (activeIncidents.length > 0) {
        findings.push({
          agentType: "reliability",
          finding: `${activeIncidents.length} active Azure service incident(s) may be impacting your resources`,
          evidence: {
            apiSource: "Microsoft.ResourceHealth/events",
            query: "Service health events where eventType=ServiceIssue and not resolved",
            subscriptionId: input.subscriptionId,
            resourceIds: [],
            timeRange: "Current",
            lastRefreshed: new Date().toISOString(),
          },
          impact: `Services affected: ${activeIncidents.flatMap((e) => e.impactedServices).join(", ")}`,
          riskLevel: "high",
          recommendation: "Monitor Azure status page and prepare failover if critical services are affected.",
          steps: activeIncidents.map(
            (e) => `[${e.status}] ${e.title} - Services: ${e.impactedServices.join(", ")}`
          ),
        });
      }
    }

    if (alerts) {
      const firedAlerts = alerts.filter((a) => a.status === "Fired");
      if (firedAlerts.length > 20) {
        findings.push({
          agentType: "reliability",
          finding: `${firedAlerts.length} alerts currently in Fired state, indicating potential alert fatigue`,
          evidence: {
            apiSource: "Microsoft.AlertsManagement/alerts",
            query: "Alerts where monitorCondition=Fired",
            subscriptionId: input.subscriptionId,
            resourceIds: firedAlerts.map((a) => a.targetResource).filter(Boolean) as string[],
            timeRange: "Last 7 days",
            lastRefreshed: new Date().toISOString(),
          },
          impact: "Alert fatigue can cause teams to miss critical incidents",
          riskLevel: "medium",
          recommendation: "Review and tune alert rules. Suppress or adjust noisy alerts.",
          steps: [
            "Identify alerts that fire most frequently",
            "Adjust thresholds for noisy alert rules",
            "Consolidate related alerts into action groups",
            "Implement alert suppression rules for known maintenance windows",
          ],
        });
      }
    }

    return {
      agentType: "reliability",
      findings,
      summary: `Reliability analysis found ${findings.length} finding(s)`,
      analyzedAt: new Date().toISOString(),
      status: "completed",
    };
  },
};
