"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package } from "lucide-react";

export default function ShopifyProductsPage() {
  const [storeId] = useState("default-store");
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(0);

  const statusFilter = activeTab === "all" ? undefined : activeTab;

  const { data, isLoading } = useQuery({
    queryKey: ["shopify-products-list", storeId, statusFilter, page],
    queryFn: () => {
      const params = new URLSearchParams({
        storeId,
        page: String(page),
        pageSize: "25",
      });
      if (statusFilter) params.set("status", statusFilter);
      return fetch(`/api/shopify/products?${params}`).then((r) => r.json());
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Products</h2>
        <p className="text-muted-foreground">
          Mission:Control products synced to your Shopify store
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Catalog
          </CardTitle>
          <CardDescription>
            {data?.totalCount ?? 0} total products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : data?.data?.length > 0 ? (
                <>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2 text-left font-medium">
                            MC Product ID
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Shopify Product
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Status
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Last Synced
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.data.map(
                          (product: {
                            id: string;
                            mcProductId: string;
                            shopifyProductId: string;
                            isActive: boolean;
                            lastSyncedAt: string;
                          }) => (
                            <tr key={product.id} className="border-b">
                              <td className="px-4 py-2 font-mono text-xs">
                                {product.mcProductId}
                              </td>
                              <td className="px-4 py-2 font-mono text-xs">
                                {product.shopifyProductId}
                              </td>
                              <td className="px-4 py-2">
                                <Badge
                                  variant={
                                    product.isActive ? "default" : "secondary"
                                  }
                                >
                                  {product.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </td>
                              <td className="px-4 py-2 text-muted-foreground">
                                {new Date(
                                  product.lastSyncedAt
                                ).toLocaleString()}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {page + 1} of{" "}
                      {Math.ceil((data.totalCount ?? 0) / 25)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Previous
                      </button>
                      <button
                        className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                        disabled={!data.hasMore}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No products found. Run a sync to import products from
                  Mission:Control.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
