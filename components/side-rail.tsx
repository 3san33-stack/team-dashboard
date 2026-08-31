"use client";

import Link from "next/link";
import { isRedDay, upcomingDeadlines } from "@/lib/derived";
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

// Thin sticky rail that lives in the left-over side margin at ≥1700px — kept
// visually lighter than the dashboard's Card widgets (no shadow/ring, hairline
// dividers) so it reads as chrome, not another widget. Pure derived data.
export function SideRail({ tasks }: Props) {
  const now = new Date();
  const dateText = `${now.getMonth() + 1}월 ${now.getDate()}일 (${WEEKDAYS[now.getDay()]})`;
  const holiday = isRedDay(now);

  const deadlines = upcomingDeadlines(tasks, 6);

  return (
    <aside className="sticky top-8 hidden h-fit w-56 shrink-0 flex-col divide-y divide-border/60 self-start rounded-2xl border border-border/50 bg-foreground/[0.02] px-4 text-sm min-[1700px]:flex">
      <Section title="오늘">
        <p className="font-medium">{dateText}</p>
        <p className={`text-xs ${holiday ? "text-red-500" : "text-muted-foreground"}`}>
          {holiday ? "휴일" : "근무일"}
        </p>
      </Section>

      <Section title="마감 임박·지연">
        {deadlines.length === 0 ? (
          <p className="text-xs text-muted-foreground">예정된 마감이 없습니다</p>
        ) : (
          <ul className="space-y-1.5">
            {deadlines.map((task) => {
              const dday = ddayLabel(task.due_date!);
              return (
                <li key={task.id} className="flex items-baseline gap-2">
                  <span
                    className={`shrink-0 text-xs tabular-nums ${
                      dday.urgent ? "text-red-500" : "text-muted-foreground"
                    }`}
                  >
                    {dday.text}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs" title={task.project}>
                    {task.project}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <div className="py-3">
        <Link
          href="/report"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          부서장님 보고 →
        </Link>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {title}
      </p>
      {children}
    </div>
  );
}
