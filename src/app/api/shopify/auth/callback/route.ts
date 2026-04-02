import { NextRequest, NextResponse } from "next/server";
import { getShopifyApi } from "@/shopify/lib/shopify";
import { registerAllWebhooks } from "@/shopify/lib/shopify/webhooks";
import { prisma } from "@/lib/db";
import { getPluginConfig } from "@/shopify/config";

/**
 * GET /api/shopify/auth/callback
 * Handles the Shopify OAuth callback, stores session, registers webhooks.
 */
export async function GET(request: NextRequest) {
  try {
    const shopify = getShopifyApi();
    const config = getPluginConfig();

    const callback = await shopify.auth.callback({
      rawRequest: request,
    });

    const session = callback.session;

    // Upsert the store record
    const store = await prisma.shopifyStore.upsert({
      where: { shopDomain: session.shop },
      update: {
        accessToken: session.accessToken ?? "",
        scopes: session.scope ?? "",
        isActive: true,
      },
      create: {
        shopDomain: session.shop,
        accessToken: session.accessToken ?? "",
        scopes: session.scope ?? "",
      },
    });

    // Create default config if not exists
    await prisma.shopifyPluginConfig.upsert({
      where: { storeId: store.id },
      update: {},
      create: {
        storeId: store.id,
        mcPartnerId: config.missionControl.partnerId,
        mcEnvironment: config.missionControl.environment,
      },
    });

    // Register webhooks
    const webhookResult = await registerAllWebhooks(
      session,
      config.shopify.appUrl
    );

    if (webhookResult.failed.length > 0) {
      console.warn("Some webhooks failed to register:", webhookResult.failed);
    }

    // Redirect to the plugin dashboard
    return NextResponse.redirect(
      new URL("/shopify", config.shopify.appUrl)
    );
  } catch (err) {
    console.error("OAuth callback failed:", err);
    return NextResponse.json(
      { error: "OAuth callback failed" },
      { status: 500 }
    );
  }
}
