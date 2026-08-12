"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MEMBERS, type Task } from "@/lib/types";
import { memberSummary, monthCategoryContribution } from "@/lib/derived";

type Props = { tasks: Task[] };

const MONTH_LABELS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function DepartmentReport({ tasks }: Props) {
  const [year, setYear] = useState(() => new Date().getFullYear());

  // [member][monthIndex] contribution %, computed once per render and reused
  // by both the per-member rows and the 팀 평균 row below.
  const contributionByMember = MEMBERS.map((member) =>
    MONTH_LABELS.map((_, i) => monthCategoryContribution(tasks, member, "제품개발", year, i + 1))
  );
  const teamMonthlyAverage = MONTH_LABELS.map((_, i) =>
    average(contributionByMember.map((row) => row[i]!))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{year}년 부서장님 보고</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setYear((y) => y - 1)}>
            이전 연도
          </Button>
          <Button variant="outline" size="sm" onClick={() => setYear((y) => y + 1)}>
            다음 연도
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>팀원별 현황</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">팀원</th>
                <th className="px-2 font-medium">전체업무</th>
                <th className="px-2 font-medium">진행중</th>
                <th className="px-2 font-medium">완료</th>
                <th className="px-2 font-medium">지연</th>
                <th className="px-2 font-medium">평균진행률</th>
                <th className="px-2 font-medium">완료 제품개발</th>
              </tr>
            </thead>
            <tbody>
              {MEMBERS.map((member) => {
                const s = memberSummary(tasks, member);
                return (
                  <tr key={member} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{member}</td>
                    <td className="px-2">{s.total}</td>
                    <td className="px-2">{s.inProgress}</td>
                    <td className="px-2">{s.completed}</td>
                    <td className="px-2 text-red-500">{s.overdue}</td>
                    <td className="px-2">{s.avgProgress}%</td>
                    <td className="px-2">{s.completedProductDev}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>담당자별 제품개발 기여율 (월별)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">담당자</th>
                {MONTH_LABELS.map((m) => (
                  <th key={m} className="px-2 text-right font-medium">{m}</th>
                ))}
                <th className="px-2 text-right font-medium text-foreground">평균</th>
              </tr>
            </thead>
            <tbody>
              {MEMBERS.map((member, mi) => (
                <tr key={member} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{member}</td>
                  {contributionByMember[mi]!.map((v, i) => (
                    <td key={i} className="px-2 text-right text-muted-foreground">{v}%</td>
                  ))}
                  <td className="px-2 text-right font-medium">
                    {average(contributionByMember[mi]!)}%
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 font-medium">
                <td className="py-2 pr-4">팀 평균</td>
                {teamMonthlyAverage.map((v, i) => (
                  <td key={i} className="px-2 text-right">{v}%</td>
                ))}
                <td className="px-2 text-right">{average(teamMonthlyAverage)}%</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
