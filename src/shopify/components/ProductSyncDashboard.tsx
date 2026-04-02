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
import {
  Package,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
} from "lucide-react";

interface ProductSyncDashboardProps {
  storeId: string;
}

export function ProductSyncDashboard({ storeId }: ProductSyncDashboardProps) {
  const queryClient = useQueryClient();

  // Health status
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ["shopify-health", storeId],
    queryFn: () =>
      fetch(`/api/shopify/health?storeId=${storeId}`).then((r) => r.json()),
    refetchInterval: 30000,
  });

  // Product count
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["shopify-products", storeId],
    queryFn: () =>
      fetch(`/api/shopify/products?storeId=${storeId}&pageSize=1`).then((r) =>
        r.json()
      ),
  });

  // Inventory status
  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["shopify-inventory", storeId],
    queryFn: () =>
      fetch(`/api/shopify/inventory?storeId=${storeId}`).then((r) => r.json()),
  });

  // Recent sync logs
  const { data: syncLogs } = useQuery({
    queryKey: ["shopify-sync-logs", storeId],
    queryFn: () =>
      fetch(`/api/shopify/sync-logs?storeId=${storeId}&limit=5`).then((r) =>
        r.json()
      ),
  });

  // Pending orders count
  const { data: orders } = useQuery({
    queryKey: ["shopify-orders-pending", storeId],
    queryFn: () =>
      fetch(
        `/api/shopify/orders?storeId=${storeId}&status=pending&pageSize=1`
      ).then((r) => r.json()),
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () =>
      fetch("/api/shopify/products/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopify-products"] });
      queryClient.invalidateQueries({ queryKey: ["shopify-sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["shopify-inventory"] });
    },
  });

  const isLoading = healthLoading || productsLoading || inventoryLoading;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Synced Products"
          value={products?.totalCount ?? 0}
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
          loading={isLoading}
        />
        <KPICard
          title="Active Products"
          value={inventory?.activeProducts ?? 0}
          icon={<CheckCircle className="h-4 w-4 text-green-500" />}
          loading={isLoading}
        />
        <KPICard
          title="Pending Orders"
          value={orders?.totalCount ?? 0}
          icon={<Clock className="h-4 w-4 text-yellow-500" />}
          loading={isLoading}
        />
        <KPICard
          title="MC API"
          value={health?.missionControl?.connected ? "Connected" : "Offline"}
          subtitle={
            health?.missionControl?.connected
              ? `${health.missionControl.latencyMs}ms`
              : undefined
          }
          icon={
            <Activity
              className={`h-4 w-4 ${health?.missionControl?.connected ? "text-green-500" : "text-red-500"}`}
            />
          }
          loading={isLoading}
        />
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Product Sync</CardTitle>
              <CardDescription>
                Synchronize Mission:Control catalog with your Shopify store
              </CardDescription>
            </div>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
              />
              {syncMutation.isPending ? "Syncing..." : "Sync Now"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {syncMutation.data && (
            <div className="mb-4 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    syncMutation.data.status === "success"
                      ? "default"
                      : "destructive"
                  }
                >
                  {syncMutation.data.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Created: {syncMutation.data.created} | Updated:{" "}
                  {syncMutation.data.updated} | Deactivated:{" "}
                  {syncMutation.data.deactivated}
                </span>
              </div>
              {syncMutation.data.errors?.length > 0 && (
                <div className="mt-2 text-sm text-red-500">
                  {syncMutation.data.errors.length} error(s) occurred
                </div>
              )}
            </div>
          )}

          {/* Recent Sync History */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Activity</h4>
            {syncLogs?.data?.map(
              (log: {
                id: string;
                type: string;
                status: string;
                itemCount: number;
                createdAt: string;
              }) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{log.type}</Badge>
                    <StatusIcon status={log.status} />
                    <span>{log.itemCount} items</span>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              )
            )}
            {(!syncLogs?.data || syncLogs.data.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No sync activity yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({
  title,
  value,
  subtitle,
  icon,
  loading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "error":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-yellow-500" />;
  }
}
