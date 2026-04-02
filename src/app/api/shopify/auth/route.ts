import { NextRequest, NextResponse } from "next/server";
import { getShopifyApi } from "@/shopify/lib/shopify";

/**
 * GET /api/shopify/auth?shop=mystore.myshopify.com
 * Initiates the Shopify OAuth flow.
 */
export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get("shop");

  if (!shop) {
    return NextResponse.json(
      { error: "Missing 'shop' parameter" },
      { status: 400 }
    );
  }

  // Validate shop domain format
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) {
    return NextResponse.json(
      { error: "Invalid shop domain" },
      { status: 400 }
    );
  }

  try {
    const shopify = getShopifyApi();
    const authRoute = await shopify.auth.begin({
      shop,
      callbackPath: "/api/shopify/auth/callback",
      isOnline: false,
    });

    return NextResponse.redirect(authRoute);
  } catch (err) {
    console.error("OAuth begin failed:", err);
    return NextResponse.json(
      { error: "Failed to initiate OAuth" },
      { status: 500 }
    );
  }
}
