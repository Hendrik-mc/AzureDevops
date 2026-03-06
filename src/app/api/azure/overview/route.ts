import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, getAzureToken } from "@/lib/auth";
import { fetchAllDashboardData } from "@/lib/azure";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const token = getAzureToken(session);

    const { searchParams } = request.nextUrl;
    const subscriptionId = searchParams.get("subscriptionId");

    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });
    }

    const data = await fetchAllDashboardData(token, subscriptionId);

    return NextResponse.json({
      subscriptionId,
      lastRefreshed: new Date().toISOString(),
      ...data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch overview data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
