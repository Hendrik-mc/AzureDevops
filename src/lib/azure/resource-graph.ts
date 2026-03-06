import { ResourceGraphClient } from "@azure/arm-resourcegraph";
import { SessionTokenCredential } from "./client";
import type { AzureResource } from "@/types/azure";

export async function queryResources(
  token: string,
  query: string,
  subscriptions: string[]
): Promise<Record<string, unknown>[]> {
  const credential = new SessionTokenCredential(token);
  const client = new ResourceGraphClient(credential);

  const allResults: Record<string, unknown>[] = [];
  let skipToken: string | undefined;

  do {
    const response = await client.resources({
      query,
      subscriptions,
      options: {
        resultFormat: "objectArray",
        ...(skipToken ? { skipToken } : {}),
      },
    });

    if (response.data && Array.isArray(response.data)) {
      allResults.push(...(response.data as Record<string, unknown>[]));
    }

    skipToken = response.skipToken ?? undefined;
  } while (skipToken);

  return allResults;
}

export async function getResources(
  token: string,
  subscriptions: string[]
): Promise<AzureResource[]> {
  const results = await queryResources(
    token,
    "Resources | project id, name, type, resourceGroup, location, tags, subscriptionId | order by name asc",
    subscriptions
  );

  return results.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    type: r.type as string,
    resourceGroup: r.resourceGroup as string,
    location: r.location as string,
    tags: r.tags as Record<string, string> | null,
    subscriptionId: r.subscriptionId as string,
  }));
}

export async function getResourceCounts(
  token: string,
  subscriptions: string[]
): Promise<{ type: string; count: number }[]> {
  const results = await queryResources(
    token,
    "Resources | summarize count() by type | order by count_ desc",
    subscriptions
  );

  return results.map((r) => ({
    type: r.type as string,
    count: r.count_ as number,
  }));
}

export async function getTagCoverage(
  token: string,
  subscriptions: string[]
): Promise<{ tagged: number; untagged: number; total: number }> {
  const results = await queryResources(
    token,
    "Resources | extend hasTag = isnotnull(tags) and tags != '{}' | summarize tagged=countif(hasTag), untagged=countif(not(hasTag))",
    subscriptions
  );

  const row = results[0] || { tagged: 0, untagged: 0 };
  const tagged = (row.tagged as number) || 0;
  const untagged = (row.untagged as number) || 0;

  return { tagged, untagged, total: tagged + untagged };
}

export async function searchResources(
  token: string,
  subscriptions: string[],
  searchTerm: string
): Promise<AzureResource[]> {
  const safeSearch = searchTerm.replace(/'/g, "''");
  const results = await queryResources(
    token,
    `Resources | where name contains '${safeSearch}' or resourceGroup contains '${safeSearch}' | project id, name, type, resourceGroup, location, tags, subscriptionId | take 100`,
    subscriptions
  );

  return results.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    type: r.type as string,
    resourceGroup: r.resourceGroup as string,
    location: r.location as string,
    tags: r.tags as Record<string, string> | null,
    subscriptionId: r.subscriptionId as string,
  }));
}
