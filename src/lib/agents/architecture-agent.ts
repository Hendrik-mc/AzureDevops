import type { Agent } from "./engine";
import type { AgentInput, AgentOutput, AgentFinding } from "@/types/agents";
import type { AzureResource } from "@/types/azure";

export const architectureAgent: Agent = {
  type: "architecture",

  async analyze(input: AgentInput): Promise<AgentOutput> {
    const findings: AgentFinding[] = [];
    const resources = input.data.resources as AzureResource[] | undefined;

    if (!resources || resources.length === 0) {
      return {
        agentType: "architecture",
        findings: [],
        summary: "No resource data available for architecture analysis",
        analyzedAt: new Date().toISOString(),
        status: "completed",
      };
    }

    // Check for untagged resources
    const untagged = resources.filter(
      (r) => !r.tags || Object.keys(r.tags).length === 0
    );
    const untaggedPct = (untagged.length / resources.length) * 100;

    if (untaggedPct > 30) {
      findings.push({
        agentType: "architecture",
        finding: `${untaggedPct.toFixed(1)}% of resources (${untagged.length}/${resources.length}) lack tags`,
        evidence: {
          apiSource: "Microsoft.ResourceGraph/resources",
          query: "Resources | where isnull(tags) or tags == '{}'",
          subscriptionId: input.subscriptionId,
          resourceIds: untagged.slice(0, 10).map((r) => r.id),
          timeRange: "Current",
          lastRefreshed: new Date().toISOString(),
        },
        impact: "Missing tags hinder cost allocation, access governance, and automation",
        riskLevel: untaggedPct > 50 ? "high" : "medium",
        recommendation: "Implement a tagging policy and remediate untagged resources.",
        steps: [
          "Define mandatory tags: Environment, Owner, CostCenter, Application",
          "Deploy Azure Policy to enforce tagging on new resources",
          "Use Azure Resource Graph to bulk-identify untagged resources",
          "Create remediation tasks per resource group",
        ],
      });
    }

    // Check for single-region deployment
    const locations = new Set(resources.map((r) => r.location));
    if (locations.size === 1 && resources.length > 10) {
      const region = Array.from(locations)[0];
      findings.push({
        agentType: "architecture",
        finding: `All ${resources.length} resources are deployed in a single region (${region})`,
        evidence: {
          apiSource: "Microsoft.ResourceGraph/resources",
          query: "Resources | summarize count() by location",
          subscriptionId: input.subscriptionId,
          resourceIds: [],
          timeRange: "Current",
          lastRefreshed: new Date().toISOString(),
        },
        impact: "Single-region deployment creates a single point of failure for regional outages",
        riskLevel: "medium",
        recommendation: "Consider multi-region deployment for business-critical workloads.",
        steps: [
          "Identify business-critical services and their RTO/RPO requirements",
          "Design a disaster recovery strategy with paired regions",
          "Use Azure Traffic Manager or Front Door for geo-routing",
          "Test failover procedures regularly",
        ],
      });
    }

    // Detect potential orphaned resources (disks, NICs, public IPs not attached)
    const disks = resources.filter((r) => r.type === "microsoft.compute/disks");
    const nics = resources.filter((r) => r.type === "microsoft.network/networkinterfaces");
    const publicIps = resources.filter((r) => r.type === "microsoft.network/publicipaddresses");
    const orphanedCount = disks.length + nics.length + publicIps.length;

    if (orphanedCount > 20) {
      findings.push({
        agentType: "architecture",
        finding: `${orphanedCount} standalone networking/storage resources detected that may be orphaned (${disks.length} disks, ${nics.length} NICs, ${publicIps.length} public IPs)`,
        evidence: {
          apiSource: "Microsoft.ResourceGraph/resources",
          query: "Resources | where type in ('microsoft.compute/disks', 'microsoft.network/networkinterfaces', 'microsoft.network/publicipaddresses')",
          subscriptionId: input.subscriptionId,
          resourceIds: [],
          timeRange: "Current",
          lastRefreshed: new Date().toISOString(),
        },
        impact: "Orphaned resources waste money and increase attack surface",
        riskLevel: "low",
        recommendation: "Audit and remove unattached resources to reduce cost and risk.",
        steps: [
          "Query for unattached managed disks",
          "Identify NICs not associated with a VM",
          "Check for public IPs not bound to any resource",
          "Delete confirmed orphans after validation",
        ],
      });
    }

    return {
      agentType: "architecture",
      findings,
      summary: `Architecture analysis found ${findings.length} finding(s)`,
      analyzedAt: new Date().toISOString(),
      status: "completed",
    };
  },
};
