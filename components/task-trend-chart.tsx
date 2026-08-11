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
      <CardContent>
        <LineChart data={data} xDataKey="month">
          <Grid />
          <XAxis />
          <Line dataKey="count" />
        </LineChart>
      </CardContent>
    </Card>
  );
}
