import type { Agent } from "./engine";
import type { AgentInput, AgentOutput, AgentFinding } from "@/types/agents";
import type { SecurityAssessment, RoleAssignment } from "@/types/azure";

const CIS_CONTROL_MAP: Record<string, string> = {
  "Enable MFA": "CIS 1.1 - Ensure MFA is enabled for all privileged users",
  "encryption": "CIS 3.x - Ensure data encryption at rest",
  "network": "CIS 4.x - Ensure network security is properly configured",
  "logging": "CIS 5.x - Ensure diagnostic logging is enabled",
  "key vault": "CIS 8.x - Ensure Key Vault is used for secret management",
};

export const complianceAgent: Agent = {
  type: "compliance",

  async analyze(input: AgentInput): Promise<AgentOutput> {
    const findings: AgentFinding[] = [];
    const assessments = input.data.assessments as SecurityAssessment[] | undefined;
    const roleAssignments = input.data.roleAssignments as RoleAssignment[] | undefined;

    if (assessments) {
      const unhealthy = assessments.filter((a) => a.status === "Unhealthy");
      const total = assessments.length;
      const compliancePct = total > 0 ? ((total - unhealthy.length) / total) * 100 : 100;

      if (compliancePct < 80) {
        findings.push({
          agentType: "compliance",
          finding: `Overall compliance rate is ${compliancePct.toFixed(1)}%, below the 80% target`,
          evidence: {
            apiSource: "Microsoft.Security/assessments",
            query: "All assessments healthy vs unhealthy ratio",
            subscriptionId: input.subscriptionId,
            resourceIds: [],
            timeRange: "Current",
            lastRefreshed: new Date().toISOString(),
          },
          impact: "Low compliance rate indicates gaps in security controls that may fail audits",
          riskLevel: compliancePct < 60 ? "critical" : "high",
          recommendation: "Prioritize remediation of unhealthy assessments mapped to compliance frameworks.",
          steps: [
            "Export the full findings list for compliance review",
            "Map findings to your applicable compliance framework (CIS, SOC2, ISO 27001)",
            "Create remediation tickets for each control gap",
            "Track progress weekly until target compliance is achieved",
          ],
        });
      }

      // Map findings to CIS controls
      for (const assessment of unhealthy) {
        for (const [keyword, cisControl] of Object.entries(CIS_CONTROL_MAP)) {
          if (
            assessment.displayName.toLowerCase().includes(keyword.toLowerCase()) ||
            assessment.description.toLowerCase().includes(keyword.toLowerCase())
          ) {
            findings.push({
              agentType: "compliance",
              finding: `${cisControl}: ${assessment.displayName}`,
              evidence: {
                apiSource: "Microsoft.Security/assessments",
                query: `Assessment: ${assessment.id}`,
                subscriptionId: input.subscriptionId,
                resourceIds: assessment.resourceId ? [assessment.resourceId] : [],
                timeRange: "Current",
                lastRefreshed: new Date().toISOString(),
              },
              impact: `Non-compliance with ${cisControl.split(" - ")[0]}`,
              riskLevel: assessment.severity === "High" ? "high" : "medium",
              recommendation: assessment.remediation || "Follow Defender for Cloud remediation guidance",
              steps: [
                `Review: ${assessment.displayName}`,
                `Remediate: ${assessment.remediation?.slice(0, 150) || "See Defender for Cloud"}`,
                "Verify control passes after remediation",
              ],
            });
            break;
          }
        }
      }
    }

    // Check for least privilege violations
    if (roleAssignments) {
      const subscriptionOwners = roleAssignments.filter(
        (ra) => ra.roleDefinitionName === "Owner" && ra.scope.split("/").length <= 5
      );

      if (subscriptionOwners.length > 3) {
        findings.push({
          agentType: "compliance",
          finding: `SOC2 CC6.1 / ISO 27001 A.9.2.3: ${subscriptionOwners.length} subscription-level Owner assignments exceed recommended maximum of 3`,
          evidence: {
            apiSource: "Microsoft.Authorization/roleAssignments",
            query: "Owner role at subscription scope",
            subscriptionId: input.subscriptionId,
            resourceIds: [],
            timeRange: "Current",
            lastRefreshed: new Date().toISOString(),
          },
          impact: "Violates principle of least privilege required by SOC2 and ISO 27001",
          riskLevel: "high",
          recommendation: "Reduce Owner assignments and implement just-in-time access.",
          steps: [
            "Audit all Owner assignments at subscription scope",
            "Convert permanent assignments to PIM eligible assignments",
            "Require justification and approval for Owner elevation",
            "Document in your access control matrix",
          ],
        });
      }
    }

    return {
      agentType: "compliance",
      findings,
      summary: `Compliance analysis found ${findings.length} finding(s)`,
      analyzedAt: new Date().toISOString(),
      status: "completed",
    };
  },
};
