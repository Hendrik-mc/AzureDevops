"use client";

import { useState } from "react";
import { SettingsForm } from "@/shopify/components";

export default function ShopifySettingsPage() {
  const [storeId] = useState("default-store");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Configure your Shopify plugin and Mission:Control connection
        </p>
      </div>

      <SettingsForm storeId={storeId} />
    </div>
  );
}
