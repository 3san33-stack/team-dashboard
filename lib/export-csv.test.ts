import { describe, it, expect } from "vitest";
import { tasksToCsv } from "./export-csv";
import type { Task } from "./types";

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "1",
    member: "이은혜",
    project: "p",
    category: "제품개발",
    detail: null,
    priority: "P3-보통",
    start_date: null,
    due_date: null,
    progress: 0,
    status: "예정",
    comment: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("tasksToCsv", () => {
  it("starts with a BOM and the Korean header row", () => {
    const csv = tasksToCsv([]);
    expect(csv.startsWith("﻿담당자,프로젝트,업무구분")).toBe(true);
  });

  it("writes one row per task with progress shown as a percentage", () => {
    const csv = tasksToCsv([makeTask({ project: "극세사 31", progress: 40 })]);
    expect(csv).toContain("극세사 31");
    expect(csv).toContain("40%");
  });

  it("quotes and escapes fields containing commas or quotes", () => {
    const csv = tasksToCsv([makeTask({ project: 'A, "B"' })]);
    expect(csv).toContain('"A, ""B"""');
  });
});
