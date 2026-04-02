"use client";

import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, RotateCcw } from "lucide-react";

interface OrdersViewProps {
  storeId: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  reserved: "bg-blue-100 text-blue-800",
  fulfilled: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export function OrdersView({ storeId }: OrdersViewProps) {
  const [activeTab, setActiveTab] = useState("all");
  const queryClient = useQueryClient();

  const statusFilter = activeTab === "all" ? undefined : activeTab;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["shopify-orders", storeId, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ storeId, pageSize: "50" });
      if (statusFilter) params.set("status", statusFilter);
      return fetch(`/api/shopify/orders?${params}`).then((r) => r.json());
    },
  });

  const retryMutation = useMutation({
    mutationFn: (orderMapId: string) =>
      fetch(`/api/shopify/orders/${orderMapId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopify-orders"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Orders</CardTitle>
            <CardDescription>
              Mission:Control order fulfillment status
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="reserved">Reserved</TabsTrigger>
            <TabsTrigger value="fulfilled">Fulfilled</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data?.data?.length > 0 ? (
              <div className="space-y-2">
                {data.data.map(
                  (order: {
                    id: string;
                    shopifyOrderId: string;
                    mcReservationId: string | null;
                    mcOrderId: string | null;
                    status: string;
                    partnerReference: string;
                    errorMessage: string | null;
                    createdAt: string;
                  }) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-md border px-4 py-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            Shopify #{order.shopifyOrderId}
                          </span>
                          <Badge
                            className={STATUS_COLORS[order.status] ?? ""}
                            variant="outline"
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          {order.mcReservationId && (
                            <span>Reservation: {order.mcReservationId}</span>
                          )}
                          {order.mcOrderId && (
                            <span>MC Order: {order.mcOrderId}</span>
                          )}
                          <span>
                            {new Date(order.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {order.errorMessage && (
                          <p className="text-xs text-red-500">
                            {order.errorMessage}
                          </p>
                        )}
                      </div>
                      {order.status === "failed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryMutation.mutate(order.id)}
                          disabled={retryMutation.isPending}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Retry
                        </Button>
                      )}
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No orders found
              </p>
            )}

            {data?.totalCount > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                Showing {data.data.length} of {data.totalCount} orders
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
