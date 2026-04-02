import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/shopify/sync-logs?storeId=xxx&type=product_sync&limit=20
 * View sync history for a store.
 */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("storeId");
  const type = request.nextUrl.searchParams.get("type");
  const limit = parseInt(
    request.nextUrl.searchParams.get("limit") ?? "20",
    10
  );

  if (!storeId) {
    return NextResponse.json(
      { error: "Missing storeId" },
      { status: 400 }
    );
  }

  try {
    const where: Record<string, unknown> = { storeId };
    if (type) where.type = type;

    const logs = await prisma.shopifySyncLog.findMany({
      where,
      take: Math.min(limit, 100),
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: logs });
  } catch (err) {
    console.error("Failed to fetch sync logs:", err);
    return NextResponse.json(
      { error: "Failed to fetch sync logs" },
      { status: 500 }
    );
  }
}
