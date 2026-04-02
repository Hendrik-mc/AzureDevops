import { getMCClient, mcApiCall } from "./client";
import { TTLCache } from "../../types";
import type { MCProduct, MCStockCheck } from "../../types";

const productCache = new TTLCache<MCProduct[]>(5 * 60 * 1000); // 5 min
const stockCache = new TTLCache<boolean>(60 * 1000); // 1 min

export interface ListProductsOptions {
  publisherId?: string[];
  name?: string;
  pageSize?: number;
  pageIndex?: number;
}

/**
 * List products from Mission:Control catalog.
 */
export async function listProducts(
  options: ListProductsOptions = {}
): Promise<MCProduct[]> {
  const cacheKey = JSON.stringify(options);
  const cached = productCache.get(cacheKey);
  if (cached) return cached;

  const client = getMCClient();

  const result = await mcApiCall(() =>
    client.product.get({
      queryParameters: {
        publisherId: options.publisherId,
        name: options.name,
        pageSize: options.pageSize ?? 100,
        pageIndex: options.pageIndex ?? 0,
      },
    })
  );

  const products: MCProduct[] = (result?.value ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    name: p.name as string,
    publisherId: p.publisherId as string,
    description: p.description as string | undefined,
    metadata: p.metadata as Record<string, unknown> | undefined,
  }));

  productCache.set(cacheKey, products);
  return products;
}

/**
 * Fetch all products across all pages.
 */
export async function listAllProducts(
  publisherId?: string[]
): Promise<MCProduct[]> {
  const allProducts: MCProduct[] = [];
  let pageIndex = 0;
  const pageSize = 100;

  while (true) {
    const page = await listProducts({ publisherId, pageSize, pageIndex });
    allProducts.push(...page);
    if (page.length < pageSize) break;
    pageIndex++;
  }

  return allProducts;
}

/**
 * Check stock availability for a product in a region.
 */
export async function checkStock(
  productId: string,
  regionId: string
): Promise<MCStockCheck> {
  const cacheKey = `${productId}:${regionId}`;
  const cached = stockCache.get(cacheKey);
  if (cached !== undefined) {
    return { productId, regionId, hasStock: cached };
  }

  const client = getMCClient();

  const result = await mcApiCall(() =>
    client.product.hasStock.post({ productId, regionId })
  );

  const hasStock = Boolean(result?.hasStock);
  stockCache.set(cacheKey, hasStock);

  return { productId, regionId, hasStock };
}

/**
 * Check stock for multiple products in bulk.
 */
export async function checkStockBulk(
  productIds: string[],
  regionId: string
): Promise<MCStockCheck[]> {
  const results = await Promise.allSettled(
    productIds.map((id) => checkStock(id, regionId))
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { productId: productIds[i], regionId, hasStock: false }
  );
}

/**
 * Invalidate all product caches.
 */
export function invalidateProductCache(): void {
  productCache.clear();
  stockCache.clear();
}
