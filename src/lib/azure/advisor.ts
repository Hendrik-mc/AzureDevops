import { azureFetch } from "./client";
import type { AdvisorRecommendation } from "@/types/azure";

interface AdvisorResponse {
  value: {
    id: string;
    properties: {
      category: string;
      impact: string;
      shortDescription: { problem: string; solution: string };
      extendedProperties?: Record<string, string>;
      resourceMetadata?: { resourceId: string };
    };
  }[];
  nextLink?: string;
}

export async function getRecommendations(
  token: string,
  subscriptionId: string
): Promise<AdvisorRecommendation[]> {
  const allRecs: AdvisorRecommendation[] = [];
  let nextUrl: string | null =
    `/subscriptions/${subscriptionId}/providers/Microsoft.Advisor/recommendations?api-version=2025-01-01`;

  while (nextUrl) {
    const currentUrl = nextUrl;
    nextUrl = null;
    const response: AdvisorResponse = await azureFetch<AdvisorResponse>(token, currentUrl);

    for (const r of response.value) {
      const savings = r.properties.extendedProperties?.savingsAmount
        ? parseFloat(r.properties.extendedProperties.savingsAmount)
        : undefined;

      allRecs.push({
        id: r.id,
        category: r.properties.category as AdvisorRecommendation["category"],
        impact: r.properties.impact as AdvisorRecommendation["impact"],
        title: r.properties.shortDescription.problem,
        description: r.properties.shortDescription.solution,
        resourceId: r.properties.resourceMetadata?.resourceId,
        estimatedSavings: savings,
        extendedProperties: r.properties.extendedProperties,
      });
    }

    if (response.nextLink) {
      nextUrl = response.nextLink;
    }
  }

  return allRecs;
}

export async function getCostRecommendations(
  token: string,
  subscriptionId: string
): Promise<AdvisorRecommendation[]> {
  const all = await getRecommendations(token, subscriptionId);
  return all.filter((r) => r.category === "Cost");
}

export async function getSecurityRecommendations(
  token: string,
  subscriptionId: string
): Promise<AdvisorRecommendation[]> {
  const all = await getRecommendations(token, subscriptionId);
  return all.filter((r) => r.category === "Security");
}
