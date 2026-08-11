import { describe, it, expect } from "vitest";
import { isOverdue, averageProgress, statusColor, priorityColor } from "./derived";
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

describe("isOverdue", () => {
  const today = new Date("2026-08-11T00:00:00");

  it("returns true when due date has passed and status is not 완료", () => {
    const task = makeTask({ due_date: "2026-08-01", status: "진행중" });
    expect(isOverdue(task, today)).toBe(true);
  });

  it("returns false when status is 완료 even if overdue", () => {
    const task = makeTask({ due_date: "2026-08-01", status: "완료" });
    expect(isOverdue(task, today)).toBe(false);
  });

  it("returns false when due date is in the future", () => {
    const task = makeTask({ due_date: "2026-09-01", status: "진행중" });
    expect(isOverdue(task, today)).toBe(false);
  });

  it("returns false when there is no due date", () => {
    const task = makeTask({ due_date: null, status: "진행중" });
    expect(isOverdue(task, today)).toBe(false);
  });
});

describe("averageProgress", () => {
  it("returns 0 for a member with no tasks", () => {
    expect(averageProgress([], "이은혜")).toBe(0);
  });

  it("averages progress across a member's tasks only", () => {
    const tasks = [
      makeTask({ member: "이은혜", progress: 40 }),
      makeTask({ member: "이은혜", progress: 60 }),
      makeTask({ member: "김혜진", progress: 100 }),
    ];
    expect(averageProgress(tasks, "이은혜")).toBe(50);
  });
});

describe("statusColor", () => {
  it("maps each status to a distinct color token", () => {
    const colors = new Set(
      ["예정", "진행중", "검토중", "완료", "보류"].map((s) => statusColor(s as Task["status"]))
    );
    expect(colors.size).toBe(5);
  });
});

describe("priorityColor", () => {
  it("maps each priority to a distinct color token", () => {
    const colors = new Set(
      ["P1-긴급", "P2-높음", "P3-보통", "P4-낮음"].map((p) =>
        priorityColor(p as Task["priority"])
      )
    );
    expect(colors.size).toBe(4);
  });
});
