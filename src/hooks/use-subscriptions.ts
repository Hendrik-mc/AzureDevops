"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AzureSubscription } from "@/types/azure";

export function useSubscriptions() {
  const [selectedSubscription, setSelectedSubscription] = useState("");

  const query = useQuery<{ subscriptions: AzureSubscription[] }>({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/azure/subscriptions");
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      return res.json();
    },
  });

  const selectSubscription = useCallback((id: string) => {
    setSelectedSubscription(id);
  }, []);

  return {
    subscriptions: query.data?.subscriptions || [],
    isLoading: query.isLoading,
    error: query.error,
    selectedSubscription,
    selectSubscription,
  };
}
