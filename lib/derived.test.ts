import { describe, it, expect } from "vitest";
import {
  isOverdue,
  averageProgress,
  statusColor,
  priorityColor,
  monthCategoryContribution,
  teamCategoryDistribution,
  taskMatchesQuery,
  weeklyActivityCounts,
  upcomingDeadlines,
  taskStatusEmoji,
  dayStatusEmojis,
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

describe("taskMatchesQuery", () => {
  it("matches everything when the query is blank", () => {
    expect(taskMatchesQuery(makeTask({ project: "아무개" }), "")).toBe(true);
    expect(taskMatchesQuery(makeTask({ project: "아무개" }), "   ")).toBe(true);
  });

  it("matches case-insensitively on project", () => {
    expect(taskMatchesQuery(makeTask({ project: "Snoopy Beach" }), "snoopy")).toBe(true);
    expect(taskMatchesQuery(makeTask({ project: "Snoopy Beach" }), "towel")).toBe(false);
  });

  it("matches on detail, and tolerates a null detail", () => {
    expect(taskMatchesQuery(makeTask({ project: "p", detail: "극세사 원단" }), "원단")).toBe(true);
    expect(taskMatchesQuery(makeTask({ project: "p", detail: null }), "원단")).toBe(false);
  });
});

describe("weeklyActivityCounts", () => {
  const today = new Date("2026-08-12T00:00:00"); // 수요일

  it("counts completed tasks per day for the last 7 days, oldest first", () => {
    const tasks = [
      makeTask({ status: "완료", updated_at: "2026-08-12T09:00:00" }), // 오늘(수)
      makeTask({ status: "완료", updated_at: "2026-08-12T15:00:00" }), // 오늘(수), 2건째
      makeTask({ status: "완료", updated_at: "2026-08-10T09:00:00" }), // 월요일
    ];
    const result = weeklyActivityCounts(tasks, today);
    expect(result).toHaveLength(7);
    expect(result[result.length - 1]).toEqual({ label: "수", count: 2 });
    const monday = result.find((d) => d.label === "월");
    expect(monday?.count).toBe(1);
  });

  it("ignores tasks that are not 완료", () => {
    const tasks = [makeTask({ status: "진행중", updated_at: "2026-08-12T09:00:00" })];
    const result = weeklyActivityCounts(tasks, today);
    expect(result.every((d) => d.count === 0)).toBe(true);
  });

  it("ignores completions outside the 7-day window", () => {
    const tasks = [makeTask({ status: "완료", updated_at: "2026-07-01T09:00:00" })];
    const result = weeklyActivityCounts(tasks, today);
    expect(result.every((d) => d.count === 0)).toBe(true);
  });
});

describe("upcomingDeadlines", () => {
  it("returns non-완료 tasks with a due date, soonest first", () => {
    const tasks = [
      makeTask({ id: "a", due_date: "2026-08-20", status: "진행중" }),
      makeTask({ id: "b", due_date: "2026-08-13", status: "예정" }),
      makeTask({ id: "c", due_date: "2026-08-15", status: "완료" }),
      makeTask({ id: "d", due_date: null, status: "진행중" }),
    ];
    const result = upcomingDeadlines(tasks);
    expect(result.map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("limits to the given count", () => {
    const tasks = Array.from({ length: 8 }, (_, i) =>
      makeTask({ id: String(i), due_date: `2026-08-${10 + i}`, status: "예정" })
    );
    const result = upcomingDeadlines(tasks, 3);
    expect(result).toHaveLength(3);
  });
});

describe("taskStatusEmoji", () => {
  const today = new Date("2026-08-12T00:00:00");

  it("returns ✅ for 완료 tasks", () => {
    expect(taskStatusEmoji(makeTask({ status: "완료" }), today)).toBe("✅");
  });

  it("returns 🔴 for overdue, non-완료 tasks", () => {
    const task = makeTask({ status: "진행중", due_date: "2026-08-01" });
    expect(taskStatusEmoji(task, today)).toBe("🔴");
  });

  it("returns 🟡 for non-완료, non-overdue tasks", () => {
    const task = makeTask({ status: "예정", due_date: "2026-08-20" });
    expect(taskStatusEmoji(task, today)).toBe("🟡");
  });
});

describe("dayStatusEmojis", () => {
  const today = new Date("2026-08-12T00:00:00");

  it("dedupes and caps at 3 emojis", () => {
    const tasks = [
      makeTask({ status: "완료" }),
      makeTask({ status: "완료" }),
      makeTask({ status: "진행중", due_date: "2026-08-01" }),
      makeTask({ status: "예정", due_date: "2026-08-20" }),
    ];
    expect(dayStatusEmojis(tasks, today)).toEqual(["✅", "🔴", "🟡"]);
  });

  it("returns an empty array for no tasks", () => {
    expect(dayStatusEmojis([], today)).toEqual([]);
  });
});
