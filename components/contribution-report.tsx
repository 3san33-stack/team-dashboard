"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { PieCenter } from "@/components/charts/pie-center";
import { MEMBERS, CATEGORIES, type Task } from "@/lib/types";
import { monthCategoryContribution, teamCategoryDistribution } from "@/lib/derived";

type Props = { tasks: Task[] };

const CATEGORY_COLORS: Record<(typeof CATEGORIES)[number], string> = {
  "제품개발": "#6366f1",
  "타부서(팀)지원": "#22c55e",
  "조직연구": "#f59e0b",
  "샘플제직": "#06b6d4",
  "생산지원": "#ec4899",
  "기타업무": "#a3a3a3",
  "OKR": "#8b5cf6",
};

export function ContributionReport({ tasks }: Props) {
  const now = new Date();
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>업무구분별 분포 (전체)</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          {total === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">표시할 데이터가 없습니다</p>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4">
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

      <Card>
        <CardHeader>
          <CardTitle>팀원별 이번 달 기여율</CardTitle>
        </CardHeader>
        <CardContent className="h-80 space-y-4 overflow-y-auto">
          {MEMBERS.map((member) => {
            const rows = CATEGORIES.map((category) => ({
              category,
              percent: monthCategoryContribution(
                tasks, member, category, now.getFullYear(), now.getMonth() + 1
              ),
            })).filter((r) => r.percent > 0);

            return (
              <div key={member} className="space-y-1">
                <div className="text-sm font-medium">{member}</div>
                {rows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">이번 달 업무 없음</p>
                ) : (
                  <div className="space-y-1">
                    {rows.map(({ category, percent }) => (
                      <div key={category} className="flex items-center gap-2 text-xs">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[category] }}
                        />
                        <span className="w-28 text-muted-foreground">{category}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${percent}%`, backgroundColor: CATEGORY_COLORS[category] }}
                          />
                        </div>
                        <span className="w-10 text-right text-muted-foreground">{percent}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
