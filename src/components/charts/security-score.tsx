"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SecureScore } from "@/types/azure";

interface SecurityScoreGaugeProps {
  score: SecureScore;
}

export function SecurityScoreGauge({ score }: SecurityScoreGaugeProps) {
  const percentage = Math.round(score.percentage);
  const color =
    percentage >= 80
      ? "#22c55e"
      : percentage >= 60
        ? "#eab308"
        : percentage >= 40
          ? "#f97316"
          : "#dc2626";

  const chartData = [
    { name: "Score", value: percentage, fill: color },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Secure Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="90%"
              barSize={12}
              data={chartData}
              startAngle={180}
              endAngle={0}
            >
              <RadialBar
                dataKey="value"
                cornerRadius={6}
                background={{ fill: "hsl(var(--muted))" }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color }}>
              {percentage}%
            </span>
            <span className="text-xs text-muted-foreground">
              {score.currentScore.toFixed(1)} / {score.maxScore.toFixed(1)}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Microsoft Defender for Cloud
        </p>
      </CardContent>
    </Card>
  );
}
