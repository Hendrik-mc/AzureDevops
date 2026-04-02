"use client";

import { useState } from "react";
import { ProductSyncDashboard } from "@/shopify/components";
import { InventoryStatus } from "@/shopify/components";

export default function ShopifyDashboardPage() {
  // In production, this would come from session/URL params
  const [storeId] = useState("default-store");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Shopify Integration
        </h2>
        <p className="text-muted-foreground">
          Manage your Mission:Control product catalog and order fulfillment
        </p>
      </div>

      <ProductSyncDashboard storeId={storeId} />
      <InventoryStatus storeId={storeId} />
    </div>
  );
}
