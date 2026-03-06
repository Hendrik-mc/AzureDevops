"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface SubscriptionPickerProps {
  value: string;
  onChange: (subscriptionId: string) => void;
  className?: string;
}

interface SubscriptionData {
  subscriptions: {
    subscriptionId: string;
    displayName: string;
    state: string;
  }[];
}

export function SubscriptionPicker({ value, onChange, className }: SubscriptionPickerProps) {
  const { data, isLoading } = useQuery<SubscriptionData>({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/azure/subscriptions");
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      return res.json();
    },
  });

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      disabled={isLoading}
    >
      <option value="">Select subscription...</option>
      {data?.subscriptions?.map((sub) => (
        <option key={sub.subscriptionId} value={sub.subscriptionId}>
          {sub.displayName}
        </option>
      ))}
    </select>
  );
}
