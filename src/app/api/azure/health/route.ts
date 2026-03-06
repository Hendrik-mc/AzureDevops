import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, getAzureToken } from "@/lib/auth";
import { getServiceHealthEvents, getResourceHealthStatuses, getUnavailableResources } from "@/lib/azure";

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

    if (view === "service") {
      const events = await getServiceHealthEvents(token, subscriptionId);
      return NextResponse.json({ healthEvents: events });
    }

    if (view === "unavailable") {
      const resources = await getUnavailableResources(token, subscriptionId);
      return NextResponse.json({ unavailableResources: resources });
    }

    const [healthEvents, resourceHealth] = await Promise.all([
      getServiceHealthEvents(token, subscriptionId),
      getResourceHealthStatuses(token, subscriptionId),
    ]);

    return NextResponse.json({ healthEvents, resourceHealth });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch health data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
