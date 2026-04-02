import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { retryFailedOrder } from "@/shopify/lib/services";

/**
 * POST /api/shopify/orders/[id]/retry
 * Retry a failed order.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { storeId } = body;

    if (!storeId) {
      return NextResponse.json(
        { error: "Missing storeId" },
        { status: 400 }
      );
    }

    const store = await prisma.shopifyStore.findUnique({
      where: { id: storeId },
    });

    if (!store || !store.isActive) {
      return NextResponse.json(
        { error: "Store not found or inactive" },
        { status: 404 }
      );
    }

    const session = {
      shop: store.shopDomain,
      accessToken: store.accessToken,
      scope: store.scopes,
      isOnline: false,
      state: "",
      isActive: () => true,
    } as any;

    const result = await retryFailedOrder(storeId, params.id, session);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Order retry failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Order retry failed" },
      { status: 500 }
    );
  }
}
