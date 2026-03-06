import type { Agent } from "./engine";
import type { AgentInput, AgentOutput, AgentFinding } from "@/types/agents";
import type { CostSummary, AdvisorRecommendation } from "@/types/azure";

export const finopsAgent: Agent = {
  type: "finops",

  async analyze(input: AgentInput): Promise<AgentOutput> {
    const findings: AgentFinding[] = [];
    const costs = input.data.costs as CostSummary | undefined;
    const recommendations = input.data.recommendations as AdvisorRecommendation[] | undefined;

    if (costs) {
      // Detect cost anomalies using simple statistical analysis
      const dailyCosts = costs.dailyCosts.map((d) => d.cost);
      if (dailyCosts.length >= 7) {
        const mean = dailyCosts.reduce((s, v) => s + v, 0) / dailyCosts.length;
        const stdDev = Math.sqrt(
          dailyCosts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / dailyCosts.length
        );
        const threshold = mean + 2 * stdDev;

        const anomalies = costs.dailyCosts.filter((d) => d.cost > threshold);
        if (anomalies.length > 0) {
          findings.push({
            agentType: "finops",
            finding: `${anomalies.length} cost anomaly day(s) detected where spend exceeds 2 standard deviations above the rolling average`,
            evidence: {
              apiSource: "Microsoft.CostManagement/query",
              query: "Daily cost aggregation with anomaly detection",
              subscriptionId: input.subscriptionId,
              resourceIds: [],
              timeRange: "MonthToDate",
              lastRefreshed: new Date().toISOString(),
            },
            impact: `Anomalous days had spend ranging from $${Math.min(...anomalies.map((a) => a.cost)).toFixed(2)} to $${Math.max(...anomalies.map((a) => a.cost)).toFixed(2)} vs average of $${mean.toFixed(2)}`,
            riskLevel: anomalies.some((a) => a.cost > mean * 3) ? "high" : "medium",
            recommendation: "Investigate spike causes. Check for unplanned resource provisioning or unusual activity.",
            steps: [
              "Review Activity Log for resource creation events on anomalous days",
              "Check for runaway auto-scaling or orphaned resources",
              "Set up Azure budget alerts to catch spikes early",
            ],
          });
        }
      }

      // Analyze cost concentration
      if (costs.costByService.length > 0) {
        const topService = costs.costByService[0];
        const topPct = (topService.cost / costs.totalCost) * 100;
        if (topPct > 60) {
          findings.push({
            agentType: "finops",
            finding: `High cost concentration: ${topService.serviceName} accounts for ${topPct.toFixed(1)}% of total spend`,
            evidence: {
              apiSource: "Microsoft.CostManagement/query",
              query: "Cost grouped by ServiceName",
              subscriptionId: input.subscriptionId,
              resourceIds: [],
              timeRange: "MonthToDate",
              lastRefreshed: new Date().toISOString(),
            },
            impact: `$${topService.cost.toFixed(2)} concentrated in a single service creates financial risk`,
            riskLevel: "medium",
            recommendation: "Review if the service usage is optimized and explore reserved capacity or savings plans.",
            steps: [
              `Analyze ${topService.serviceName} resource utilization`,
              "Consider Reserved Instances or Savings Plans for predictable workloads",
              "Evaluate right-sizing opportunities",
            ],
          });
        }
      }
    }

    // Surface Advisor cost recommendations
    if (recommendations) {
      const costRecs = recommendations.filter((r) => r.category === "Cost");
      const totalSavings = costRecs.reduce((sum, r) => sum + (r.estimatedSavings || 0), 0);

      if (totalSavings > 100) {
        findings.push({
          agentType: "finops",
          finding: `Azure Advisor identifies $${totalSavings.toFixed(2)} in potential monthly savings across ${costRecs.length} recommendations`,
          evidence: {
            apiSource: "Microsoft.Advisor/recommendations",
            query: "Recommendations filtered by category=Cost",
            subscriptionId: input.subscriptionId,
            resourceIds: costRecs.map((r) => r.resourceId).filter(Boolean) as string[],
            timeRange: "Current",
            lastRefreshed: new Date().toISOString(),
          },
          impact: `Potential annual savings of $${(totalSavings * 12).toFixed(2)}`,
          riskLevel: totalSavings > 1000 ? "high" : "medium",
          recommendation: "Prioritize high-impact recommendations: right-sizing, reserved instances, and idle resource cleanup.",
          steps: costRecs.slice(0, 5).map((r) => `${r.title}: ${r.description}`),
        });
      }
    }

    return {
      agentType: "finops",
      findings,
      summary: `FinOps analysis found ${findings.length} finding(s) for subscription ${input.subscriptionId}`,
      analyzedAt: new Date().toISOString(),
      status: "completed",
    };
  },
};
