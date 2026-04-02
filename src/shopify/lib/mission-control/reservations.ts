import { getMCClient, mcApiCall } from "./client";
import type { MCReservation } from "../../types";

/**
 * Create a reservation for a product in a specific region.
 * Reserves stock before order payment is confirmed.
 */
export async function createReservation(
  productId: string,
  regionId: string
): Promise<MCReservation> {
  const client = getMCClient();

  const result = await mcApiCall(() =>
    client.reservation.post({ productId, regionId })
  );

  return {
    reservationId: result?.reservationId as string,
    productId,
    regionId,
    createdAt: new Date().toISOString(),
    expiresAt: result?.expiresAt as string | undefined,
  };
}

/**
 * Cancel an existing reservation, releasing the stock.
 */
export async function cancelReservation(
  reservationId: string
): Promise<void> {
  const client = getMCClient();

  await mcApiCall(() =>
    client.reservation.byReservationId(reservationId).cancel.post()
  );
}

/**
 * Cancel multiple reservations. Returns IDs that failed to cancel.
 */
export async function cancelReservationsBulk(
  reservationIds: string[]
): Promise<string[]> {
  const results = await Promise.allSettled(
    reservationIds.map((id) => cancelReservation(id))
  );

  return results
    .map((r, i) => (r.status === "rejected" ? reservationIds[i] : null))
    .filter((id): id is string => id !== null);
}
