import {
  CATEGORIES, MEMBERS, PRIORITIES, STATUSES,
  type Category, type Member, type Priority, type Status, type TaskInput,
} from "./types";

function toDateOrNull(value: unknown): string | null {
  if (!(value instanceof Date)) return null;
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toPriority(value: unknown): Priority {
  return (PRIORITIES as readonly unknown[]).includes(value) ? (value as Priority) : "P3-보통";
}

function toStatus(value: unknown): Status {
  return (STATUSES as readonly unknown[]).includes(value) ? (value as Status) : "예정";
}

function toTextOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === 0 || value === "") return null;
  return String(value);
}

export function mapImportRow(
  row: Record<string, unknown>
): { input: TaskInput } | { skipReason: string } {
  const member = row["담당자"];
  if (!(MEMBERS as readonly unknown[]).includes(member)) {
    return { skipReason: `알 수 없는 담당자: ${String(member)}` };
  }

  const category = row["업무구분"];
  if (!(CATEGORIES as readonly unknown[]).includes(category)) {
    return { skipReason: `알 수 없는 업무구분: ${String(category)}` };
  }

  const project = row["프로젝트"];
  if (typeof project !== "string" || project.trim() === "") {
    return { skipReason: "프로젝트 이름이 없습니다" };
  }

  const progressRaw = row["진행률"];
  const progress = typeof progressRaw === "number" ? Math.round(progressRaw * 100) : 0;

  return {
    input: {
      member: member as Member,
      project,
      category: category as Category,
      detail: toTextOrNull(row["세부업무"]),
      priority: toPriority(row["우선순위"]),
      start_date: toDateOrNull(row["시작일"]),
      due_date: toDateOrNull(row["마감일"]),
      progress,
      status: toStatus(row["상태"]),
      comment: toTextOrNull(row["팀장코멘트"]),
    },
  };
}
