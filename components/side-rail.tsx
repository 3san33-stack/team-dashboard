"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isOverdue, isRedDay, upcomingDeadlines } from "@/lib/derived";
import type { Task } from "@/lib/types";

type Props = { tasks: Task[] };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function ddayLabel(due: string): { text: string; urgent: boolean } {
  const d = new Date(`${due}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return { text: `D+${-diff}`, urgent: true };
  if (diff === 0) return { text: "D-DAY", urgent: true };
  return { text: `D-${diff}`, urgent: diff <= 3 };
}

// Wide-screen (2xl+) sticky rail that fills the left-over margin next to the
// centered 1200px column. Pure derived data — no extra Supabase calls.
export function SideRail({ tasks }: Props) {
  const now = new Date();
  const dateText = `${now.getMonth() + 1}월 ${now.getDate()}일 (${WEEKDAYS[now.getDay()]})`;
  const holiday = isRedDay(now);

  const total = tasks.length;
  const inProgress = tasks.filter((t) => t.status === "진행중").length;
  const completed = tasks.filter((t) => t.status === "완료").length;
  const overdue = tasks.filter((t) => isOverdue(t)).length;

  const deadlines = upcomingDeadlines(tasks, 6);

  return (
    <aside className="sticky top-6 hidden h-fit w-64 shrink-0 flex-col gap-4 self-start 2xl:flex">
      <Card size="sm">
        <CardHeader>
          <CardTitle>오늘</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">{dateText}</p>
          <p className={`text-xs ${holiday ? "text-red-500" : "text-muted-foreground"}`}>
            {holiday ? "휴일" : "근무일"}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>팀 현황</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-center">
          <Stat label="전체" value={total} />
          <Stat label="진행중" value={inProgress} className="text-blue-500" />
          <Stat label="완료" value={completed} className="text-green-600" />
          <Stat label="지연" value={overdue} className={overdue > 0 ? "text-red-500" : ""} />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>마감 임박·지연</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {deadlines.length === 0 ? (
            <p className="text-xs text-muted-foreground">예정된 마감이 없습니다</p>
          ) : (
            deadlines.map((task) => {
              const dday = ddayLabel(task.due_date!);
              return (
                <div key={task.id} className="flex items-center gap-2">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      dday.urgent
                        ? "bg-red-500/15 text-red-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {dday.text}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs">{task.project}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{task.member}</p>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Link
        href="/report"
        className="rounded-2xl bg-card px-4 py-3 text-center text-sm font-medium text-card-foreground shadow-sm ring-1 ring-foreground/12 hover:bg-muted"
      >
        부서장님 보고 →
      </Link>
    </aside>
  );
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-lg bg-muted/50 py-2">
      <p className={`text-xl font-semibold ${className}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
