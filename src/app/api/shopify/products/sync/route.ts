import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncProducts } from "@/shopify/lib/services";

/**
 * POST /api/shopify/products/sync
 * Trigger a manual product sync for a store.
 */
export async function POST(request: NextRequest) {
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

    // Build session from stored credentials
    const session = {
      shop: store.shopDomain,
      accessToken: store.accessToken,
      scope: store.scopes,
      isOnline: false,
      state: "",
      isActive: () => true,
    } as any;

    const result = await syncProducts(storeId, session);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Product sync failed:", err);
    return NextResponse.json(
      { error: "Product sync failed" },
      { status: 500 }
    );
  }
}
