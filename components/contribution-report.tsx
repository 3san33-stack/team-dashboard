"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEMBERS, CATEGORIES, type Task } from "@/lib/types";
import { monthCategoryContribution } from "@/lib/derived";
import { CATEGORY_COLORS } from "@/lib/category-colors";

type Props = { tasks: Task[] };

export function ContributionReport({ tasks }: Props) {
  const now = new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle>팀원별 이번 달 기여율</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
  );
}
