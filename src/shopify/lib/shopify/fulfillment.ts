import type { Session } from "@shopify/shopify-api";
import { getGraphQLClient } from "./client";

const FULFILLMENT_CREATE_MUTATION = `
  mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
    fulfillmentCreateV2(fulfillment: $fulfillment) {
      fulfillment {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const GET_FULFILLMENT_ORDER_QUERY = `
  query getOrder($id: ID!) {
    order(id: $id) {
      fulfillmentOrders(first: 5) {
        edges {
          node {
            id
            status
            lineItems(first: 50) {
              edges {
                node {
                  id
                  remainingQuantity
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Create a digital fulfillment for a Shopify order.
 * Marks items as fulfilled since digital products are delivered instantly.
 */
export async function createDigitalFulfillment(
  session: Session,
  shopifyOrderId: string,
  notifyCustomer: boolean = true
): Promise<{ fulfillmentId: string; status: string }> {
  const client = getGraphQLClient(session);

  // Get the fulfillment order
  const orderResponse = await client.request(GET_FULFILLMENT_ORDER_QUERY, {
    variables: { id: shopifyOrderId },
  });

  const orderData = orderResponse.data as {
    order: {
      fulfillmentOrders: {
        edges: Array<{
          node: {
            id: string;
            status: string;
            lineItems: {
              edges: Array<{
                node: { id: string; remainingQuantity: number };
              }>;
            };
          };
        }>;
      };
    };
  };

  const fulfillmentOrders = orderData.order.fulfillmentOrders.edges
    .filter((e) => e.node.status === "OPEN" || e.node.status === "IN_PROGRESS")
    .map((e) => ({
      fulfillmentOrderId: e.node.id,
      fulfillmentOrderLineItems: e.node.lineItems.edges.map((li) => ({
        id: li.node.id,
        quantity: li.node.remainingQuantity,
      })),
    }));

  if (fulfillmentOrders.length === 0) {
    throw new Error(
      `No open fulfillment orders found for order ${shopifyOrderId}`
    );
  }

  const response = await client.request(FULFILLMENT_CREATE_MUTATION, {
    variables: {
      fulfillment: {
        lineItemsByFulfillmentOrder: fulfillmentOrders,
        notifyCustomer,
        trackingInfo: {
          company: "Digital Delivery",
          number: "Delivered instantly via Mission:Control",
        },
      },
    },
  });

  const data = response.data as {
    fulfillmentCreateV2: {
      fulfillment: { id: string; status: string } | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  };

  if (data.fulfillmentCreateV2.userErrors.length > 0) {
    const errors = data.fulfillmentCreateV2.userErrors
      .map((e) => e.message)
      .join(", ");
    throw new Error(`Failed to create fulfillment: ${errors}`);
  }

  const fulfillment = data.fulfillmentCreateV2.fulfillment;
  if (!fulfillment) {
    throw new Error("Fulfillment creation returned null");
  }

  return {
    fulfillmentId: fulfillment.id,
    status: fulfillment.status,
  };
}
