import type { Session } from "@shopify/shopify-api";
import { prisma } from "@/lib/db";
import { listAllProducts, checkStockBulk, invalidateProductCache } from "../mission-control";
import { createShopifyProduct, unpublishShopifyProduct, publishShopifyProduct } from "../shopify";
import type { SyncResult, SyncError, MCProduct } from "../../types";

/**
 * Synchronize Mission:Control product catalog with a Shopify store.
 *
 * Flow:
 * 1. Fetch all MC products
 * 2. Compare with existing ShopifyProductMap entries
 * 3. Create new products, update existing, deactivate removed
 * 4. Update stock levels
 * 5. Log results
 */
export async function syncProducts(
  storeId: string,
  session: Session
): Promise<SyncResult> {
  const result: SyncResult = {
    type: "product_sync",
    status: "success",
    created: 0,
    updated: 0,
    deactivated: 0,
    errors: [],
  };

  try {
    // Fetch store config
    const storeConfig = await prisma.shopifyPluginConfig.findUnique({
      where: { storeId },
    });

    // Fetch all MC products
    invalidateProductCache();
    const mcProducts = await listAllProducts();

    // Fetch existing mappings
    const existingMaps = await prisma.shopifyProductMap.findMany({
      where: { storeId, isActive: true },
    });

    const existingByMcId = new Map(
      existingMaps.map((m) => [m.mcProductId, m])
    );
    const mcProductIds = new Set(mcProducts.map((p) => p.id));

    // Create new products
    for (const mcProduct of mcProducts) {
      if (existingByMcId.has(mcProduct.id)) continue;

      try {
        const price = calculatePrice(0, storeConfig?.defaultMarkup ?? 0);
        const { productId, variantId } = await createShopifyProduct(
          session,
          mcProduct,
          price
        );

        await prisma.shopifyProductMap.create({
          data: {
            storeId,
            mcProductId: mcProduct.id,
            shopifyProductId: productId,
            shopifyVariantId: variantId,
            lastSyncedAt: new Date(),
          },
        });

        result.created++;
      } catch (err) {
        result.errors.push({
          productId: mcProduct.id,
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // Deactivate products no longer in MC catalog
    for (const [mcId, mapping] of existingByMcId) {
      if (!mcProductIds.has(mcId)) {
        try {
          await unpublishShopifyProduct(session, mapping.shopifyProductId);
          await prisma.shopifyProductMap.update({
            where: { id: mapping.id },
            data: { isActive: false },
          });
          result.deactivated++;
        } catch (err) {
          result.errors.push({
            productId: mcId,
            message: `Deactivation failed: ${err instanceof Error ? err.message : "Unknown"}`,
          });
        }
      }
    }

    // Update stock levels
    if (storeConfig?.regionId) {
      const activeProductIds = mcProducts
        .filter((p) => existingByMcId.has(p.id) || result.created > 0)
        .map((p) => p.id);

      const stockResults = await checkStockBulk(
        activeProductIds,
        storeConfig.regionId
      );

      for (const stock of stockResults) {
        const mapping = existingByMcId.get(stock.productId);
        if (!mapping) continue;

        try {
          if (!stock.hasStock) {
            await unpublishShopifyProduct(session, mapping.shopifyProductId);
          } else {
            await publishShopifyProduct(session, mapping.shopifyProductId);
          }
          result.updated++;
        } catch (err) {
          result.errors.push({
            productId: stock.productId,
            message: `Stock update failed: ${err instanceof Error ? err.message : "Unknown"}`,
          });
        }
      }
    }

    // Update sync timestamps
    await prisma.shopifyProductMap.updateMany({
      where: {
        storeId,
        mcProductId: { in: mcProducts.map((p) => p.id) },
        isActive: true,
      },
      data: { lastSyncedAt: new Date() },
    });

    result.status = result.errors.length > 0 ? "partial" : "success";
  } catch (err) {
    result.status = "error";
    result.errors.push({
      productId: "global",
      message: err instanceof Error ? err.message : "Sync failed",
    });
  }

  // Log sync result
  await prisma.shopifySyncLog.create({
    data: {
      storeId,
      type: result.type,
      status: result.status,
      details: JSON.stringify({
        created: result.created,
        updated: result.updated,
        deactivated: result.deactivated,
        errors: result.errors,
      }),
      itemCount: result.created + result.updated + result.deactivated,
    },
  });

  return result;
}

/**
 * Calculate Shopify price with markup.
 */
function calculatePrice(basePrice: number, markupPercent: number): string {
  const price = basePrice * (1 + markupPercent / 100);
  return price.toFixed(2);
}
