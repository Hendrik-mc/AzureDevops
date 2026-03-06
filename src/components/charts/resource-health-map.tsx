"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResourceHealth } from "@/types/azure";

interface ResourceHealthMapProps {
  data: ResourceHealth[];
}

const STATUS_COLORS: Record<string, string> = {
  Available: "#22c55e",
  Unavailable: "#dc2626",
  Degraded: "#f97316",
  Unknown: "#94a3b8",
};

export function ResourceHealthMap({ data }: ResourceHealthMapProps) {
  const grouped: Record<string, number> = {};
  for (const r of data) {
    grouped[r.availabilityState] = (grouped[r.availabilityState] || 0) + 1;
  }

  const chartData = Object.entries(grouped).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Resource Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLORS[entry.name] || "#94a3b8"}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
