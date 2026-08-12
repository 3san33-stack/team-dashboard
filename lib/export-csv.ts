import type { Task } from "./types";

const HEADERS = [
  "담당자", "프로젝트", "업무구분", "세부업무", "우선순위",
  "시작일", "마감일", "진행률", "상태", "팀장코멘트",
];

function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function tasksToCsv(tasks: Task[]): string {
  const rows = tasks.map((t) => [
    t.member, t.project, t.category, t.detail ?? "", t.priority,
    t.start_date ?? "", t.due_date ?? "", `${t.progress}%`, t.status, t.comment ?? "",
  ]);
  const lines = [HEADERS, ...rows].map((row) => row.map(csvField).join(","));
  // Leading BOM so Excel on Windows opens Korean text as UTF-8 instead of garbling it.
  return `﻿${lines.join("\r\n")}`;
}

export function downloadTasksAsCsv(tasks: Task[], filename = "업무목록.csv"): void {
  const blob = new Blob([tasksToCsv(tasks)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
