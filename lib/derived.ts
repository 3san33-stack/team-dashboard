import { CATEGORIES, type Category, type Member, type Priority, type Status, type Task } from "./types";

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
