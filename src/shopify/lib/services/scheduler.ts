import cron from "node-cron";
import { prisma } from "@/lib/db";
import { syncProducts } from "./product-sync";
import { refreshInventory } from "./inventory";
import { cancelReservation } from "../mission-control";

let scheduledTasks: cron.ScheduledTask[] = [];

/**
 * Start all background jobs for the Shopify plugin.
 */
export function startScheduler(): void {
  stopScheduler(); // Clean up any existing tasks

  // Product sync — runs for each store with autoSync enabled
  scheduledTasks.push(
    cron.schedule("*/15 * * * *", async () => {
      console.log("[Scheduler] Running auto product sync check...");
      await runAutoSync();
    })
  );

  // Stock refresh — every 15 minutes
  scheduledTasks.push(
    cron.schedule("*/15 * * * *", async () => {
      console.log("[Scheduler] Running stock refresh...");
      await runStockRefresh();
    })
  );

  // Stale reservation cleanup — every 10 minutes
  scheduledTasks.push(
    cron.schedule("*/10 * * * *", async () => {
      console.log("[Scheduler] Running stale reservation cleanup...");
      await cleanupStaleReservations();
    })
  );

  console.log("[Scheduler] Shopify plugin background jobs started");
}

/**
 * Stop all background jobs.
 */
export function stopScheduler(): void {
  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks = [];
}

/**
 * Run product sync for all stores that have autoSync enabled
 * and are due for a sync based on their interval.
 */
async function runAutoSync(): Promise<void> {
  try {
    const stores = await prisma.shopifyStore.findMany({
      where: { isActive: true },
      include: { config: true },
    });

    for (const store of stores) {
      if (!store.config?.autoSync) continue;

      // Check if enough time has passed since last sync
      const lastSync = await prisma.shopifySyncLog.findFirst({
        where: { storeId: store.id, type: "product_sync" },
        orderBy: { createdAt: "desc" },
      });

      const intervalMs = (store.config.syncIntervalMins ?? 60) * 60 * 1000;
      const lastSyncTime = lastSync?.createdAt?.getTime() ?? 0;

      if (Date.now() - lastSyncTime < intervalMs) continue;

      const session = buildSession(store);
      await syncProducts(store.id, session);
      console.log(`[Scheduler] Product sync completed for ${store.shopDomain}`);
    }
  } catch (err) {
    console.error("[Scheduler] Auto sync error:", err);
  }
}

/**
 * Refresh stock levels for all active stores.
 */
async function runStockRefresh(): Promise<void> {
  try {
    const stores = await prisma.shopifyStore.findMany({
      where: { isActive: true },
      include: { config: true },
    });

    for (const store of stores) {
      if (!store.config?.regionId) continue;

      const session = buildSession(store);
      await refreshInventory(store.id, session);
      console.log(
        `[Scheduler] Stock refresh completed for ${store.shopDomain}`
      );
    }
  } catch (err) {
    console.error("[Scheduler] Stock refresh error:", err);
  }
}

/**
 * Cancel reservations that have been in "reserved" status for too long
 * without being claimed (payment not received).
 */
async function cleanupStaleReservations(): Promise<void> {
  const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  try {
    const staleOrders = await prisma.shopifyOrderMap.findMany({
      where: {
        status: "reserved",
        updatedAt: {
          lt: new Date(Date.now() - TIMEOUT_MS),
        },
      },
    });

    for (const order of staleOrders) {
      if (!order.mcReservationId) continue;

      try {
        await cancelReservation(order.mcReservationId);
        await prisma.shopifyOrderMap.update({
          where: { id: order.id },
          data: {
            status: "cancelled",
            errorMessage: "Reservation timed out (30 min)",
          },
        });
        console.log(
          `[Scheduler] Cancelled stale reservation: ${order.mcReservationId}`
        );
      } catch (err) {
        console.error(
          `[Scheduler] Failed to cancel reservation ${order.mcReservationId}:`,
          err
        );
      }
    }
  } catch (err) {
    console.error("[Scheduler] Stale reservation cleanup error:", err);
  }
}

/**
 * Build a minimal Shopify session from a store record.
 */
function buildSession(store: {
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
