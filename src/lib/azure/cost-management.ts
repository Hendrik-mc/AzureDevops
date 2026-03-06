import { azureFetch } from "./client";
import type { CostData, CostSummary } from "@/types/azure";

interface CostQueryResponse {
  properties: {
    rows: (string | number)[][];
    columns: { name: string; type: string }[];
    nextLink?: string;
  };
}

export async function getCostsByTimePeriod(
  token: string,
  subscriptionId: string,
  timeframe: "MonthToDate" | "BillingMonthToDate" | "TheLastMonth" | "TheLastBillingMonth" | "Custom" = "MonthToDate",
  granularity: "Daily" | "Monthly" = "Daily"
): Promise<CostData[]> {
  const response = await azureFetch<CostQueryResponse>(
    token,
    `/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query`,
    {
      method: "POST",
      apiVersion: "2023-11-01",
      body: {
        type: "Usage",
        timeframe,
        dataset: {
          aggregation: {
            totalCost: { name: "PreTaxCost", function: "Sum" },
          },
          granularity,
        },
      },
    }
  );

  const cols = response.properties.columns;
  const costIdx = cols.findIndex((c) => c.name === "PreTaxCost");
  const dateIdx = cols.findIndex((c) => c.name === "UsageDate" || c.name === "BillingMonth");
  const currIdx = cols.findIndex((c) => c.name === "Currency");

  return response.properties.rows.map((row) => ({
    date: String(row[dateIdx]),
    cost: Number(row[costIdx]),
    currency: (currIdx >= 0 ? String(row[currIdx]) : "USD"),
  }));
}

export async function getCostsByService(
  token: string,
  subscriptionId: string,
  timeframe: "MonthToDate" | "TheLastMonth" = "MonthToDate"
): Promise<{ serviceName: string; cost: number }[]> {
  const response = await azureFetch<CostQueryResponse>(
    token,
    `/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query`,
    {
      method: "POST",
      apiVersion: "2023-11-01",
      body: {
        type: "Usage",
        timeframe,
        dataset: {
          aggregation: {
            totalCost: { name: "PreTaxCost", function: "Sum" },
          },
          grouping: [{ type: "Dimension", name: "ServiceName" }],
        },
      },
    }
  );

  const cols = response.properties.columns;
  const costIdx = cols.findIndex((c) => c.name === "PreTaxCost");
  const serviceIdx = cols.findIndex((c) => c.name === "ServiceName");

  return response.properties.rows
    .map((row) => ({
      serviceName: String(row[serviceIdx]),
      cost: Number(row[costIdx]),
    }))
    .sort((a, b) => b.cost - a.cost);
}

export async function getCostsByResourceGroup(
  token: string,
  subscriptionId: string,
  timeframe: "MonthToDate" | "TheLastMonth" = "MonthToDate"
): Promise<{ resourceGroup: string; cost: number }[]> {
  const response = await azureFetch<CostQueryResponse>(
    token,
    `/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query`,
    {
      method: "POST",
      apiVersion: "2023-11-01",
      body: {
        type: "Usage",
        timeframe,
        dataset: {
          aggregation: {
            totalCost: { name: "PreTaxCost", function: "Sum" },
          },
          grouping: [{ type: "Dimension", name: "ResourceGroupName" }],
        },
      },
    }
  );

  const cols = response.properties.columns;
  const costIdx = cols.findIndex((c) => c.name === "PreTaxCost");
  const rgIdx = cols.findIndex((c) => c.name === "ResourceGroupName");

  return response.properties.rows
    .map((row) => ({
      resourceGroup: String(row[rgIdx]),
      cost: Number(row[costIdx]),
    }))
    .sort((a, b) => b.cost - a.cost);
}

export async function getCostSummary(
  token: string,
  subscriptionId: string
): Promise<CostSummary> {
  const [dailyCosts, costByService, costByResourceGroup] = await Promise.all([
    getCostsByTimePeriod(token, subscriptionId, "MonthToDate", "Daily"),
    getCostsByService(token, subscriptionId),
    getCostsByResourceGroup(token, subscriptionId),
  ]);

  const totalCost = dailyCosts.reduce((sum, d) => sum + d.cost, 0);
  const currency = dailyCosts[0]?.currency || "USD";

  return {
    totalCost,
    currency,
    costByService,
    costByResourceGroup,
    dailyCosts,
  };
}
