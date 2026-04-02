"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, PackageCheck, PackageX, MapPin } from "lucide-react";

interface InventoryStatusProps {
  storeId: string;
}

export function InventoryStatus({ storeId }: InventoryStatusProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["shopify-inventory", storeId],
    queryFn: () =>
      fetch(`/api/shopify/inventory?storeId=${storeId}`).then((r) => r.json()),
    refetchInterval: 60000,
  });

  const refreshMutation = useMutation({
    mutationFn: () =>
      fetch("/api/shopify/inventory/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopify-inventory"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Inventory Status</CardTitle>
            <CardDescription>
              Stock levels from Mission:Control
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`}
            />
            Refresh Stock
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-md border p-3">
                <PackageCheck className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {data?.activeProducts ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">In Stock</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-md border p-3">
                <PackageX className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {data?.inactiveProducts ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Out of Stock</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-md border p-3">
                <MapPin className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {data?.regionId ?? "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">Region</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Total products: {data?.totalProducts ?? 0}
              </span>
              <span>
                Last check:{" "}
                {data?.lastStockCheck
                  ? new Date(data.lastStockCheck).toLocaleString()
                  : "Never"}
              </span>
            </div>

            {refreshMutation.data && (
              <div className="rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      refreshMutation.data.status === "success"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {refreshMutation.data.status}
                  </Badge>
                  <span className="text-sm">
                    Updated {refreshMutation.data.updated} products
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
