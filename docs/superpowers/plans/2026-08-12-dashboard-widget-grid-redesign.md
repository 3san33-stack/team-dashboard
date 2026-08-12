# 대시보드 위젯 그리드 리뉴얼 + 멤버 선택 배경 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Talvex 스크린샷의 카드 그리드/체크리스트/캘린더 스타일을 `team-dashboard`에 이식하되 톤(화이트/블랙)은 유지하고, 무관한 위젯은 제외하며, `MemberSelect` 화면에 사용자 제공 소나무/달 사진 배경 + 커서 추적 달빛 글로우를 추가한다.

**Architecture:** 순수 파생 로직(주간 활동 집계, 마감임박 정렬, 상태 이모지 매핑)은 `lib/derived.ts`에 함수로 추가하고 vitest로 단위 테스트한다(기존 `isOverdue`/`averageProgress` 등과 동일 패턴). 신규 위젯 2개(`WeeklyActivityChart`, `UpcomingDeadlines`)는 이 로직을 소비하는 얇은 프레젠테이션 컴포넌트로, 기존 `Card` + `motion/react` 패턴을 그대로 따른다(신규 컴포넌트는 저장소 관례상 별도 테스트 없음). `TaskCalendar`는 셀 내부 렌더링만 교체한다. `app/page.tsx`는 `HeroBackground`를 제거하고 그리드를 재구성한다. `MemberSelect`는 `hero-background.tsx`의 스프링 글로우 패턴을 재사용해 커서 추적 달빛을 구현한다.

**Tech Stack:** Next.js (App Router), TypeScript, motion/react (이미 설치됨), lucide-react(체크 아이콘), vitest. 새 라이브러리 추가 없음.

---

### Task 1: `lib/derived.ts` — 주간 활동 집계 (`weeklyActivityCounts`)

