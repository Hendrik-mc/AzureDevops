import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/shopify/orders?storeId=xxx&status=fulfilled
 * List orders with their MC fulfillment status.
 */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("storeId");
  const status = request.nextUrl.searchParams.get("status");
  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "0", 10);
  const pageSize = parseInt(
    request.nextUrl.searchParams.get("pageSize") ?? "50",
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
    if (status) where.status = status;

    const [orders, totalCount] = await Promise.all([
      prisma.shopifyOrderMap.findMany({
        where,
        skip: page * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.shopifyOrderMap.count({ where }),
    ]);

    return NextResponse.json({
      data: orders,
      pageIndex: page,
      pageSize,
      totalCount,
      hasMore: (page + 1) * pageSize < totalCount,
    });
  } catch (err) {
    console.error("Failed to fetch orders:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
