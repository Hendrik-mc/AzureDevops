import { prisma } from "@/lib/db";
import { createReservation, cancelReservation, claimReservation, buildOrderData } from "../mission-control";
import { createDigitalFulfillment } from "../shopify";
import type { Session } from "@shopify/shopify-api";
import type { OrderFlowResult } from "../../types";

interface ShopifyOrderPayload {
  id: string;
  order_number: number;
  customer: {
    id: number;
    default_address?: {
      country_code: string;
      province_code?: string;
    };
  };
  browser_ip: string;
  customer_locale: string;
  line_items: Array<{
    product_id: number;
    variant_id: number;
    quantity: number;
    price: string;
    tax_lines: Array<{
      rate: number;
      price: string;
    }>;
  }>;
  total_price: string;
  total_tax: string;
  currency: string;
}

/**
 * Handle a new Shopify order: reserve MC products.
 * Called from the orders/create webhook.
 */
export async function handleOrderCreated(
  storeId: string,
  order: ShopifyOrderPayload
): Promise<OrderFlowResult[]> {
  const results: OrderFlowResult[] = [];

  // Find MC-mapped products in the order
  const mcLineItems = await findMCLineItems(storeId, order.line_items);

  if (mcLineItems.length === 0) {
    return results; // No MC products in this order
  }

  // Get store config for region
  const config = await prisma.shopifyPluginConfig.findUnique({
    where: { storeId },
  });
  const regionId = config?.regionId ?? "default";

  for (const item of mcLineItems) {
    const partnerReference = `shopify-${storeId}-${order.id}-${item.mcProductId}`;

    try {
      // Create reservation
      const reservation = await createReservation(item.mcProductId, regionId);

      // Store order mapping
      await prisma.shopifyOrderMap.create({
        data: {
          storeId,
          shopifyOrderId: String(order.id),
          mcReservationId: reservation.reservationId,
          status: "reserved",
          partnerReference,
        },
      });

      results.push({
        success: true,
        shopifyOrderId: String(order.id),
        mcReservationId: reservation.reservationId,
      });
    } catch (err) {
      // Store failed order for manual retry
      await prisma.shopifyOrderMap.create({
        data: {
          storeId,
          shopifyOrderId: String(order.id),
          status: "failed",
          partnerReference,
          errorMessage: err instanceof Error ? err.message : "Reservation failed",
        },
      });

      results.push({
        success: false,
        shopifyOrderId: String(order.id),
        error: err instanceof Error ? err.message : "Reservation failed",
      });
    }
  }

  return results;
}

/**
 * Handle order payment: claim reservations and fulfill.
 * Called from the orders/paid webhook.
 */
export async function handleOrderPaid(
  storeId: string,
  session: Session,
  order: ShopifyOrderPayload
): Promise<OrderFlowResult[]> {
  const results: OrderFlowResult[] = [];

  // Find all reservation mappings for this order
  const orderMaps = await prisma.shopifyOrderMap.findMany({
    where: {
      storeId,
      shopifyOrderId: String(order.id),
      status: "reserved",
    },
  });

  if (orderMaps.length === 0) return results;

  const customerCountry =
    order.customer?.default_address?.country_code ?? "US";
  const customerRegion =
    order.customer?.default_address?.province_code ?? undefined;

  for (const orderMap of orderMaps) {
    if (!orderMap.mcReservationId) continue;

    try {
      // Build order data from Shopify order info
      const totalTax = parseFloat(order.total_tax || "0");
      const totalPrice = parseFloat(order.total_price || "0");
      const vatPercentage = totalPrice > 0 ? (totalTax / totalPrice) * 100 : 0;

      const orderData = buildOrderData({
        partnerReference: orderMap.partnerReference,
        customerIp: order.browser_ip || "0.0.0.0",
        customerLanguage: order.customer_locale || "en",
        customerCountry,
        customerRegion,
        priceIncludingVat: totalPrice,
        vatPercentage,
        vatAmount: totalTax,
        salesChannel: ["shopify"],
      });

      // Claim the reservation
      const mcOrder = await claimReservation(
        orderMap.mcReservationId,
        orderData
      );

      // Update mapping with MC order ID
      await prisma.shopifyOrderMap.update({
        where: { id: orderMap.id },
        data: {
          mcOrderId: mcOrder.orderId,
          status: "fulfilled",
        },
      });

      // Create Shopify fulfillment
      try {
        await createDigitalFulfillment(
          session,
          `gid://shopify/Order/${order.id}`
        );
      } catch (fulfillErr) {
        console.error(
          `Fulfillment creation failed for order ${order.id}:`,
          fulfillErr
        );
        // Order is still considered successful from MC side
      }

      results.push({
        success: true,
        shopifyOrderId: String(order.id),
        mcReservationId: orderMap.mcReservationId,
        mcOrderId: mcOrder.orderId,
      });
    } catch (err) {
      await prisma.shopifyOrderMap.update({
        where: { id: orderMap.id },
        data: {
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Claim failed",
        },
      });

      results.push({
        success: false,
        shopifyOrderId: String(order.id),
        mcReservationId: orderMap.mcReservationId,
        error: err instanceof Error ? err.message : "Claim failed",
      });
    }
  }

  // Log fulfillment result
  await prisma.shopifySyncLog.create({
    data: {
      storeId,
      type: "order_fulfill",
      status: results.every((r) => r.success) ? "success" : "partial",
      details: JSON.stringify(results),
      itemCount: results.length,
    },
  });

  return results;
}

