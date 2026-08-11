"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeatmapCells, HeatmapChart } from "@/components/charts/heatmap";
import { dueDateHeatmapColumns } from "@/lib/derived";
import type { Task } from "@/lib/types";

type Props = { tasks: Task[] };

export function TaskActivityHeatmap({ tasks }: Props) {
  const columns = dueDateHeatmapColumns(tasks);

  return (
    <Card>
      <CardHeader>
        <CardTitle>마감일 밀집도</CardTitle>
      </CardHeader>
      <CardContent>
        {columns.length === 0 ? (
          <p className="text-sm text-muted-foreground">표시할 마감일 데이터가 없습니다.</p>
        ) : (
          <HeatmapChart data={columns} layout="fluid">
            <HeatmapCells />
          </HeatmapChart>
        )}
      </CardContent>
    </Card>
  );
}
