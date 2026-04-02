import type { Session } from "@shopify/shopify-api";
import { prisma } from "@/lib/db";
import { checkStockBulk, invalidateProductCache } from "../mission-control";
import { unpublishShopifyProduct, publishShopifyProduct } from "../shopify";
import type { SyncResult } from "../../types";

/**
 * Refresh inventory/stock levels for all active products in a store.
 * Checks MC stock availability and updates Shopify product status.
 */
export async function refreshInventory(
  storeId: string,
  session: Session
): Promise<SyncResult> {
  const result: SyncResult = {
    type: "stock_update",
    status: "success",
    created: 0,
    updated: 0,
    deactivated: 0,
    errors: [],
  };

  try {
    const config = await prisma.shopifyPluginConfig.findUnique({
      where: { storeId },
    });

    if (!config?.regionId) {
      result.status = "error";
      result.errors.push({
        productId: "global",
        message: "No region configured for stock checks",
      });
      return result;
    }

    // Get all active product mappings
    const activeProducts = await prisma.shopifyProductMap.findMany({
      where: { storeId, isActive: true },
    });

    if (activeProducts.length === 0) return result;

    // Invalidate cache to get fresh stock data
    invalidateProductCache();

    // Bulk stock check
    const mcProductIds = activeProducts.map((p) => p.mcProductId);
    const stockResults = await checkStockBulk(mcProductIds, config.regionId);

    const stockByProductId = new Map(
      stockResults.map((s) => [s.productId, s.hasStock])
    );

    // Update Shopify product status based on stock
    for (const product of activeProducts) {
      const hasStock = stockByProductId.get(product.mcProductId) ?? false;

      try {
        if (hasStock) {
          await publishShopifyProduct(session, product.shopifyProductId);
        } else {
          await unpublishShopifyProduct(session, product.shopifyProductId);
          result.deactivated++;
        }
        result.updated++;
      } catch (err) {
        result.errors.push({
          productId: product.mcProductId,
          message: err instanceof Error ? err.message : "Stock update failed",
        });
      }
    }

    result.status = result.errors.length > 0 ? "partial" : "success";
  } catch (err) {
    result.status = "error";
    result.errors.push({
      productId: "global",
      message: err instanceof Error ? err.message : "Inventory refresh failed",
    });
  }

  // Log result
  await prisma.shopifySyncLog.create({
    data: {
      storeId,
      type: result.type,
      status: result.status,
      details: JSON.stringify({
        updated: result.updated,
        deactivated: result.deactivated,
        errors: result.errors,
      }),
      itemCount: result.updated,
    },
  });

  return result;
}

/**
 * Get current inventory status summary for a store.
 */
export async function getInventoryStatus(storeId: string) {
  const config = await prisma.shopifyPluginConfig.findUnique({
    where: { storeId },
  });

  const totalProducts = await prisma.shopifyProductMap.count({
    where: { storeId },
  });

  const activeProducts = await prisma.shopifyProductMap.count({
    where: { storeId, isActive: true },
  });

  const lastSync = await prisma.shopifySyncLog.findFirst({
    where: { storeId, type: "stock_update" },
    orderBy: { createdAt: "desc" },
  });

  return {
    totalProducts,
    activeProducts,
    inactiveProducts: totalProducts - activeProducts,
    regionId: config?.regionId ?? null,
    lastStockCheck: lastSync?.createdAt ?? null,
    lastStockStatus: lastSync?.status ?? null,
  };
}
