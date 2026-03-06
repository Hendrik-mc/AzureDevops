import { azureFetch } from "./client";
import type { SecureScore, SecurityAssessment } from "@/types/azure";

interface SecureScoreResponse {
  value: {
    id: string;
    name: string;
    properties: {
      displayName: string;
      score: {
        current: number;
        max: number;
        percentage: number;
      };
      weight: number;
    };
  }[];
}

interface AssessmentResponse {
  value: {
    id: string;
    name: string;
    properties: {
      displayName: string;
      status: { code: string };
      metadata?: {
        severity: string;
        description: string;
        remediationDescription: string;
        categories: string[];
      };
      resourceDetails?: {
        id?: string;
      };
    };
  }[];
  nextLink?: string;
}

export async function getSecureScore(
  token: string,
  subscriptionId: string
): Promise<SecureScore> {
  const response = await azureFetch<SecureScoreResponse>(
    token,
    `/subscriptions/${subscriptionId}/providers/Microsoft.Security/secureScores`,
    { apiVersion: "2020-01-01" }
  );

  const ascScore = response.value.find((s) => s.name === "ascScore");
  if (!ascScore) {
    return { currentScore: 0, maxScore: 0, percentage: 0, weight: 0 };
  }

  return {
    currentScore: ascScore.properties.score.current,
    maxScore: ascScore.properties.score.max,
    percentage: ascScore.properties.score.percentage * 100,
    weight: ascScore.properties.weight,
  };
}

export async function getSecurityAssessments(
  token: string,
  subscriptionId: string
): Promise<SecurityAssessment[]> {
  const allAssessments: SecurityAssessment[] = [];
  let nextUrl: string | null =
    `/subscriptions/${subscriptionId}/providers/Microsoft.Security/assessments?api-version=2020-01-01`;

  while (nextUrl) {
    const currentUrl = nextUrl;
    nextUrl = null;
    const response: AssessmentResponse = await azureFetch<AssessmentResponse>(token, currentUrl);

    for (const a of response.value) {
      allAssessments.push({
        id: a.id,
        displayName: a.properties.displayName,
        status: a.properties.status.code as SecurityAssessment["status"],
        severity: (a.properties.metadata?.severity || "Medium") as SecurityAssessment["severity"],
        description: a.properties.metadata?.description || "",
        remediation: a.properties.metadata?.remediationDescription || "",
        resourceId: a.properties.resourceDetails?.id,
        category: a.properties.metadata?.categories?.[0] || "General",
      });
    }

    if (response.nextLink) {
      nextUrl = response.nextLink;
    }
  }

  return allAssessments;
}

export async function getUnhealthyAssessments(
  token: string,
  subscriptionId: string
): Promise<SecurityAssessment[]> {
  const all = await getSecurityAssessments(token, subscriptionId);
  return all.filter((a) => a.status === "Unhealthy");
}
