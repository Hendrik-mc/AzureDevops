import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/shopify/products?storeId=xxx&status=active
 * List synced products with their MC mapping status.
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
    if (status === "active") where.isActive = true;
    if (status === "inactive") where.isActive = false;

    const [products, totalCount] = await Promise.all([
      prisma.shopifyProductMap.findMany({
        where,
        skip: page * pageSize,
        take: pageSize,
        orderBy: { lastSyncedAt: "desc" },
      }),
      prisma.shopifyProductMap.count({ where }),
    ]);

    return NextResponse.json({
      data: products,
      pageIndex: page,
      pageSize,
      totalCount,
      hasMore: (page + 1) * pageSize < totalCount,
    });
  } catch (err) {
    console.error("Failed to fetch products:", err);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
