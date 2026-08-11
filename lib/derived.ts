import { CATEGORIES, type Category, type Member, type Priority, type Status, type Task } from "./types";
import type { HeatmapBin, HeatmapColumn } from "@/components/charts/heatmap";

// Assumes both dates are interpreted in the server/browser's local timezone (KST for this team).
// A UTC-pinned deployment (e.g. some serverless runtimes) could shift "today" by a day near midnight.
// Uses due_date (overdue/calendar views); monthCategoryContribution below uses start_date instead.
export function isOverdue(task: Task, today: Date = new Date()): boolean {
  if (!task.due_date || task.status === "완료") return false;
  const due = new Date(`${task.due_date}T00:00:00`);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return due.getTime() < todayMidnight.getTime();
}

export function averageProgress(tasks: Task[], member: Member): number {
  const mine = tasks.filter((t) => t.member === member);
  if (mine.length === 0) return 0;
  const sum = mine.reduce((acc, t) => acc + t.progress, 0);
  return Math.round(sum / mine.length);
}

const STATUS_COLORS: Record<Status, string> = {
  예정: "bg-zinc-500",
  진행중: "bg-blue-500",
  검토중: "bg-purple-500",
  완료: "bg-green-500",
  보류: "bg-orange-500",
};

export function statusColor(status: Status): string {
  return STATUS_COLORS[status];
}

const PRIORITY_COLORS: Record<Priority, string> = {
  "P1-긴급": "bg-red-500",
  "P2-높음": "bg-amber-500",
  "P3-보통": "bg-zinc-400",
  "P4-낮음": "bg-zinc-300",
};

export function priorityColor(priority: Priority): string {
  return PRIORITY_COLORS[priority];
}

/**
 * Reproduces the original spreadsheet's "제품개발 기여율" formula, generalized to any category:
 * (member's tasks in that category, in that month) / (member's total tasks in that month).
 * Buckets by `start_date` (the spreadsheet used its "시작일" column the same way).
 */
export function monthCategoryContribution(
  tasks: Task[],
  member: Member,
  category: Category,
  year: number,
  month: number // 1-12
): number {
  const inMonth = tasks.filter((t) => {
    if (t.member !== member || !t.start_date) return false;
    const d = new Date(`${t.start_date}T00:00:00`);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
  if (inMonth.length === 0) return 0;
  const inCategory = inMonth.filter((t) => t.category === category).length;
  return Math.round((inCategory / inMonth.length) * 100);
}

export function teamCategoryDistribution(
  tasks: Task[]
): { category: Category; count: number }[] {
  return CATEGORIES.map((category) => ({
    category,
    count: tasks.filter((t) => t.category === category).length,
  }));
}

// created_at is a full ISO timestamp (unlike due_date's plain YYYY-MM-DD); bucketed
// here by the LOCAL calendar month of that timestamp, not UTC.
export function monthlyTaskCounts(
  tasks: Task[], monthsBack: number, today: Date = new Date()
): { month: string; count: number }[] {
  const result: { month: string; count: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const count = tasks.filter((t) => {
      const created = new Date(t.created_at);
      return (
        created.getFullYear() === d.getFullYear() &&
        created.getMonth() === d.getMonth()
      );
    }).length;
    result.push({ month: key, count });
  }
  return result;
}

// Local Y/M/D key, NOT toISOString() — avoids the KST off-by-one bug already
// found and fixed in components/task-calendar.tsx. Exported so that component
// can import this instead of keeping its own duplicate copy.
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dueDateHeatmapColumns(tasks: Task[]): HeatmapColumn[] {
  const dueDates = tasks.map((t) => t.due_date).filter((d): d is string => !!d);
  if (dueDates.length === 0) return [];

  const counts = new Map<string, number>();
  for (const d of dueDates) counts.set(d, (counts.get(d) ?? 0) + 1);

  const sorted = [...dueDates].sort();
  const start = new Date(`${sorted[0]}T00:00:00`);
  const end = new Date(`${sorted[sorted.length - 1]}T00:00:00`);
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const columns: HeatmapColumn[] = [];
  const colDate = new Date(weekStart);
  let colIndex = 0;
  while (colDate <= end) {
    const bins: HeatmapBin[] = Array.from({ length: 7 }, (_, day) => {
      const d = new Date(colDate);
      d.setDate(d.getDate() + day);
      const key = toLocalDateKey(d);
      const count = Math.min(counts.get(key) ?? 0, 4);
      return { bin: day, date: d, count };
    });
    columns.push({ bin: colIndex, bins });
    colDate.setDate(colDate.getDate() + 7);
    colIndex++;
  }
  return columns;
}
