import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, getAzureToken } from "@/lib/auth";
import { getActivityLogs, getChangeVelocity } from "@/lib/azure";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const token = getAzureToken(session);

    const { searchParams } = request.nextUrl;
    const subscriptionId = searchParams.get("subscriptionId");
    const days = parseInt(searchParams.get("days") || "7", 10);
    const view = searchParams.get("view");

    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });
    }

    if (view === "velocity") {
      const velocity = await getChangeVelocity(token, subscriptionId, days);
      return NextResponse.json({ changeVelocity: velocity });
    }

    const events = await getActivityLogs(token, subscriptionId, days);
    return NextResponse.json({ activityEvents: events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch activity logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
