"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { weeklyActivityCounts } from "@/lib/derived";
import type { Task } from "@/lib/types";

type Props = { tasks: Task[] };

// Container is h-40 (160px); bars get 112px, leaving room for the weekday
// label + gap-1 below each bar so the tallest bar doesn't overflow the card.
const BAR_MAX_HEIGHT = 112;

export function WeeklyActivityChart({ tasks }: Props) {
  const data = weeklyActivityCounts(tasks);
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>이번 주 완료 업무</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          role="img"
          aria-label={`요일별 완료 업무: ${data.map((d) => `${d.label} ${d.count}건`).join(", ")}`}
          className="flex h-40 items-end justify-between gap-2"
        >
          {data.map((d, i) => (
            <div
              key={`${d.label}-${i}`}
              aria-hidden
              className="flex flex-1 flex-col items-center gap-1"
            >
              <motion.div
                className="w-full rounded-t-md bg-primary"
                initial={{ height: 0 }}
                animate={{ height: (d.count / max) * BAR_MAX_HEIGHT }}
                transition={{ type: "spring", stiffness: 80, damping: 20, delay: i * 0.06 }}
              />
              <span className="text-xs text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
