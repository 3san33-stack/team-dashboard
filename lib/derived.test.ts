import { describe, it, expect } from "vitest";
import {
  isOverdue,
  averageProgress,
  statusColor,
  priorityColor,
  monthCategoryContribution,
  teamCategoryDistribution,
  taskMatchesQuery,
  memberSummary,
  upcomingDeadlines,
  taskStatusEmoji,
  dayStatusEmojis,
  summarizeUploadLogs,
  uploadCountOnDay,
  uploadCountFor,
} from "./derived";
import type { Task, UploadLog } from "./types";
import { CATEGORIES } from "./types";

function makeLog(overrides: Partial<UploadLog>): UploadLog {
  return {
    id: "1",
    member: "구민석",
    category: "신규",
    created_at: "2026-08-11T00:00:00Z",
    ...overrides,
  };
}

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

describe("monthCategoryContribution date fallback", () => {
  it("falls back to due_date when start_date is missing", () => {
    const tasks = [
      makeTask({ member: "구민석", category: "제품개발", start_date: null, due_date: "2026-08-20" }),
      makeTask({ member: "구민석", category: "조직연구", start_date: null, due_date: "2026-08-25" }),
    ];
    expect(monthCategoryContribution(tasks, "구민석", "제품개발", 2026, 8)).toBe(50);
  });

  it("still prefers start_date when both exist", () => {
    const tasks = [
      makeTask({ member: "구민석", category: "제품개발", start_date: "2026-07-01", due_date: "2026-08-20" }),
    ];
    expect(monthCategoryContribution(tasks, "구민석", "제품개발", 2026, 8)).toBe(0);
    expect(monthCategoryContribution(tasks, "구민석", "제품개발", 2026, 7)).toBe(100);
  });
});

describe("memberSummary", () => {
  const today = new Date("2026-08-12T00:00:00");

  it("aggregates counts and average progress for one member, ignoring other members", () => {
    const tasks = [
      makeTask({ member: "구민석", status: "진행중", progress: 40 }),
      makeTask({ member: "구민석", status: "완료", progress: 100, category: "제품개발" }),
      makeTask({ member: "구민석", status: "예정", progress: 0, due_date: "2026-08-01" }), // overdue
      makeTask({ member: "안도현", status: "완료", progress: 100, category: "제품개발" }), // 타인 제외
    ];
    const result = memberSummary(tasks, "구민석", today);
    expect(result).toEqual({
      total: 3,
      inProgress: 1,
      completed: 1,
      overdue: 1,
      avgProgress: 47, // (40+100+0)/3 rounded
      completedProductDev: 1,
    });
  });

  it("returns all-zero for a member with no tasks", () => {
    const result = memberSummary([], "구민석", today);
    expect(result).toEqual({
      total: 0, inProgress: 0, completed: 0, overdue: 0, avgProgress: 0, completedProductDev: 0,
    });
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

describe("summarizeUploadLogs", () => {
  // 2026-08-11 is a Tuesday. That week runs Mon 2026-08-10 ~ Sun 2026-08-16.
  const now = new Date("2026-08-11T12:00:00");

  it("counts logs within the current week per member/category", () => {
    const logs = [
      makeLog({ id: "1", member: "구민석", category: "신규", created_at: "2026-08-10T00:00:01" }), // Mon, in range
      makeLog({ id: "2", member: "구민석", category: "신규", created_at: "2026-08-16T23:59:59" }), // Sun, in range
      makeLog({ id: "3", member: "구민석", category: "수정", created_at: "2026-08-11T09:00:00" }),
      makeLog({ id: "4", member: "안도현", category: "동일", created_at: "2026-08-12T09:00:00" }),
    ];
    const result = summarizeUploadLogs(logs, "week", now);
    expect(result.구민석.신규).toBe(2);
    expect(result.구민석.수정).toBe(1);
    expect(result.구민석.동일).toBe(0);
    expect(result.안도현.동일).toBe(1);
  });

  it("excludes logs from the previous week", () => {
    const logs = [
      makeLog({ id: "1", member: "구민석", category: "신규", created_at: "2026-08-09T23:59:59" }), // Sun, previous week
    ];
    const result = summarizeUploadLogs(logs, "week", now);
    expect(result.구민석.신규).toBe(0);
  });

  it("counts logs within the current month, including the last day", () => {
    const logs = [
      makeLog({ id: "1", member: "안도현", category: "수정", created_at: "2026-08-01T00:00:01" }),
      makeLog({ id: "2", member: "안도현", category: "수정", created_at: "2026-08-31T23:59:59" }),
      makeLog({ id: "3", member: "안도현", category: "수정", created_at: "2026-09-01T00:00:00" }), // next month, excluded
    ];
    const result = summarizeUploadLogs(logs, "month", now);
    expect(result.안도현.수정).toBe(2);
  });
});

describe("uploadCountOnDay", () => {
  it("counts all members/categories logged on the given local day", () => {
    const day = new Date("2026-08-11T00:00:00");
    const logs = [
      makeLog({ id: "1", member: "구민석", category: "신규", created_at: "2026-08-11T01:00:00" }),
      makeLog({ id: "2", member: "안도현", category: "동일", created_at: "2026-08-11T23:59:00" }),
      makeLog({ id: "3", member: "구민석", category: "수정", created_at: "2026-08-12T00:00:01" }), // next day
    ];
    expect(uploadCountOnDay(logs, day)).toBe(2);
  });

  it("returns 0 for a day with no logs", () => {
    expect(uploadCountOnDay([], new Date("2026-08-11T00:00:00"))).toBe(0);
  });
});

describe("uploadCountFor", () => {
  it("counts only the given member+category on the given day", () => {
    const day = new Date("2026-08-11T00:00:00");
    const logs = [
      makeLog({ id: "1", member: "구민석", category: "신규", created_at: "2026-08-11T01:00:00" }),
      makeLog({ id: "2", member: "구민석", category: "신규", created_at: "2026-08-11T02:00:00" }),
      makeLog({ id: "3", member: "구민석", category: "수정", created_at: "2026-08-11T03:00:00" }), // different category
      makeLog({ id: "4", member: "안도현", category: "신규", created_at: "2026-08-11T04:00:00" }), // different member
      makeLog({ id: "5", member: "구민석", category: "신규", created_at: "2026-08-12T01:00:00" }), // different day
    ];
    expect(uploadCountFor(logs, day, "구민석", "신규")).toBe(2);
    expect(uploadCountFor(logs, day, "구민석", "수정")).toBe(1);
    expect(uploadCountFor(logs, day, "안도현", "신규")).toBe(1);
  });
});