/**
 * Handle order cancellation: cancel MC reservations.
 */
export async function handleOrderCancelled(
  storeId: string,
  shopifyOrderId: string
): Promise<void> {
  const orderMaps = await prisma.shopifyOrderMap.findMany({
    where: {
      storeId,
      shopifyOrderId,
      status: { in: ["reserved", "pending"] },
    },
  });

  for (const orderMap of orderMaps) {
    if (orderMap.mcReservationId) {
      try {
        await cancelReservation(orderMap.mcReservationId);
      } catch (err) {
        console.error(
          `Failed to cancel reservation ${orderMap.mcReservationId}:`,
          err
        );
      }
    }

    await prisma.shopifyOrderMap.update({
      where: { id: orderMap.id },
      data: { status: "cancelled" },
    });
  }
}

/**
 * Retry a failed order by re-attempting reservation and fulfillment.
 */
export async function retryFailedOrder(
  storeId: string,
  orderMapId: string,
  session: Session
): Promise<OrderFlowResult> {
  const orderMap = await prisma.shopifyOrderMap.findUnique({
    where: { id: orderMapId },
  });

  if (!orderMap || orderMap.storeId !== storeId) {
    throw new Error("Order mapping not found");
  }

  if (orderMap.status !== "failed") {
    throw new Error(`Cannot retry order in status: ${orderMap.status}`);
  }

  const config = await prisma.shopifyPluginConfig.findUnique({
    where: { storeId },
  });
  const regionId = config?.regionId ?? "default";

  try {
    // Find the MC product from the partner reference
    const mcProductId = extractMcProductId(orderMap.partnerReference);
    if (!mcProductId) throw new Error("Cannot determine MC product ID");

    // Re-attempt reservation
    const reservation = await createReservation(mcProductId, regionId);

    await prisma.shopifyOrderMap.update({
      where: { id: orderMap.id },
      data: {
        mcReservationId: reservation.reservationId,
        status: "reserved",
        errorMessage: null,
      },
    });

    return {
      success: true,
      shopifyOrderId: orderMap.shopifyOrderId,
      mcReservationId: reservation.reservationId,
    };
  } catch (err) {
    await prisma.shopifyOrderMap.update({
      where: { id: orderMap.id },
      data: {
        errorMessage: err instanceof Error ? err.message : "Retry failed",
      },
    });

    return {
      success: false,
      shopifyOrderId: orderMap.shopifyOrderId,
      error: err instanceof Error ? err.message : "Retry failed",
    };
  }
}

/**
 * Find line items that correspond to MC-mapped products.
 */
async function findMCLineItems(
  storeId: string,
  lineItems: ShopifyOrderPayload["line_items"]
): Promise<Array<{ mcProductId: string; shopifyProductId: string; quantity: number }>> {
  const productIds = lineItems.map((li) => String(li.product_id));

  const mappings = await prisma.shopifyProductMap.findMany({
    where: {
      storeId,
      shopifyProductId: { in: productIds.map((id) => `gid://shopify/Product/${id}`) },
      isActive: true,
    },
  });

  return mappings.map((m) => ({
    mcProductId: m.mcProductId,
    shopifyProductId: m.shopifyProductId,
    quantity: lineItems.find(
      (li) => `gid://shopify/Product/${li.product_id}` === m.shopifyProductId
    )?.quantity ?? 1,
  }));
}

/**
 * Extract MC product ID from a partner reference string.
 */
function extractMcProductId(partnerReference: string): string | null {
  // Format: shopify-{storeId}-{orderId}-{mcProductId}
  const parts = partnerReference.split("-");
  return parts.length >= 4 ? parts.slice(3).join("-") : null;
}
