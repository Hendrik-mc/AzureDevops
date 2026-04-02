import type { Session } from "@shopify/shopify-api";
import { getRestClient } from "./client";

export type WebhookTopic =
  | "orders/create"
  | "orders/paid"
  | "orders/cancelled"
  | "app/uninstalled"
  | "products/delete";

interface WebhookRegistration {
  topic: WebhookTopic;
  address: string;
  format: "json";
}

const REQUIRED_WEBHOOKS: WebhookTopic[] = [
  "orders/create",
  "orders/paid",
  "orders/cancelled",
  "app/uninstalled",
  "products/delete",
];

/**
 * Register all required webhooks for a store.
 */
export async function registerAllWebhooks(
  session: Session,
  baseUrl: string
): Promise<{ registered: string[]; failed: string[] }> {
  const registered: string[] = [];
  const failed: string[] = [];

  for (const topic of REQUIRED_WEBHOOKS) {
    try {
      await registerWebhook(session, {
        topic,
        address: `${baseUrl}/api/shopify/webhooks`,
        format: "json",
      });
      registered.push(topic);
    } catch (err) {
      console.error(`Failed to register webhook ${topic}:`, err);
      failed.push(topic);
    }
  }

  return { registered, failed };
}

/**
 * Register a single webhook.
 */
async function registerWebhook(
  session: Session,
  webhook: WebhookRegistration
): Promise<void> {
  const client = getRestClient(session);

  await client.post({
    path: "webhooks",
    data: {
      webhook: {
        topic: webhook.topic,
        address: webhook.address,
        format: webhook.format,
      },
    },
  });
}

/**
 * List all registered webhooks for a store.
 */
export async function listWebhooks(
  session: Session
): Promise<Array<{ id: string; topic: string; address: string }>> {
  const client = getRestClient(session);

  const response = await client.get({ path: "webhooks" });
  const body = response.body as {
    webhooks: Array<{ id: number; topic: string; address: string }>;
  };

  return body.webhooks.map((w) => ({
    id: String(w.id),
    topic: w.topic,
    address: w.address,
  }));
}

/**
 * Delete a webhook by ID.
 */
export async function deleteWebhook(
  session: Session,
  webhookId: string
): Promise<void> {
  const client = getRestClient(session);
  await client.delete({ path: `webhooks/${webhookId}` });
}

/**
 * Reconcile webhooks: ensure all required webhooks are registered,
 * remove stale ones pointing to old URLs.
 */
export async function reconcileWebhooks(
  session: Session,
  baseUrl: string
): Promise<void> {
  const existing = await listWebhooks(session);
  const expectedAddress = `${baseUrl}/api/shopify/webhooks`;

  // Delete stale webhooks pointing to wrong address
  for (const webhook of existing) {
    if (webhook.address !== expectedAddress) {
      await deleteWebhook(session, webhook.id);
    }
  }

  // Register missing webhooks
  const registeredTopics = existing
    .filter((w) => w.address === expectedAddress)
    .map((w) => w.topic);

  for (const topic of REQUIRED_WEBHOOKS) {
    if (!registeredTopics.includes(topic)) {
      await registerWebhook(session, {
        topic,
        address: expectedAddress,
        format: "json",
      });
    }
  }
}
