import { v4 as uuidv4 } from "crypto";
import { getMCClient, mcApiCall } from "./client";
import type { MCOrder, MCOrderData } from "../../types";

/**
 * Claim a reservation and convert it into a confirmed order.
 */
export async function claimReservation(
  reservationId: string,
  orderData: MCOrderData
): Promise<MCOrder> {
  const client = getMCClient();

  const result = await mcApiCall(() =>
    client.order.claimReservation
      .byReservationId(reservationId)
      .post(orderData)
  );

  return {
    orderId: result?.orderId as string,
    reservationId,
    status: "confirmed",
  };
}

/**
 * Build MCOrderData from a Shopify order.
 */
export function buildOrderData(params: {
  partnerReference: string;
  customerIp: string;
  customerLanguage: string;
  customerCountry: string;
  customerRegion?: string;
  priceIncludingVat: number;
  vatPercentage: number;
  vatAmount: number;
  salesChannel?: string[];
}): MCOrderData {
  return {
    requestId: generateRequestId(),
    partnerReference: params.partnerReference,
    invoiceDate: new Date().toISOString(),
    salesChannel: params.salesChannel ?? ["shopify"],
    endConsumer: {
      ipAddress: params.customerIp,
      language: params.customerLanguage,
      location: {
        country: params.customerCountry,
        region: params.customerRegion,
      },
    },
    salesPrice: {
      priceIncludingVat: params.priceIncludingVat,
      vatDetail: {
        vatPercentage: params.vatPercentage,
        vatAmount: params.vatAmount,
      },
    },
  };
}

/**
 * Generate a unique request ID for idempotent order creation.
 */
function generateRequestId(): string {
  return crypto.randomUUID();
}