**Files:**
- Modify: `lib/derived.ts`
- Test: `lib/derived.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/derived.test.ts`에 기존 `import` 목록에 `weeklyActivityCounts`를 추가하고, 파일 맨 아래에 다음 블록을 추가한다:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- derived`
Expected: FAIL — `weeklyActivityCounts is not defined` (or import error)

- [ ] **Step 3: Write minimal implementation**

`lib/derived.ts`에 추가 (파일 맨 아래):

```ts
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// Last 7 days ending today (oldest first), each bucket counting tasks whose
// updated_at (local calendar day, same KST convention as isOverdue) falls on
// that day and are 완료. Mirrors the spreadsheet's "완료 처리일" semantics —
// there's no separate completed_at column, so updated_at doubles as it.
export function weeklyActivityCounts(
  tasks: Task[],
  today: Date = new Date()
): { label: string; count: number }[] {
  const days: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  return days.map((day) => {
    const key = toLocalDateKey(day);
    const count = tasks.filter(
      (t) => t.status === "완료" && toLocalDateKey(new Date(t.updated_at)) === key
    ).length;
    return { label: WEEKDAY_LABELS[day.getDay()]!, count };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- derived`
Expected: PASS (all `weeklyActivityCounts` tests green)

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/D-045/Desktop/team-dashboard"
git add lib/derived.ts lib/derived.test.ts
git commit -m "feat: add weeklyActivityCounts for weekly activity chart"
```

---

### Task 2: `lib/derived.ts` — 마감임박 정렬 (`upcomingDeadlines`)

**Files:**
- Modify: `lib/derived.ts`
- Test: `lib/derived.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/derived.test.ts` import 목록에 `upcomingDeadlines` 추가, 파일 맨 아래에 추가:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- derived`
Expected: FAIL — `upcomingDeadlines is not defined`

- [ ] **Step 3: Write minimal implementation**

`lib/derived.ts`에 추가:

```ts
export function upcomingDeadlines(tasks: Task[], limit = 5): Task[] {
  return tasks
    .filter((t) => t.due_date !== null && t.status !== "완료")
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!))
    .slice(0, limit);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- derived`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/D-045/Desktop/team-dashboard"
git add lib/derived.ts lib/derived.test.ts
git commit -m "feat: add upcomingDeadlines for pending-actions widget"
```

---

### Task 3: `lib/derived.ts` — 상태 이모지 매핑 (`taskStatusEmoji`, `dayStatusEmojis`)

**Files:**
- Modify: `lib/derived.ts`
- Test: `lib/derived.test.ts`

- [ ] **Step 1: Write the failing test**

Import 목록에 `taskStatusEmoji`, `dayStatusEmojis` 추가, 파일 맨 아래에 추가:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- derived`
Expected: FAIL — `taskStatusEmoji is not defined`

- [ ] **Step 3: Write minimal implementation**

`lib/derived.ts`에 추가:

```ts
export function taskStatusEmoji(task: Task, today: Date = new Date()): "✅" | "🔴" | "🟡" {
  if (task.status === "완료") return "✅";
  if (isOverdue(task, today)) return "🔴";
  return "🟡";
}

export function dayStatusEmojis(dayTasks: Task[], today: Date = new Date()): string[] {
  const emojis = dayTasks.map((t) => taskStatusEmoji(t, today));
  return Array.from(new Set(emojis)).slice(0, 3);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- derived`
Expected: PASS — full `derived.test.ts` suite green

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/D-045/Desktop/team-dashboard"
git add lib/derived.ts lib/derived.test.ts
git commit -m "feat: add taskStatusEmoji/dayStatusEmojis for calendar badges"
```

---

### Task 4: 신규 위젯 — `WeeklyActivityChart`

**Files:**
- Create: `components/charts/weekly-activity-chart.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { weeklyActivityCounts } from "@/lib/derived";
import type { Task } from "@/lib/types";

type Props = { tasks: Task[] };

const BAR_MAX_HEIGHT = 128; // px, matches h-32 container

export function WeeklyActivityChart({ tasks }: Props) {
  const data = weeklyActivityCounts(tasks);
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>이번 주 완료 업무</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-32 items-end justify-between gap-2">
          {data.map((d, i) => (
            <div key={`${d.label}-${i}`} className="flex flex-1 flex-col items-center gap-1">
              <motion.div
                className="w-full rounded-t-md bg-primary"
                initial={{ height: 0 }}
                animate={{ height: (d.count / max) * BAR_MAX_HEIGHT }}
                transition={{ type: "spring", stiffness: 80, damping: 20, delay: i * 0.06 }}
              />
              <span className="text-xs text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors referencing `weekly-activity-chart.tsx`

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/D-045/Desktop/team-dashboard"
git add components/charts/weekly-activity-chart.tsx
git commit -m "feat: add WeeklyActivityChart widget"
```

---

### Task 5: 신규 위젯 — `UpcomingDeadlines`

**Files:**
- Create: `components/upcoming-deadlines.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { CheckIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { upcomingDeadlines } from "@/lib/derived";
import type { Task } from "@/lib/types";

type Props = { tasks: Task[] };

export function UpcomingDeadlines({ tasks }: Props) {
  const items = upcomingDeadlines(tasks);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>마감임박 업무</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">마감임박 업무가 없습니다</p>
        ) : (
          <>
            {items.map((task) => {
              const isChecked = checked.has(task.id);
              return (
                <div key={task.id} className="flex items-center gap-3 rounded-lg border p-2">
                  <button
                    type="button"
                    onClick={() => toggle(task.id)}
                    aria-pressed={isChecked}
                    aria-label={`${task.project} 체크`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/40"
                  >
                    <motion.span
                      initial={false}
                      animate={{ scale: isChecked ? 1 : 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <CheckIcon className="h-3 w-3" />
                    </motion.span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${
                        isChecked ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {task.project}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {task.member} · {task.due_date}
                    </p>
                  </div>
                </div>
              );
            })}
            <p className="pt-1 text-xs text-muted-foreground">
              완료 처리는 업무 목록에서 해주세요
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors referencing `upcoming-deadlines.tsx`

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/D-045/Desktop/team-dashboard"
git add components/upcoming-deadlines.tsx
git commit -m "feat: add UpcomingDeadlines widget"
```

---

### Task 6: `TaskCalendar` 셀을 이모지 배지로 교체

**Files:**
- Modify: `components/task-calendar.tsx`

- [ ] **Step 1: import 추가**

`components/task-calendar.tsx` 1번째 import 블록을 수정:

```ts
import { priorityColor, statusColor, dayStatusEmojis, toLocalDateKey } from "@/lib/derived";
```

- [ ] **Step 2: 날짜 셀 버튼을 `motion.button` + `layoutId`로 교체**

파일 상단 두 번째 import 줄(`import { useMemo, useState } from "react";`) 앞에 `import { motion } from "motion/react";`를 추가한다 (기존 `"use client";` 줄은 그대로 둔다):

```tsx
"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
```

셀 렌더링 부분(기존 `<button type="button" key={...} onClick={...} className=...>` 부터 `</button>`까지)을 교체:

```tsx
                return (
                  <motion.button
                    type="button"
                    key={toLocalDateKey(day)}
                    layoutId={`day-${toLocalDateKey(day)}`}
                    onClick={() => setSelectedDay(day)}
                    className={`h-20 overflow-hidden rounded-md border p-1 text-left text-xs transition-colors hover:bg-accent ${
                      inMonth ? "bg-card" : "bg-transparent opacity-40"
                    }`}
                  >
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{day.getDate()}</span>
                      {dayTasks.length > 0 && (
                        <span className="flex gap-0.5 text-[11px] leading-none">
                          {dayStatusEmojis(dayTasks).map((emoji, i) => (
                            <span key={i}>{emoji}</span>
                          ))}
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
```

이 교체로 기존의 `priorityColor` 도트 리스트 블록(`dayTasks.slice(0, 6).map...`)은 통째로 제거된다. `priorityColor`는 다이얼로그 쪽 `Badge`에서 계속 쓰이므로 import에서 지우지 않는다.

- [ ] **Step 3: 다이얼로그에 매칭 `layoutId` 추가**

`<DialogContent>` 바로 안쪽, `<DialogHeader>` 앞에 `motion.div`로 감싸 셀과 같은 `layoutId`를 공유시킨다:

```tsx
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent>
          <motion.div layoutId={selectedDay ? `day-${toLocalDateKey(selectedDay)}` : undefined}>
            <DialogHeader>
              <DialogTitle>
                {selectedDay &&
                  `${selectedDay.getFullYear()}년 ${selectedDay.getMonth() + 1}월 ${selectedDay.getDate()}일 업무`}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {/* 기존 selectedDayTasks 렌더링 내용은 그대로 유지 */}
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
```

(기존 `selectedDayTasks` 렌더링 JSX는 삭제하지 말고 그대로 `motion.div` 안으로 옮기기만 한다.)

- [ ] **Step 4: 타입 체크**

Run: `npx tsc --noEmit`
Expected: no errors referencing `task-calendar.tsx`

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/D-045/Desktop/team-dashboard"
git add components/task-calendar.tsx
git commit -m "feat: replace calendar dot indicators with status emoji badges + shared transition"
```

---

### Task 7: `app/page.tsx` 그리드 재구성 + 히어로 제거

**Files:**
- Modify: `app/page.tsx`
- Delete: `components/hero-background.tsx`

- [ ] **Step 1: import 정리**

`app/page.tsx` 상단 import 블록에서 `HeroBackground`, `CountUpNumber` import를 제거하고 신규 위젯을 추가:

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { MemberSelect } from "@/components/member-select";
import { SummaryCards } from "@/components/summary-cards";
import { MemberProgressBars } from "@/components/member-progress-bars";
import { TaskTable } from "@/components/task-table";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { ContributionReport } from "@/components/contribution-report";
import { TaskCalendar } from "@/components/task-calendar";
import { WeeklyActivityChart } from "@/components/charts/weekly-activity-chart";
import { UpcomingDeadlines } from "@/components/upcoming-deadlines";
import { Button } from "@/components/ui/button";
import { listTasks, createTask, updateTask, deleteTask } from "@/lib/supabase";
import { isOverdue } from "@/lib/derived";
import type { Member, Task, TaskInput } from "@/lib/types";
```

(`CountUpNumber`는 더 이상 `page.tsx`에서 직접 쓰지 않는다 — `SummaryCards` 내부에서 이미 사용 중이므로 그쪽은 영향 없음.)

- [ ] **Step 2: 반환 JSX의 히어로+그리드 블록 교체**

파일의 `return (...)` 중 `<div className="min-h-screen ...">`부터 `</main>`까지(기존 122~255행 구간, `HeroBackground` 전체와 `<main>` 내부 그리드)를 다음으로 교체한다. `editingTask` 다이얼로그 블록은 그대로 유지한다:

```tsx
  return (
    <div className="min-h-screen w-full space-y-6 bg-white p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-black sm:text-3xl">
          {member}님, 안녕하세요
        </h1>
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={switchMember}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-gray-800"
          >
            {member}님 · 전환
          </motion.button>
          <TaskFormDialog
            member={member}
            trigger={
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white sm:px-5"
              >
                업무 추가
              </motion.button>
            }
            onSubmit={handleCreate}
          />
        </div>
      </div>

      <main className="w-full space-y-8 px-1 sm:px-2 md:px-4">
        {actionError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {actionError}
          </p>
        )}

        <SummaryCards total={total} inProgress={inProgress} completed={completed} overdue={overdue} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <motion.div whileHover={{ y: -4 }}>
            <MemberProgressBars tasks={tasks} />
          </motion.div>
          <motion.div whileHover={{ y: -4 }}>
            <WeeklyActivityChart tasks={tasks} />
          </motion.div>
          <motion.div whileHover={{ y: -4 }}>
            <UpcomingDeadlines tasks={tasks} />
          </motion.div>
        </div>

        <TaskTable tasks={tasks} onEdit={setEditingTask} onDelete={handleDelete} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <motion.div whileHover={{ y: -4 }}>
            <ContributionReport tasks={tasks} />
          </motion.div>
          <motion.div whileHover={{ y: -4 }}>
            <TaskCalendar tasks={tasks} />
          </motion.div>
        </div>

        {editingTask && (
          <TaskFormDialog
            key={editingTask.id}
            member={editingTask.member}
            task={editingTask}
            open={true}
            onOpenChange={(open) => !open && setEditingTask(null)}
            onSubmit={(input) => handleUpdate(editingTask.id, input)}
          />
        )}
      </main>
    </div>
  );
```

- [ ] **Step 3: 사용 중단된 `HeroBackground` 삭제**

```bash
cd "C:/Users/D-045/Desktop/team-dashboard"
rm components/hero-background.tsx
```

- [ ] **Step 4: 타입 체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors (특히 미사용 import 관련 경고 없는지 확인)

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/D-045/Desktop/team-dashboard"
git add app/page.tsx
git rm components/hero-background.tsx
git commit -m "feat: restructure dashboard into widget grid, drop blob hero"
```

---

### Task 8: `MemberSelect` 배경 이미지 + 커서 추적 달빛 + 흔들림

**Files:**
- Create: `public/member-select-bg.jpg` (사용자 제공 이미지 복사)
- Modify: `components/member-select.tsx`

- [ ] **Step 1: 이미지 복사**

```bash
cd "C:/Users/D-045/Desktop/team-dashboard"
cp "C:/Users/D-045/Desktop/9fbc9f3d-8e97-43b0-aaa0-6575c14feec9.jpg" public/member-select-bg.jpg
```

- [ ] **Step 2: `MemberSelect` 전체 교체**

`components/member-select.tsx` 전체를 다음으로 교체:

```tsx
"use client";

import { useState, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { MEMBERS, type Member } from "@/lib/types";

type Props = { onSelect: (member: Member) => void };

export function MemberSelect({ onSelect }: Props) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const glowX = useSpring(rawX, { stiffness: 100, damping: 20, mass: 0.4 });
  const glowY = useSpring(rawY, { stiffness: 100, damping: 20, mass: 0.4 });
  const [hasMoved, setHasMoved] = useState(false);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    rawX.set(e.clientX - rect.left);
    rawY.set(e.clientY - rect.top);
    if (!hasMoved) setHasMoved(true);
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-black"
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/member-select-bg.jpg)" }}
        animate={{ rotate: [-1, 1, -1], scale: [1, 1.02, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {hasMoved && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute h-[360px] w-[360px] rounded-full bg-white/40 blur-3xl"
          style={{
            x: glowX,
            y: glowY,
            translateX: "-50%",
            translateY: "-50%",
            mixBlendMode: "screen",
          }}
        />
      )}

      <h1 className="relative z-10 text-2xl font-semibold text-white drop-shadow-lg">
        누구신가요?
      </h1>
      <div className="relative z-10 flex flex-wrap justify-center gap-4">
        {MEMBERS.map((member, i) => (
          <motion.div
            key={member}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -4 }}
          >
            <Card
              role="button"
              tabIndex={0}
              className="w-32 cursor-pointer border-white/40 bg-white/70 text-center backdrop-blur-md transition-shadow hover:shadow-lg"
              onClick={() => onSelect(member)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(member);
                }
              }}
            >
              <CardContent className="py-6 text-lg font-medium">{member}</CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: no errors referencing `member-select.tsx`

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/D-045/Desktop/team-dashboard"
git add public/member-select-bg.jpg components/member-select.tsx
git commit -m "feat: add pine/moon background with cursor-tracking moonlight to member select"
```

---

### Task 9: 전체 검증

**Files:** none (검증 전용)

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `npm test`
Expected: PASS — 기존 `export-csv.test.ts` 포함 전체 그린

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공, 타입/린트 에러 없음

- [ ] **Step 3: 브라우저 수동 확인**

`npm run dev` 실행 후 브라우저에서:
- 멤버 선택 화면: 배경 사진, 흔들림, 커서 이동 시 달빛 글로우가 따라오는지 확인
- 대시보드: 3열 그리드(멤버 진행률/주간 활동/마감임박)와 카드 호버 리프트 확인
- Pending Actions 체크박스 클릭 시 체크 애니메이션 + 취소선, 새로고침하면 원복되는지 확인
- 캘린더 셀에 이모지 배지 표시, 클릭 시 다이얼로그 트랜지션 확인

- [ ] **Step 4: 최종 커밋(필요 시)**

검증 중 수정 사항이 있었다면:

```bash
cd "C:/Users/D-045/Desktop/team-dashboard"
git add -A
git commit -m "fix: address issues found during manual verification"
```
