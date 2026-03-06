import type { Agent } from "./engine";
import type { AgentInput, AgentOutput, AgentFinding } from "@/types/agents";
import type { HealthEvent, ResourceHealth } from "@/types/azure";

export const vendorAccountabilityAgent: Agent = {
  type: "vendor-accountability",

  async analyze(input: AgentInput): Promise<AgentOutput> {
    const findings: AgentFinding[] = [];
    const healthEvents = input.data.healthEvents as HealthEvent[] | undefined;
    const resourceHealth = input.data.resourceHealth as ResourceHealth[] | undefined;

    if (healthEvents) {
      const serviceIssues = healthEvents.filter(
        (e) => e.eventType === "ServiceIssue"
      );

      if (serviceIssues.length > 0) {
        // Calculate rough impact duration
        const resolvedIssues = serviceIssues.filter((e) => e.endTime);
        let totalDowntimeHours = 0;

        for (const issue of resolvedIssues) {
          const start = new Date(issue.startTime).getTime();
          const end = new Date(issue.endTime!).getTime();
          totalDowntimeHours += (end - start) / (1000 * 60 * 60);
        }

        findings.push({
          agentType: "vendor-accountability",
          finding: `${serviceIssues.length} Azure service incident(s) recorded. ${resolvedIssues.length} resolved with total impact duration of ${totalDowntimeHours.toFixed(1)} hours`,
          evidence: {
            apiSource: "Microsoft.ResourceHealth/events",
            query: "Service health events where eventType=ServiceIssue",
            subscriptionId: input.subscriptionId,
            resourceIds: [],
            timeRange: "Recent events",
            lastRefreshed: new Date().toISOString(),
          },
          impact: `${totalDowntimeHours.toFixed(1)} hours of Azure-side service disruption`,
          riskLevel: totalDowntimeHours > 4 ? "high" : "medium",
          recommendation: "Document incidents for SLA credit claims and vendor accountability tracking.",
          steps: [
            "Record each incident with start/end times and impacted services",
            "Calculate uptime percentage against Azure SLA commitments",
            "File SLA credit requests via Azure support for breaches",
            "Include in monthly vendor review meetings",
          ],
        });

        // Check for SLA breach (99.9% = max 43.8 min/month downtime)
        const monthlyDowntimeMinutes = totalDowntimeHours * 60;
        if (monthlyDowntimeMinutes > 43.8) {
          findings.push({
            agentType: "vendor-accountability",
            finding: `Potential SLA breach: ${monthlyDowntimeMinutes.toFixed(0)} minutes of service incidents exceeds 99.9% SLA threshold of 43.8 minutes/month`,
            evidence: {
              apiSource: "Microsoft.ResourceHealth/events",
              query: "Calculated from service issue durations",
              subscriptionId: input.subscriptionId,
              resourceIds: [],
              timeRange: "Current month",
              lastRefreshed: new Date().toISOString(),
            },
            impact: "Azure SLA breach entitles you to service credits",
            riskLevel: "high",
            recommendation: "File an SLA credit claim through Azure support immediately.",
            steps: [
              "Document all affected resources and time ranges",
              "Calculate the exact downtime per service tier",
              "Submit credit request via Azure Portal > Help + Support",
              "Reference the specific SLA terms for each affected service",
            ],
          });
        }
      }
    }

    if (resourceHealth) {
      const degraded = resourceHealth.filter(
        (r) => r.availabilityState === "Degraded" || r.availabilityState === "Unavailable"
      );

      if (degraded.length > 0) {
        findings.push({
          agentType: "vendor-accountability",
          finding: `${degraded.length} resource(s) in degraded/unavailable state - potential platform-side issues`,
          evidence: {
            apiSource: "Microsoft.ResourceHealth/availabilityStatuses",
            query: "Resources with non-Available state",
            subscriptionId: input.subscriptionId,
            resourceIds: degraded.map((r) => r.resourceId),
            timeRange: "Current",
            lastRefreshed: new Date().toISOString(),
          },
          impact: "Platform-reported degradation may indicate Azure-side reliability issues",
          riskLevel: degraded.length > 5 ? "high" : "medium",
          recommendation: "Cross-reference with Service Health to determine if platform-side. Document for SLA tracking.",
          steps: [
            "Check if affected resources correlate with active service health events",
            "For platform-caused issues, document for SLA credit processing",
            "For customer-caused issues, investigate and remediate",
          ],
        });
      }
    }

    return {
      agentType: "vendor-accountability",
      findings,
      summary: `Vendor accountability analysis found ${findings.length} finding(s)`,
      analyzedAt: new Date().toISOString(),
      status: "completed",
    };
  },
};
