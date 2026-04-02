import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listProducts } from "@/shopify/lib/mission-control";

/**
 * GET /api/shopify/health?storeId=xxx
 * Check MC API connectivity and plugin health.
 */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("storeId");

  // MC connectivity check
  let mcConnected = false;
  let mcLatencyMs = 0;
  let mcEnvironment = "unknown";

  try {
    const start = Date.now();
    await listProducts({ pageSize: 1 });
    mcLatencyMs = Date.now() - start;
    mcConnected = true;

    const config = storeId
      ? await prisma.shopifyPluginConfig.findUnique({ where: { storeId } })
      : null;
    mcEnvironment = config?.mcEnvironment ?? "sandbox";
  } catch {
    mcConnected = false;
  }

  // Store health
  let storeDomain = "not configured";
  let storeConnected = false;
  let pendingOrders = 0;
  let lastSync: string | null = null;

  if (storeId) {
    try {
      const store = await prisma.shopifyStore.findUnique({
        where: { id: storeId },
      });
      if (store) {
        storeDomain = store.shopDomain;
        storeConnected = store.isActive;
      }

      pendingOrders = await prisma.shopifyOrderMap.count({
        where: { storeId, status: { in: ["pending", "reserved"] } },
      });

      const lastSyncLog = await prisma.shopifySyncLog.findFirst({
        where: { storeId },
        orderBy: { createdAt: "desc" },
      });
      lastSync = lastSyncLog?.createdAt.toISOString() ?? null;
    } catch {
      // Store queries failed
    }
  }

  return NextResponse.json({
    missionControl: {
      connected: mcConnected,
      latencyMs: mcLatencyMs,
      environment: mcEnvironment,
    },
    shopify: {
      connected: storeConnected,
      storeDomain,
    },
    lastSync,
    pendingOrders,
  });
}
