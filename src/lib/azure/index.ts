import { fetchAllSettled } from "./client";
import { getResources, getResourceCounts, getTagCoverage } from "./resource-graph";
import { getCostSummary } from "./cost-management";
import { getSecureScore, getSecurityAssessments } from "./defender";
import { getRecommendations } from "./advisor";
import { getServiceHealthEvents, getResourceHealthStatuses } from "./health";
import { getActivityLogs } from "./activity-log";
import { getEnrichedRoleAssignments } from "./identity";
import { getFiredAlerts } from "./monitor";

export async function fetchAllDashboardData(
  token: string,
  subscriptionId: string
) {
  return fetchAllSettled({
    resources: () => getResources(token, [subscriptionId]),
    resourceCounts: () => getResourceCounts(token, [subscriptionId]),
    tagCoverage: () => getTagCoverage(token, [subscriptionId]),
    costs: () => getCostSummary(token, subscriptionId),
    secureScore: () => getSecureScore(token, subscriptionId),
    assessments: () => getSecurityAssessments(token, subscriptionId),
    recommendations: () => getRecommendations(token, subscriptionId),
    healthEvents: () => getServiceHealthEvents(token, subscriptionId),
    resourceHealth: () => getResourceHealthStatuses(token, subscriptionId),
    activityLog: () => getActivityLogs(token, subscriptionId, 7),
    roleAssignments: () => getEnrichedRoleAssignments(token, subscriptionId),
    alerts: () => getFiredAlerts(token, subscriptionId),
  });
}

export {
  getResources,
  getResourceCounts,
  getTagCoverage,
  searchResources,
} from "./resource-graph";
export {
  getCostSummary,
  getCostsByTimePeriod,
  getCostsByService,
  getCostsByResourceGroup,
} from "./cost-management";
export {
  getSecureScore,
  getSecurityAssessments,
  getUnhealthyAssessments,
} from "./defender";
export {
  getRecommendations,
  getCostRecommendations,
  getSecurityRecommendations,
} from "./advisor";
export {
  getServiceHealthEvents,
  getResourceHealthStatuses,
  getUnavailableResources,
} from "./health";
export { getActivityLogs, getChangeVelocity } from "./activity-log";
export {
  getRoleAssignments,
  getEnrichedRoleAssignments,
  getPrivilegedAssignments,
} from "./identity";
export { getFiredAlerts, getAlertsSummary } from "./monitor";
