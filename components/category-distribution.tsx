"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { PieCenter } from "@/components/charts/pie-center";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import type { Task } from "@/lib/types";
import { teamCategoryDistribution } from "@/lib/derived";

type Props = { tasks: Task[] };

export function CategoryDistribution({ tasks }: Props) {
  const distribution = teamCategoryDistribution(tasks);
  const total = distribution.reduce((sum, d) => sum + d.count, 0);

  const pieData = distribution
    .filter((d) => d.count > 0)
    .map((d) => ({
      label: d.category,
      value: d.count,
      color: CATEGORY_COLORS[d.category],
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>업무구분별 분포 (전체)</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">표시할 데이터가 없습니다</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <PieChart data={pieData} innerRadius={60} padAngle={0.02} size={180}>
              {pieData.map((_, i) => (
                <PieSlice key={pieData[i]!.label} index={i} />
              ))}
              <PieCenter defaultLabel="전체" />
            </PieChart>
            <div className="grid w-full grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto text-xs">
              {pieData.map((d) => (
                <div key={d.label} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className="ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
