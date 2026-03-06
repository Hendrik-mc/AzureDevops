import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, getAzureToken } from "@/lib/auth";
import { getEnrichedRoleAssignments, getPrivilegedAssignments } from "@/lib/azure";

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

    if (view === "privileged") {
      const assignments = await getPrivilegedAssignments(token, subscriptionId);
      return NextResponse.json({ roleAssignments: assignments });
    }

    const assignments = await getEnrichedRoleAssignments(token, subscriptionId);
    return NextResponse.json({ roleAssignments: assignments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch role assignments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
