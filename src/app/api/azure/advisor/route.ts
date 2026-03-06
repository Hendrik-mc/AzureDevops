import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, getAzureToken } from "@/lib/auth";
import { getRecommendations, getCostRecommendations } from "@/lib/azure";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const token = getAzureToken(session);

    const { searchParams } = request.nextUrl;
    const subscriptionId = searchParams.get("subscriptionId");
    const category = searchParams.get("category");

    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });
    }

    if (category === "Cost") {
      const recs = await getCostRecommendations(token, subscriptionId);
      return NextResponse.json({ recommendations: recs });
    }

    const recs = await getRecommendations(token, subscriptionId);
    const filtered = category
      ? recs.filter((r) => r.category === category)
      : recs;

    return NextResponse.json({ recommendations: filtered });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch recommendations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
