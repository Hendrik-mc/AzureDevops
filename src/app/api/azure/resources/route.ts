import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, getAzureToken } from "@/lib/auth";
import { getResources, getResourceCounts, getTagCoverage, searchResources } from "@/lib/azure";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const token = getAzureToken(session);

    const { searchParams } = request.nextUrl;
    const subscriptionIds = searchParams.get("subscriptions")?.split(",") || [];
    const search = searchParams.get("search");
    const view = searchParams.get("view");

    if (subscriptionIds.length === 0) {
      return NextResponse.json({ error: "No subscriptions provided" }, { status: 400 });
    }

    if (search) {
      const results = await searchResources(token, subscriptionIds, search);
      return NextResponse.json({ resources: results });
    }

    if (view === "counts") {
      const counts = await getResourceCounts(token, subscriptionIds);
      return NextResponse.json({ counts });
    }

    if (view === "tags") {
      const coverage = await getTagCoverage(token, subscriptionIds);
      return NextResponse.json({ tagCoverage: coverage });
    }

    const resources = await getResources(token, subscriptionIds);
    return NextResponse.json({ resources });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch resources";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
