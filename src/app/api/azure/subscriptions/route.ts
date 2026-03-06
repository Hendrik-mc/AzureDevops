import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, getAzureToken } from "@/lib/auth";
import { azureFetch } from "@/lib/azure/client";

interface SubscriptionListResponse {
  value: {
    subscriptionId: string;
    displayName: string;
    state: string;
    tenantId: string;
  }[];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const token = getAzureToken(session);

    const response = await azureFetch<SubscriptionListResponse>(
      token,
      "/subscriptions",
      { apiVersion: "2022-12-01" }
    );

    return NextResponse.json({
      subscriptions: response.value.map((s) => ({
        subscriptionId: s.subscriptionId,
        displayName: s.displayName,
        state: s.state,
        tenantId: s.tenantId,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch subscriptions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
