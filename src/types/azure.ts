export interface AzureSubscription {
  subscriptionId: string;
  displayName: string;
  state: string;
  tenantId: string;
}

export interface AzureResource {
  id: string;
  name: string;
  type: string;
  resourceGroup: string;
  location: string;
  tags: Record<string, string> | null;
  subscriptionId: string;
}

export interface CostData {
  date: string;
  cost: number;
  currency: string;
  serviceName?: string;
  resourceGroup?: string;
}

export interface CostSummary {
  totalCost: number;
  currency: string;
  costByService: { serviceName: string; cost: number }[];
  costByResourceGroup: { resourceGroup: string; cost: number }[];
  dailyCosts: CostData[];
  forecast?: number;
}

export interface SecureScore {
  currentScore: number;
  maxScore: number;
  percentage: number;
  weight: number;
}

export interface SecurityAssessment {
  id: string;
  displayName: string;
  status: "Healthy" | "Unhealthy" | "NotApplicable";
  severity: "High" | "Medium" | "Low";
  description: string;
  remediation: string;
  resourceId?: string;
  category: string;
}

export interface AdvisorRecommendation {
  id: string;
  category: "Cost" | "Security" | "HighAvailability" | "Performance" | "OperationalExcellence";
  impact: "High" | "Medium" | "Low";
  title: string;
  description: string;
  resourceId?: string;
  estimatedSavings?: number;
  extendedProperties?: Record<string, string>;
}

export interface HealthEvent {
  id: string;
  eventType: "ServiceIssue" | "PlannedMaintenance" | "HealthAdvisory" | "SecurityAdvisory";
  title: string;
  status: string;
  impactedServices: string[];
  startTime: string;
  endTime?: string;
  lastUpdateTime: string;
  summary: string;
}

export interface ResourceHealth {
  resourceId: string;
  availabilityState: "Available" | "Unavailable" | "Degraded" | "Unknown";
  summary: string;
  occurredTime: string;
}

export interface ActivityLogEvent {
  id: string;
  operationName: string;
  status: string;
  caller: string;
  resourceId?: string;
  timestamp: string;
  category: string;
  level: string;
  description?: string;
}

export interface RoleAssignment {
  id: string;
  principalId: string;
  principalType: string;
  roleDefinitionName: string;
  roleDefinitionId: string;
  scope: string;
  createdOn?: string;
}

export interface MonitorAlert {
  id: string;
  name: string;
  severity: string;
  status: string;
  targetResource?: string;
  firedTime?: string;
  resolvedTime?: string;
}

export interface DashboardData {
  subscriptionId: string;
  resources: { status: "success"; data: AzureResource[] } | { status: "error"; error: string };
  costs: { status: "success"; data: CostSummary } | { status: "error"; error: string };
  secureScore: { status: "success"; data: SecureScore } | { status: "error"; error: string };
  assessments: { status: "success"; data: SecurityAssessment[] } | { status: "error"; error: string };
  recommendations: { status: "success"; data: AdvisorRecommendation[] } | { status: "error"; error: string };
  healthEvents: { status: "success"; data: HealthEvent[] } | { status: "error"; error: string };
  resourceHealth: { status: "success"; data: ResourceHealth[] } | { status: "error"; error: string };
  activityLog: { status: "success"; data: ActivityLogEvent[] } | { status: "error"; error: string };
  roleAssignments: { status: "success"; data: RoleAssignment[] } | { status: "error"; error: string };
  alerts: { status: "success"; data: MonitorAlert[] } | { status: "error"; error: string };
}
