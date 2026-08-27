"use client";

import { memberSummary, upcomingDeadlines } from "@/lib/derived";
import type { Member, Task } from "@/lib/types";

type Props = { tasks: Task[]; member: Member };

function ddayLabel(due: string): { text: string; urgent: boolean } {
  const d = new Date(`${due}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return { text: `D+${-diff}`, urgent: true };
  if (diff === 0) return { text: "D-DAY", urgent: true };
  return { text: `D-${diff}`, urgent: diff <= 3 };
}

// Left-margin counterpart to SideRail: same thin styling, but scoped to the
// logged-in member (right rail = team, left rail = me). ≥1700px only.
export function LeftRail({ tasks, member }: Props) {
  const me = memberSummary(tasks, member);
  const myDeadlines = upcomingDeadlines(tasks, 5, member);

  const stats: [string, string, string][] = [
    ["진행중", String(me.inProgress), "text-blue-500"],
    ["지연", String(me.overdue), me.overdue > 0 ? "text-red-500" : ""],
    ["완료", String(me.completed), "text-green-600"],
    ["평균 진행률", `${me.avgProgress}%`, ""],
  ];

  return (
    <aside className="sticky top-[22vh] hidden h-fit w-56 shrink-0 flex-col divide-y divide-border/60 self-start justify-self-end rounded-2xl border border-border/50 bg-foreground/[0.02] px-4 text-sm min-[1700px]:flex">
      <div className="space-y-1.5 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
          내 업무 · {member}
        </p>
        <dl className="space-y-1">
          {stats.map(([label, value, color]) => (
            <div key={label} className="flex items-baseline justify-between">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className={`font-medium tabular-nums ${color}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="space-y-1.5 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
          내 마감 임박·지연
        </p>
        {myDeadlines.length === 0 ? (
          <p className="text-xs text-muted-foreground">예정된 마감이 없습니다</p>
        ) : (
          <ul className="space-y-1.5">
            {myDeadlines.map((task) => {
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
      </div>
    </aside>
  );
}
