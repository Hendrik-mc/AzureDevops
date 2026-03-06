import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Fetch recent daily snapshots for all subscriptions
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const snapshots = await prisma.dailySnapshot.findMany({
      where: { date: { gte: sevenDaysAgo } },
      orderBy: { date: "desc" },
      include: { subscription: true },
    });

    // Aggregate by subscription
    const bySubscription: Record<string, typeof snapshots> = {};
    for (const s of snapshots) {
      const key = s.subscription.displayName;
      if (!bySubscription[key]) bySubscription[key] = [];
      bySubscription[key].push(s);
    }

    const weeklySummary = Object.entries(bySubscription).map(([name, snaps]) => {
      const latest = snaps[0];
      const oldest = snaps[snaps.length - 1];

      return {
        subscription: name,
        currentScore: latest?.secureScore,
        scoreChange: latest?.secureScore && oldest?.secureScore
          ? latest.secureScore - oldest.secureScore
          : null,
        currentCost: latest?.totalCost,
        costChange: latest?.totalCost && oldest?.totalCost
          ? latest.totalCost - oldest.totalCost
          : null,
        resourceCount: latest?.resourceCount,
        criticalFindings: latest?.criticalFindings,
      };
    });

    return NextResponse.json({
      weeklyReport: weeklySummary,
      period: {
        start: sevenDaysAgo.toISOString(),
        end: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate weekly report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
