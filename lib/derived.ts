import {
  CATEGORIES, STATUSES, UPLOAD_LOG_CATEGORIES, WEAVERS,
  type Category, type Member, type Priority, type Status, type Task,
  type UploadLog, type UploadLogCategory, type Weaver,
} from "./types";

// Assumes both dates are interpreted in the server/browser's local timezone (KST for this team).
// A UTC-pinned deployment (e.g. some serverless runtimes) could shift "today" by a day near midnight.
// Uses due_date (overdue/calendar views); monthCategoryContribution below uses start_date instead.
export function isOverdue(task: Task, today: Date = new Date()): boolean {
  if (!task.due_date || task.status === "완료") return false;
  const due = new Date(`${task.due_date}T00:00:00`);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return due.getTime() < todayMidnight.getTime();
}

// Per-member task count broken down by status (예정/진행중/검토중/완료/보류).
export function memberStatusCounts(tasks: Task[], member: Member): Record<Status, number> {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const t of tasks) {
    if (t.member === member) counts[t.status] += 1;
  }
  return counts;
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
 * Buckets by `start_date` (the spreadsheet used its "시작일" column the same way), falling
 * back to `due_date` — in practice the team fills 마감일 and often skips 시작일, which used
 * to make every month read as "no tasks".
 */
export function monthCategoryContribution(
  tasks: Task[],
  member: Member,
  category: Category,
  year: number,
  month: number // 1-12
): number {
  const inMonth = tasks.filter((t) => {
    const bucketDate = t.start_date ?? t.due_date;
    if (t.member !== member || !bucketDate) return false;
    const d = new Date(`${bucketDate}T00:00:00`);
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

// Matches on 프로젝트(project) or 세부업무(detail), case-insensitive. Empty/blank
// query matches everything (so the search box can double as a no-op filter).
export function taskMatchesQuery(task: Task, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    task.project.toLowerCase().includes(q) ||
    (task.detail ?? "").toLowerCase().includes(q)
  );
}

// ponytail: fixed solar holidays only — lunar ones (설날, 추석, 석가탄신일) and
// substitute holidays shift every year; add a per-year table or an API if
// the team needs them exact.
const KR_FIXED_HOLIDAYS = new Set([
  "01-01", "03-01", "05-05", "06-06", "08-15", "10-03", "10-09", "12-25",
]);

export function isRedDay(day: Date): boolean {
  const dow = day.getDay();
  if (dow === 0 || dow === 6) return true;
  const mmdd = `${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  return KR_FIXED_HOLIDAYS.has(mmdd);
}

// First cell of a Sunday-anchored 6-week month grid (may fall in the previous month).
export function startOfMonthGrid(year: number, month: number): Date {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

// Local Y/M/D key, NOT toISOString() — avoids a KST off-by-one bug (toISOString
// converts to UTC first, which shifts the date back a day for timezones ahead
// of UTC). Used by task-calendar.tsx for due-date lookups.
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type MemberSummary = {
  total: number;
  inProgress: number;
  completed: number;
  overdue: number;
  avgProgress: number;
  completedProductDev: number;
};

// 부서장 보고 team-summary row: mirrors the spreadsheet's 전체업무/진행중/완료/
// 지연/평균진행률/완료 제품개발 columns for one member.
export function memberSummary(tasks: Task[], member: Member, today: Date = new Date()): MemberSummary {
  const mine = tasks.filter((t) => t.member === member);
  return {
    total: mine.length,
    inProgress: mine.filter((t) => t.status === "진행중").length,
    completed: mine.filter((t) => t.status === "완료").length,
    overdue: mine.filter((t) => isOverdue(t, today)).length,
    avgProgress: averageProgress(tasks, member),
    completedProductDev: mine.filter((t) => t.category === "제품개발" && t.status === "완료").length,
  };
}

export function upcomingDeadlines(tasks: Task[], limit = 5, member?: Member): Task[] {
  return tasks
    // `>= "2000-01-01"` drops the handful of legacy rows whose 마감일 imported
    // as the Excel epoch (1899-12-30) — otherwise they sort to the very top.
    .filter(
      (t) =>
        t.due_date !== null &&
        t.due_date >= "2000-01-01" &&
        t.status !== "완료" &&
        (member === undefined || t.member === member)
    )
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!))
    .slice(0, limit);
}

export function taskStatusEmoji(task: Task, today: Date = new Date()): "✅" | "🔴" | "🟡" {
  if (task.status === "완료") return "✅";
  if (isOverdue(task, today)) return "🔴";
  return "🟡";
}

export function dayStatusEmojis(dayTasks: Task[], today: Date = new Date()): string[] {
  const emojis = dayTasks.map((t) => taskStatusEmoji(t, today));
  return Array.from(new Set(emojis)).slice(0, 3);
}

export function startOfWeek(now: Date): Date {
  const day = now.getDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
}

function dateRangeFor(range: "week" | "month", now: Date): [Date, Date] {
  if (range === "week") {
    const start = startOfWeek(now);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
    return [start, end];
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return [start, end];
}

export function summarizeUploadLogs(
  logs: UploadLog[],
  range: "week" | "month",
  now: Date = new Date()
): Record<Weaver, Record<UploadLogCategory, number>> {
  const [start, end] = dateRangeFor(range, now);
  const summary = Object.fromEntries(
    WEAVERS.map((w) => [w, Object.fromEntries(UPLOAD_LOG_CATEGORIES.map((c) => [c, 0]))])
  ) as Record<Weaver, Record<UploadLogCategory, number>>;

  for (const log of logs) {
    const created = new Date(log.created_at);
    if (created < start || created > end) continue;
    summary[log.member][log.category] += 1;
  }
  return summary;
}

// Upload-log totals per calendar month, oldest → newest, for the last
// `months` months (including the current one). For the trend bar chart.
export type MonthlyUpload = {
  label: string;
  key: string;
  count: number;
  byCategory: Record<UploadLogCategory, number>;
};

export function monthlyUploadTotals(
  logs: UploadLog[],
  months = 6,
  now: Date = new Date()
): MonthlyUpload[] {
  const keyOf = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const buckets: MonthlyUpload[] = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return {
      label: `${d.getMonth() + 1}월`,
      key: keyOf(d),
      count: 0,
      byCategory: Object.fromEntries(
        UPLOAD_LOG_CATEGORIES.map((c) => [c, 0])
      ) as Record<UploadLogCategory, number>,
    };
  });
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const log of logs) {
    const i = idx.get(keyOf(new Date(log.created_at)));
    if (i !== undefined) {
      buckets[i].count += 1;
      buckets[i].byCategory[log.category] += 1;
    }
  }
  return buckets;
}

// Total upload_logs rows (all members/categories) on one calendar day.
// Used by the bar chart (7 calls, this week) and mini calendar (up to 42
// calls, one per grid cell) in upload-log-widget.tsx.
export function uploadCountOnDay(logs: UploadLog[], day: Date): number {
  const key = toLocalDateKey(day);
  return logs.filter((l) => toLocalDateKey(new Date(l.created_at)) === key).length;
}

// One member's count in one category on one calendar day — the per-cell
// number in the log-widget's quick-add buttons (today) and the day-detail
// dialog (any past day).
export function uploadCountFor(
  logs: UploadLog[],
  day: Date,
  member: Weaver,
  category: UploadLogCategory
): number {
  const key = toLocalDateKey(day);
  return logs.filter(
    (l) => l.member === member && l.category === category && toLocalDateKey(new Date(l.created_at)) === key
  ).length;
}
