"use client";

import { useState } from "react";
import { OrdersView } from "@/shopify/components";

export default function ShopifyOrdersPage() {
  const [storeId] = useState("default-store");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
        <p className="text-muted-foreground">
          Track Mission:Control order fulfillment status
        </p>
      </div>

      <OrdersView storeId={storeId} />
    </div>
  );
}
