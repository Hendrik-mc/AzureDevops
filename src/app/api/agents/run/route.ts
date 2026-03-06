import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, getAzureToken } from "@/lib/auth";
import { runAllAgents } from "@/lib/agents/engine";
import { fetchAllDashboardData } from "@/lib/azure";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const token = getAzureToken(session);

    const body = await request.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });
    }

    // Fetch all Azure data first
    const azureData = await fetchAllDashboardData(token, subscriptionId);

    // Prepare agent input with resolved data
    const agentData: Record<string, unknown> = {};
    for (const [key, result] of Object.entries(azureData)) {
      if (result.status === "success") {
        agentData[key] = result.data;
      }
    }

    const results = await runAllAgents({
      subscriptionId,
      tenantId: session?.user?.tenantId || "",
      data: agentData,
    });

    const totalFindings = results.reduce((sum, r) => sum + r.findings.length, 0);

    return NextResponse.json({
      results,
      summary: {
        totalAgents: results.length,
        completedAgents: results.filter((r) => r.status === "completed").length,
        totalFindings,
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run agents";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
