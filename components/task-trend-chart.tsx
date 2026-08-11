"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid } from "@/components/charts/grid";
import { Line, LineChart } from "@/components/charts/line-chart";
import { XAxis } from "@/components/charts/x-axis";
import { monthlyTaskCounts } from "@/lib/derived";
import type { Task } from "@/lib/types";

type Props = { tasks: Task[] };

export function TaskTrendChart({ tasks }: Props) {
  const data = monthlyTaskCounts(tasks, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 6개월 업무 등록 추이</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        {/* xDataKey values ("YYYY-MM") are re-parsed by LineChart via `new Date(...)`,
            which is UTC-anchored — harmless for month-precision labels since KST
            (UTC+9) never crosses a month boundary earlier than UTC, but keep this
            in mind if this ever runs for a team west of UTC. */}
        <LineChart data={data} xDataKey="month" aspectRatio={undefined}>
          <Grid />
          <XAxis />
          <Line dataKey="count" />
        </LineChart>
      </CardContent>
    </Card>
  );
}
