import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, getAzureToken } from "@/lib/auth";
import { getSecureScore, getSecurityAssessments, getUnhealthyAssessments } from "@/lib/azure";

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

    if (view === "score") {
      const score = await getSecureScore(token, subscriptionId);
      return NextResponse.json(score);
    }

    if (view === "unhealthy") {
      const findings = await getUnhealthyAssessments(token, subscriptionId);
      return NextResponse.json({ assessments: findings });
    }

    const [score, assessments] = await Promise.all([
      getSecureScore(token, subscriptionId),
      getSecurityAssessments(token, subscriptionId),
    ]);

    return NextResponse.json({ secureScore: score, assessments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch security data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
