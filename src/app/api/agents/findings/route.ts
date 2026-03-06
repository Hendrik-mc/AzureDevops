import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recentRuns = await prisma.agentRun.findMany({
      where: { status: "completed" },
      orderBy: { completedAt: "desc" },
      take: 20,
    });

    const findings = recentRuns
      .filter((run) => run.output)
      .flatMap((run) => {
        try {
          const output = JSON.parse(run.output!);
          return output.findings || [];
        } catch {
          return [];
        }
      });

    return NextResponse.json({ findings, totalRuns: recentRuns.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch findings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
