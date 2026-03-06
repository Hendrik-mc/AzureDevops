import type { Agent } from "./engine";
import type { AgentInput, AgentOutput, AgentFinding } from "@/types/agents";
import type { SecureScore, SecurityAssessment, RoleAssignment } from "@/types/azure";

export const securityAgent: Agent = {
  type: "security",

  async analyze(input: AgentInput): Promise<AgentOutput> {
    const findings: AgentFinding[] = [];
    const secureScore = input.data.secureScore as SecureScore | undefined;
    const assessments = input.data.assessments as SecurityAssessment[] | undefined;
    const roleAssignments = input.data.roleAssignments as RoleAssignment[] | undefined;

    // Check secure score
    if (secureScore && secureScore.percentage < 70) {
      findings.push({
        agentType: "security",
        finding: `Secure score is ${secureScore.percentage.toFixed(1)}%, below the recommended 70% threshold`,
        evidence: {
          apiSource: "Microsoft.Security/secureScores",
          query: "Secure score for ascScore",
          subscriptionId: input.subscriptionId,
          resourceIds: [],
          timeRange: "Current",
          lastRefreshed: new Date().toISOString(),
        },
        impact: "Low security posture increases risk of breaches and compliance failures",
        riskLevel: secureScore.percentage < 50 ? "critical" : "high",
        recommendation: "Address high-severity Defender recommendations to improve score rapidly.",
        steps: [
          "Review the Security Controls breakdown in Defender for Cloud",
          "Prioritize controls with the highest weight/impact",
          "Start with quick wins: enable MFA, encrypt data at rest, configure network security groups",
        ],
      });
    }

    // Analyze unhealthy assessments
    if (assessments) {
      const unhealthy = assessments.filter((a) => a.status === "Unhealthy");
      const highSeverity = unhealthy.filter((a) => a.severity === "High");

      if (highSeverity.length > 0) {
        findings.push({
          agentType: "security",
          finding: `${highSeverity.length} high-severity security findings require immediate attention`,
          evidence: {
            apiSource: "Microsoft.Security/assessments",
            query: "Assessments where status=Unhealthy and severity=High",
            subscriptionId: input.subscriptionId,
            resourceIds: highSeverity.map((a) => a.resourceId).filter(Boolean) as string[],
            timeRange: "Current",
            lastRefreshed: new Date().toISOString(),
          },
          impact: `${highSeverity.length} critical security gaps that could be exploited`,
          riskLevel: highSeverity.length > 10 ? "critical" : "high",
          recommendation: "Triage and remediate high-severity findings starting with those affecting the most resources.",
          steps: highSeverity.slice(0, 5).map(
            (a) => `[${a.severity}] ${a.displayName}: ${a.remediation?.slice(0, 100) || "Review in Defender"}`
          ),
        });
      }
    }

    // Check identity hygiene
    if (roleAssignments) {
      const privilegedRoles = ["Owner", "Contributor", "User Access Administrator"];
      const privileged = roleAssignments.filter((ra) =>
        privilegedRoles.includes(ra.roleDefinitionName)
      );
      const owners = roleAssignments.filter((ra) => ra.roleDefinitionName === "Owner");

      if (owners.length > 3) {
        findings.push({
          agentType: "security",
          finding: `${owners.length} Owner role assignments detected. Excessive ownership increases blast radius.`,
          evidence: {
            apiSource: "Microsoft.Authorization/roleAssignments",
            query: "Role assignments where role=Owner",
            subscriptionId: input.subscriptionId,
            resourceIds: [],
            timeRange: "Current",
            lastRefreshed: new Date().toISOString(),
          },
          impact: "Owner roles can modify any resource including IAM. Compromise of any owner account grants full control.",
          riskLevel: owners.length > 5 ? "critical" : "high",
          recommendation: "Reduce Owner assignments to maximum 2-3 break-glass accounts. Use Contributor for day-to-day operations.",
          steps: [
            "Audit each Owner assignment for necessity",
            "Replace Owner with Contributor where possible",
            "Implement Privileged Identity Management (PIM) for just-in-time access",
            "Enable MFA for all privileged accounts",
          ],
        });
      }

      if (privileged.length > 20) {
        findings.push({
          agentType: "security",
          finding: `${privileged.length} privileged role assignments (Owner/Contributor/UAA) detected`,
          evidence: {
            apiSource: "Microsoft.Authorization/roleAssignments",
            query: "Role assignments with privileged roles",
            subscriptionId: input.subscriptionId,
            resourceIds: [],
            timeRange: "Current",
            lastRefreshed: new Date().toISOString(),
          },
          impact: "Excessive privileged access violates principle of least privilege",
          riskLevel: "medium",
          recommendation: "Review and reduce privileged assignments. Use scoped roles at resource group level.",
          steps: [
            "List all privileged users and validate each assignment",
            "Move to resource-group-scoped roles where subscription-wide access isn't needed",
            "Implement Azure PIM for eligible (not permanent) assignments",
          ],
        });
      }
    }

    return {
      agentType: "security",
      findings,
      summary: `Security analysis found ${findings.length} finding(s) for subscription ${input.subscriptionId}`,
      analyzedAt: new Date().toISOString(),
      status: "completed",
    };
  },
};
