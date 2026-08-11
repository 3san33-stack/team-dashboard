import { describe, it, expect } from "vitest";
import {
  isOverdue,
  averageProgress,
  statusColor,
  priorityColor,
  monthCategoryContribution,
  teamCategoryDistribution,
  monthlyTaskCounts,
  dueDateHeatmapColumns,
} from "./derived";
import type { Task } from "./types";
import { CATEGORIES } from "./types";

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

describe("monthCategoryContribution", () => {
  it("returns 0 when the member has no tasks in that month", () => {
    expect(monthCategoryContribution([], "이은혜", "제품개발", 2026, 8)).toBe(0);
  });

  it("returns the share of a member's tasks in a given month that fall in the given category", () => {
    const tasks = [
      makeTask({ member: "이은혜", category: "제품개발", start_date: "2026-08-01" }),
      makeTask({ member: "이은혜", category: "제품개발", start_date: "2026-08-05" }),
      makeTask({ member: "이은혜", category: "기타업무", start_date: "2026-08-10" }),
      makeTask({ member: "이은혜", category: "제품개발", start_date: "2026-07-01" }), // different month, excluded
      makeTask({ member: "김혜진", category: "제품개발", start_date: "2026-08-02" }), // different member, excluded
    ];
    expect(monthCategoryContribution(tasks, "이은혜", "제품개발", 2026, 8)).toBe(67);
  });

  it("uses start_date to bucket by month, ignoring tasks with no start_date", () => {
    const tasks = [
      makeTask({ member: "이은혜", category: "제품개발", start_date: null }),
      makeTask({ member: "이은혜", category: "제품개발", start_date: "2026-08-01" }),
    ];
    expect(monthCategoryContribution(tasks, "이은혜", "제품개발", 2026, 8)).toBe(100);
  });
});

describe("teamCategoryDistribution", () => {
  it("returns an empty-friendly zero count per category when there are no tasks", () => {
    const result = teamCategoryDistribution([]);
    expect(result.every((r) => r.count === 0)).toBe(true);
    expect(result.map((r) => r.category)).toEqual([...CATEGORIES]);
  });

  it("counts tasks per category across all members", () => {
    const tasks = [
      makeTask({ category: "제품개발" }),
      makeTask({ category: "제품개발" }),
      makeTask({ category: "기타업무" }),
    ];
    const result = teamCategoryDistribution(tasks);
    expect(result.find((r) => r.category === "제품개발")?.count).toBe(2);
    expect(result.find((r) => r.category === "기타업무")?.count).toBe(1);
    expect(result.find((r) => r.category === "OKR")?.count).toBe(0);
  });
});

describe("monthlyTaskCounts", () => {
  it("returns one entry per month for the requested range, most recent last", () => {
    const today = new Date("2026-08-11T00:00:00");
    const result = monthlyTaskCounts([], 3, today);
    expect(result.map((r) => r.month)).toEqual(["2026-06", "2026-07", "2026-08"]);
    expect(result.every((r) => r.count === 0)).toBe(true);
  });

  it("counts tasks by created_at month", () => {
    const today = new Date("2026-08-11T00:00:00");
    const tasks = [
      makeTask({ created_at: "2026-08-01T00:00:00Z" }),
      makeTask({ created_at: "2026-08-05T00:00:00Z" }),
      makeTask({ created_at: "2026-07-01T00:00:00Z" }),
      makeTask({ created_at: "2026-01-01T00:00:00Z" }), // out of range, excluded
    ];
    const result = monthlyTaskCounts(tasks, 3, today);
    expect(result.find((r) => r.month === "2026-08")?.count).toBe(2);
    expect(result.find((r) => r.month === "2026-07")?.count).toBe(1);
    expect(result.find((r) => r.month === "2026-06")?.count).toBe(0);
  });
});

describe("dueDateHeatmapColumns", () => {
  it("returns an empty array for empty input", () => {
    expect(dueDateHeatmapColumns([])).toEqual([]);
  });

  it("counts tasks due on each day, capped to a 0-4 level", () => {
    const tasks = [
      makeTask({ due_date: "2026-08-11" }),
      makeTask({ due_date: "2026-08-11" }),
      makeTask({ due_date: "2026-08-11" }),
      makeTask({ due_date: "2026-08-11" }),
      makeTask({ due_date: "2026-08-11" }), // 5 tasks same day, should cap at 4
      makeTask({ due_date: "2026-08-12" }),
      makeTask({ due_date: null }), // ignored
    ];
    const columns = dueDateHeatmapColumns(tasks);
    const localKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const allBins = columns.flatMap((c) => c.bins);
    const byKey = new Map(allBins.map((b) => [localKey(b.date), b.count]));
    expect(byKey.get("2026-08-11")).toBe(4);
    expect(byKey.get("2026-08-12")).toBe(1);
  });
});
