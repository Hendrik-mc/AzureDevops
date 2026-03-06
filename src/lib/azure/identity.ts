import { azureFetch } from "./client";
import type { RoleAssignment } from "@/types/azure";

interface RoleAssignmentResponse {
  value: {
    id: string;
    properties: {
      principalId: string;
      principalType: string;
      roleDefinitionId: string;
      scope: string;
      createdOn?: string;
    };
  }[];
  nextLink?: string;
}

interface RoleDefinitionResponse {
  properties: {
    roleName: string;
  };
}

const PRIVILEGED_ROLES = [
  "Owner",
  "Contributor",
  "User Access Administrator",
];

export async function getRoleAssignments(
  token: string,
  subscriptionId: string
): Promise<RoleAssignment[]> {
  const response = await azureFetch<RoleAssignmentResponse>(
    token,
    `/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleAssignments`,
    { apiVersion: "2022-04-01" }
  );

  return response.value.map((ra) => ({
    id: ra.id,
    principalId: ra.properties.principalId,
    principalType: ra.properties.principalType,
    roleDefinitionName: "",
    roleDefinitionId: ra.properties.roleDefinitionId,
    scope: ra.properties.scope,
    createdOn: ra.properties.createdOn,
  }));
}

export async function getRoleDefinitionName(
  token: string,
  roleDefinitionId: string
): Promise<string> {
  try {
    const response = await azureFetch<RoleDefinitionResponse>(
      token,
      roleDefinitionId,
      { apiVersion: "2022-04-01" }
    );
    return response.properties.roleName;
  } catch {
    return "Unknown";
  }
}

export async function getEnrichedRoleAssignments(
  token: string,
  subscriptionId: string
): Promise<RoleAssignment[]> {
  const assignments = await getRoleAssignments(token, subscriptionId);

  const uniqueRoleDefIds = Array.from(
    new Set(assignments.map((a) => a.roleDefinitionId))
  );

  const roleNameMap: Record<string, string> = {};
  await Promise.all(
    uniqueRoleDefIds.map(async (id) => {
      roleNameMap[id] = await getRoleDefinitionName(token, id);
    })
  );

  return assignments.map((a) => ({
    ...a,
    roleDefinitionName: roleNameMap[a.roleDefinitionId] || "Unknown",
  }));
}

export async function getPrivilegedAssignments(
  token: string,
  subscriptionId: string
): Promise<RoleAssignment[]> {
  const enriched = await getEnrichedRoleAssignments(token, subscriptionId);
  return enriched.filter((a) =>
    PRIVILEGED_ROLES.includes(a.roleDefinitionName)
  );
}
