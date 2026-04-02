import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookHmac } from "@/shopify/lib/shopify";
import { prisma } from "@/lib/db";
import {
  handleOrderCreated,
  handleOrderPaid,
  handleOrderCancelled,
} from "@/shopify/lib/services";

/**
 * POST /api/shopify/webhooks
 * Receives all Shopify webhooks, verifies HMAC, routes to handler.
 */
export async function POST(request: NextRequest) {
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");

  if (!hmac || !topic || !shopDomain) {
    return NextResponse.json(
      { error: "Missing required Shopify headers" },
      { status: 400 }
    );
  }

  // Read raw body for HMAC verification
  const rawBody = await request.text();

  // Verify HMAC
  const isValid = await verifyWebhookHmac(rawBody, hmac);
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid HMAC signature" },
      { status: 401 }
    );
  }

  // Find the store
  const store = await prisma.shopifyStore.findUnique({
    where: { shopDomain },
  });

  if (!store) {
    console.error(`Webhook received for unknown store: ${shopDomain}`);
    return NextResponse.json({ error: "Unknown store" }, { status: 404 });
  }

  const payload = JSON.parse(rawBody);

  try {
    switch (topic) {
      case "orders/create":
        await handleOrderCreated(store.id, payload);
        break;

      case "orders/paid":
        // For paid webhooks, we need a session to create fulfillments
        // Build a minimal session from stored credentials
        const session = buildSessionFromStore(store);
        await handleOrderPaid(store.id, session, payload);
        break;

      case "orders/cancelled":
        await handleOrderCancelled(store.id, String(payload.id));
        break;

      case "app/uninstalled":
        await prisma.shopifyStore.update({
          where: { id: store.id },
          data: { isActive: false },
        });
        break;

      case "products/delete":
        // Remove product mapping if a synced product is deleted from Shopify
        const shopifyProductId = `gid://shopify/Product/${payload.id}`;
        await prisma.shopifyProductMap.updateMany({
          where: {
            storeId: store.id,
            shopifyProductId,
          },
          data: { isActive: false },
        });
        break;

      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`Webhook handler error for ${topic}:`, err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Build a minimal Shopify session from stored credentials.
 */
function buildSessionFromStore(store: {
  shopDomain: string;
  accessToken: string;
  scopes: string;
}) {
  return {
    shop: store.shopDomain,
    accessToken: store.accessToken,
    scope: store.scopes,
    isOnline: false,
    state: "",
    isActive: () => true,
  } as any;
}
