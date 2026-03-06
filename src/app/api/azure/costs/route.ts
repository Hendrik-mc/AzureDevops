import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, getAzureToken } from "@/lib/auth";
import { getCostSummary, getCostsByTimePeriod, getCostsByService, getCostsByResourceGroup } from "@/lib/azure";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const token = getAzureToken(session);

    const { searchParams } = request.nextUrl;
    const subscriptionId = searchParams.get("subscriptionId");
    const view = searchParams.get("view");

    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });
    }

    if (view === "byService") {
      const data = await getCostsByService(token, subscriptionId);
      return NextResponse.json({ costByService: data });
    }

    if (view === "byResourceGroup") {
      const data = await getCostsByResourceGroup(token, subscriptionId);
      return NextResponse.json({ costByResourceGroup: data });
    }

    if (view === "daily") {
      const timeframe = (searchParams.get("timeframe") as "MonthToDate" | "TheLastMonth") || "MonthToDate";
      const data = await getCostsByTimePeriod(token, subscriptionId, timeframe, "Daily");
      return NextResponse.json({ dailyCosts: data });
    }

    const summary = await getCostSummary(token, subscriptionId);
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch costs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
