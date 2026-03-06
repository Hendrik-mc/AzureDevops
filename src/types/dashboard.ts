export interface KPIMetric {
  label: string;
  value: string | number;
  previousValue?: string | number;
  trend?: "up" | "down" | "stable";
  trendIsPositive?: boolean;
  unit?: string;
  source?: string;
  lastRefreshed?: string;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface CostBreakdownItem {
  name: string;
  cost: number;
  percentage: number;
  color?: string;
}

export interface FindingItem {
  id: string;
  source: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  resourceId?: string;
  evidence?: {
    apiSource: string;
    query: string;
    subscriptionId: string;
    lastRefreshed: string;
  };
  status: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface RecommendationItem {
  id: string;
  source: string;
  category: string;
  impact: string;
  title: string;
  description: string;
  estimatedSavings?: number;
  resourceId?: string;
}

export interface SubscriptionOption {
  id: string;
  azureSubscriptionId: string;
  displayName: string;
  enabled: boolean;
}

export interface ReportConfig {
  type: "weekly_summary" | "executive_overview" | "security_evidence" | "cost_analysis";
  subscriptionIds: string[];
  dateRange: {
    start: string;
    end: string;
  };
  title?: string;
}
