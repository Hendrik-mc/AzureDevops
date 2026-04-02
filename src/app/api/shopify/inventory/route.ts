import { NextRequest, NextResponse } from "next/server";
import { getInventoryStatus } from "@/shopify/lib/services";

/**
 * GET /api/shopify/inventory?storeId=xxx
 * Get current inventory status summary.
 */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("storeId");

  if (!storeId) {
    return NextResponse.json(
      { error: "Missing storeId" },
      { status: 400 }
    );
  }

  try {
    const status = await getInventoryStatus(storeId);
    return NextResponse.json(status);
  } catch (err) {
    console.error("Failed to get inventory status:", err);
    return NextResponse.json(
      { error: "Failed to get inventory status" },
      { status: 500 }
    );
  }
}
