export type AgentType =
  | "finops"
  | "security"
  | "reliability"
  | "architecture"
  | "compliance"
  | "vendor-accountability";

export type RiskLevel = "critical" | "high" | "medium" | "low";

export interface AgentEvidence {
  apiSource: string;
  query: string;
  subscriptionId: string;
  resourceIds: string[];
  timeRange: string;
  lastRefreshed: string;
}

export interface AgentFinding {
  agentType: AgentType;
  finding: string;
  evidence: AgentEvidence;
  impact: string;
  riskLevel: RiskLevel;
  recommendation: string;
  steps: string[];
}

export interface AgentOutput {
  agentType: AgentType;
  findings: AgentFinding[];
  summary: string;
  analyzedAt: string;
  status: "completed" | "failed";
  error?: string;
}

export interface AgentInput {
  subscriptionId: string;
  tenantId: string;
  data: Record<string, unknown>;
  historicalData?: Record<string, unknown>;
}
