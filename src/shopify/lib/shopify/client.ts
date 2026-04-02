import "@shopify/shopify-api/adapters/node";
import {
  shopifyApi,
  LATEST_API_VERSION,
  type Shopify,
  type Session,
} from "@shopify/shopify-api";
import { getPluginConfig } from "../../config";

let _shopify: Shopify | null = null;

/**
 * Get or create the Shopify API client instance.
 */
export function getShopifyApi(): Shopify {
  if (_shopify) return _shopify;

  const config = getPluginConfig();

  _shopify = shopifyApi({
    apiKey: config.shopify.apiKey,
    apiSecretKey: config.shopify.apiSecret,
    scopes: config.shopify.scopes,
    hostName: new URL(config.shopify.appUrl).hostname,
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: true,
  });

  return _shopify;
}

/**
 * Create an authenticated REST client for a store session.
 */
export function getRestClient(session: Session) {
  const shopify = getShopifyApi();
  return new shopify.clients.Rest({ session });
}

/**
 * Create an authenticated GraphQL client for a store session.
 */
export function getGraphQLClient(session: Session) {
  const shopify = getShopifyApi();
  return new shopify.clients.Graphql({ session });
}

/**
 * Build the OAuth authorization URL.
 */
export async function getAuthUrl(shop: string, redirectPath: string): Promise<string> {
  const shopify = getShopifyApi();
  const config = getPluginConfig();

  const authRoute = await shopify.auth.begin({
    shop,
    callbackPath: redirectPath,
    isOnline: false,
  });

  return authRoute;
}

/**
 * Complete the OAuth flow and return the session.
 */
export async function handleAuthCallback(request: Request): Promise<Session> {
  const shopify = getShopifyApi();

  const callback = await shopify.auth.callback({
    rawRequest: request,
  });

  return callback.session;
}

/**
 * Verify a Shopify webhook HMAC signature.
 */
export async function verifyWebhookHmac(
  body: string,
  hmacHeader: string
): Promise<boolean> {
  const config = getPluginConfig();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(config.shopify.apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );
  const computed = Buffer.from(signature).toString("base64");
  return computed === hmacHeader;
}

/** Reset singleton (for testing) */
export function resetShopifyApi(): void {
  _shopify = null;
}
