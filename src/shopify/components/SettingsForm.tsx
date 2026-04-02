"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, TestTube, CheckCircle, XCircle } from "lucide-react";

interface SettingsFormProps {
  storeId: string;
}

export function SettingsForm({ storeId }: SettingsFormProps) {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["shopify-config", storeId],
    queryFn: () =>
      fetch(`/api/shopify/config?storeId=${storeId}`).then((r) => r.json()),
  });

  const [formState, setFormState] = useState({
    mcPartnerId: "",
    mcEnvironment: "sandbox" as "sandbox" | "production",
    autoSync: false,
    syncIntervalMins: 60,
    defaultMarkup: 0,
    regionId: "",
  });

  useEffect(() => {
    if (config && !isLoading) {
      setFormState({
        mcPartnerId: config.mcPartnerId ?? "",
        mcEnvironment: config.mcEnvironment ?? "sandbox",
        autoSync: config.autoSync ?? false,
        syncIntervalMins: config.syncIntervalMins ?? 60,
        defaultMarkup: config.defaultMarkup ?? 0,
        regionId: config.regionId ?? "",
      });
    }
  }, [config, isLoading]);

  const saveMutation = useMutation({
    mutationFn: () =>
      fetch("/api/shopify/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          ...formState,
          regionId: formState.regionId || null,
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopify-config"] });
    },
  });

  const { data: healthData, refetch: testConnection } = useQuery({
    queryKey: ["shopify-health-test", storeId],
    queryFn: () =>
      fetch(`/api/shopify/health?storeId=${storeId}`).then((r) => r.json()),
    enabled: false,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">Loading settings...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mission:Control Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Mission:Control Configuration
          </CardTitle>
          <CardDescription>
            Configure the connection to Mission:Control Partner API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Partner ID
            </label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={formState.mcPartnerId}
              onChange={(e) =>
                setFormState((s) => ({ ...s, mcPartnerId: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Environment
            </label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={formState.mcEnvironment}
              onChange={(e) =>
                setFormState((s) => ({
                  ...s,
                  mcEnvironment: e.target.value as "sandbox" | "production",
                }))
              }
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Region ID (for stock checks)
            </label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="e.g., EU, US, GLOBAL"
              value={formState.regionId}
              onChange={(e) =>
                setFormState((s) => ({ ...s, regionId: e.target.value }))
              }
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => testConnection()}
          >
            <TestTube className="mr-2 h-4 w-4" />
            Test Connection
          </Button>
          {healthData && (
            <div className="flex items-center gap-2 text-sm">
              {healthData.missionControl?.connected ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">
                    Connected ({healthData.missionControl.latencyMs}ms)
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">Connection failed</span>
                </>
              )}
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
          <CardDescription>
            Configure how products are synchronized between Mission:Control and
            Shopify
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium">
                Auto Sync
              </label>
              <p className="text-xs text-muted-foreground">
                Automatically sync products on a schedule
              </p>
            </div>
            <button
              role="switch"
              aria-checked={formState.autoSync}
              onClick={() =>
                setFormState((s) => ({ ...s, autoSync: !s.autoSync }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formState.autoSync ? "bg-primary" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formState.autoSync ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {formState.autoSync && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                Sync Interval (minutes)
              </label>
              <input
                type="number"
                min={5}
                max={1440}
                className="w-32 rounded-md border px-3 py-2 text-sm"
                value={formState.syncIntervalMins}
                onChange={(e) =>
                  setFormState((s) => ({
                    ...s,
                    syncIntervalMins: parseInt(e.target.value, 10) || 60,
                  }))
                }
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Default Price Markup (%)
            </label>
            <input
              type="number"
              min={0}
              max={500}
              step={0.1}
              className="w-32 rounded-md border px-3 py-2 text-sm"
              value={formState.defaultMarkup}
              onChange={(e) =>
                setFormState((s) => ({
                  ...s,
                  defaultMarkup: parseFloat(e.target.value) || 0,
                }))
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Applied on top of base product price
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
          {saveMutation.isSuccess && (
            <Badge className="ml-3" variant="outline">
              Saved
            </Badge>
          )}
        </CardFooter>
      </Card>

      {/* Store Info */}
      <Card>
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shop Domain</span>
              <span className="font-medium">
                {config?.store?.shopDomain ?? "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Installed</span>
              <span>
                {config?.store?.installedAt
                  ? new Date(config.store.installedAt).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={config?.store?.isActive ? "default" : "destructive"}>
                {config?.store?.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
