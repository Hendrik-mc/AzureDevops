import type { Session } from "@shopify/shopify-api";
import { getGraphQLClient } from "./client";
import type { MCProduct } from "../../types";

interface CreateProductInput {
  title: string;
  bodyHtml?: string;
  productType?: string;
  vendor?: string;
  tags?: string[];
  variants?: Array<{
    price: string;
    sku?: string;
    inventoryManagement?: string;
    requiresShipping: boolean;
  }>;
  metafields?: Array<{
    namespace: string;
    key: string;
    value: string;
    type: string;
  }>;
}

const CREATE_PRODUCT_MUTATION = `
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        variants(first: 1) {
          edges {
            node {
              id
              inventoryItem {
                id
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const UPDATE_PRODUCT_MUTATION = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const GET_PRODUCT_QUERY = `
  query getProduct($id: ID!) {
    product(id: $id) {
      id
      title
      status
      variants(first: 10) {
        edges {
          node {
            id
            price
            sku
            inventoryItem {
              id
            }
          }
        }
      }
    }
  }
`;

/**
 * Create a Shopify product from a Mission:Control product.
 */
export async function createShopifyProduct(
  session: Session,
  mcProduct: MCProduct,
  price: string
): Promise<{ productId: string; variantId: string }> {
  const client = getGraphQLClient(session);

  const input: CreateProductInput = {
    title: mcProduct.name,
    bodyHtml: mcProduct.description ?? "",
    productType: "Digital Product",
    vendor: "Mission:Control",
    tags: ["mission-control", "digital", `mc-${mcProduct.id}`],
    variants: [
      {
        price,
        sku: `mc-${mcProduct.id}`,
        requiresShipping: false,
      },
    ],
    metafields: [
      {
        namespace: "mission_control",
        key: "product_id",
        value: mcProduct.id,
        type: "single_line_text_field",
      },
      {
        namespace: "mission_control",
        key: "publisher_id",
        value: mcProduct.publisherId,
        type: "single_line_text_field",
      },
    ],
  };

  const response = await client.request(CREATE_PRODUCT_MUTATION, {
    variables: { input },
  });

  const data = response.data as {
    productCreate: {
      product: {
        id: string;
        variants: { edges: Array<{ node: { id: string } }> };
      };
      userErrors: Array<{ field: string[]; message: string }>;
    };
  };

  if (data.productCreate.userErrors.length > 0) {
    const errors = data.productCreate.userErrors
      .map((e) => e.message)
      .join(", ");
    throw new Error(`Failed to create Shopify product: ${errors}`);
  }

  return {
    productId: data.productCreate.product.id,
    variantId: data.productCreate.product.variants.edges[0].node.id,
  };
}

/**
 * Update an existing Shopify product.
 */
export async function updateShopifyProduct(
  session: Session,
  shopifyProductId: string,
  updates: { title?: string; bodyHtml?: string; status?: string }
): Promise<void> {
  const client = getGraphQLClient(session);

  const input = {
    id: shopifyProductId,
    ...updates,
  };

  const response = await client.request(UPDATE_PRODUCT_MUTATION, {
    variables: { input },
  });

  const data = response.data as {
    productUpdate: {
      userErrors: Array<{ field: string[]; message: string }>;
    };
  };

  if (data.productUpdate.userErrors.length > 0) {
    const errors = data.productUpdate.userErrors
      .map((e) => e.message)
      .join(", ");
    throw new Error(`Failed to update Shopify product: ${errors}`);
  }
}

/**
 * Get a Shopify product by ID.
 */
export async function getShopifyProduct(
  session: Session,
  shopifyProductId: string
) {
  const client = getGraphQLClient(session);

  const response = await client.request(GET_PRODUCT_QUERY, {
    variables: { id: shopifyProductId },
  });

  return (response.data as { product: unknown }).product;
}

/**
 * Unpublish a Shopify product (set to draft).
 */
export async function unpublishShopifyProduct(
  session: Session,
  shopifyProductId: string
): Promise<void> {
  await updateShopifyProduct(session, shopifyProductId, { status: "DRAFT" });
}

/**
 * Republish a Shopify product (set to active).
 */
export async function publishShopifyProduct(
  session: Session,
  shopifyProductId: string
): Promise<void> {
  await updateShopifyProduct(session, shopifyProductId, { status: "ACTIVE" });
}
