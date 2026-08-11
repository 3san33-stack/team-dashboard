# 기여율 리포트 + 캘린더 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 `team-dashboard`에 (1) 팀원별 카테고리 기여율 계산, (2) 팀 전체 업무구분 분포 원형 차트 + 팀원별 기여율 막대 차트로 구성된 "한눈에 보기" 리포트 섹션, (3) 마감일 기준 월간 캘린더(이름 선택 필터 포함)를 추가한다.

**Architecture:** 기존 `lib/derived.ts`에 순수 함수를 추가해 기여율/분포를 계산하고, 새 컴포넌트 2개(`contribution-report.tsx`, `task-calendar.tsx`)를 만들어 `app/page.tsx`에 조합한다. 원본 엑셀의 기여율 수식(`제품개발 업무 수 / 해당 월 전체 업무 수`)을 일반화해 모든 업무구분에 적용한다.

**Tech Stack:** 기존 스택 그대로 (Next.js, shadcn/ui, bklit-ui pie chart, motion, Vitest). 새 의존성 없음(캘린더는 직접 그리드로 구현, 라이브러리 불필요).

---

## File Structure

- `lib/derived.ts` — 함수 추가: `monthCategoryContribution`, `teamCategoryDistribution`
- `lib/derived.test.ts` — 위 함수 테스트 추가
- `components/contribution-report.tsx` — 원형 차트(팀 전체 분포) + 팀원별 카테고리 기여율 막대
- `components/task-calendar.tsx` — 월간 캘린더 그리드 + 담당자 필터
- `app/page.tsx` — 두 섹션 조합 (수정)

---

### Task R1: 기여율/분포 계산 로직 (TDD)

**Files:**
- Modify: `lib/derived.ts`
- Modify: `lib/derived.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/derived.test.ts`에 추가:
```ts
import { monthCategoryContribution, teamCategoryDistribution } from "./derived";

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
```
(`makeTask`/`CATEGORIES` import already exist at the top of `derived.test.ts` from earlier tasks — reuse them, add `import { CATEGORIES } from "./types";` if not already imported.)

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm test`
Expected: FAIL — functions don't exist yet

- [ ] **Step 3: 구현**

`lib/derived.ts`에 추가:
```ts
import { CATEGORIES, type Category } from "./types";

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
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm test`
Expected: PASS (all previous 8 tests + 5 new tests = 13)

- [ ] **Step 5: 커밋**

```bash
git add lib/derived.ts lib/derived.test.ts
git commit -m "feat: add category contribution and team distribution calculations"
```

---

### Task R2: 원형 차트 + 팀원별 기여율 막대 (리포트 섹션)

**Files:**
- Create: `components/contribution-report.tsx`

- [ ] **Step 1: bklit-ui pie/donut chart 설치**

Run: `echo n | npx shadcn@latest add @bklit/pie-chart` (utils.ts 등 기존 파일 덮어쓰기 프롬프트는 n으로 응답)

**중요:** 실제로 생성되는 파일 경로와 컴포넌트 이름(`components/charts/pie.tsx`의 `Pie` 인지, 다른 이름인지), 필요한 props(데이터 형식이 `{label, value}[]`인지 `{category, count}[]`를 바로 못 받는지 등)는 설치 후 실제 생성된 소스 파일을 열어서 확인하고 그에 맞게 아래 컴포넌트를 작성한다. `todo-dashboard`/`team-dashboard`의 기존 gauge/line/heatmap 설치 경험상, 계획에 적힌 예시 코드와 실제 API가 다를 수 있다 — 반드시 실제 파일을 읽고 맞출 것.

- [ ] **Step 2: 컴포넌트 작성**

`components/contribution-report.tsx` (아래는 목표 UI/동작 명세 — 정확한 import/props는 Step 1에서 확인한 실제 API로 채운다):

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEMBERS, CATEGORIES, type Task } from "@/lib/types";
import { monthCategoryContribution, teamCategoryDistribution } from "@/lib/derived";
// import the actual bklit-ui pie chart component here, per Step 1's findings

type Props = { tasks: Task[] };

const CATEGORY_COLORS: Record<(typeof CATEGORIES)[number], string> = {
  "제품개발": "#6366f1",
  "타부서(팀)지원": "#22c55e",
  "조직연구": "#f59e0b",
  "샘플제직": "#06b6d4",
  "생산지원": "#ec4899",
  "기타업무": "#a3a3a3",
  "OKR": "#8b5cf6",
};

export function ContributionReport({ tasks }: Props) {
  const now = new Date();
  const distribution = teamCategoryDistribution(tasks);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>업무구분별 분포 (전체)</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Render the bklit-ui pie/donut chart here, fed `distribution`
              (category + count pairs) with CATEGORY_COLORS per slice.
              If every count is 0 (no tasks yet), show a simple
              "표시할 데이터가 없습니다" message instead of an empty chart. */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>팀원별 이번 달 기여율</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {MEMBERS.map((member) => (
            <div key={member} className="space-y-1">
              <div className="text-sm font-medium">{member}</div>
              <div className="space-y-1">
                {CATEGORIES.map((category) => {
                  const percent = monthCategoryContribution(
                    tasks, member, category, now.getFullYear(), now.getMonth() + 1
                  );
                  if (percent === 0) return null;
                  return (
                    <div key={category} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[category] }}
                      />
                      <span className="w-28 text-muted-foreground">{category}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${percent}%`, backgroundColor: CATEGORY_COLORS[category] }}
                        />
                      </div>
                      <span className="w-10 text-right text-muted-foreground">{percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

Implementer discretion: if a member has zero tasks this month, show "이번 달 업무 없음" instead of an empty list. Keep the per-member breakdown as plain styled bars (not another chart library call) — only the team-wide distribution needs the actual bklit-ui pie/donut chart.

- [ ] **Step 3: 타입 체크 및 커밋**

Run: `npx tsc --noEmit`

```bash
git add components/contribution-report.tsx components/charts
git commit -m "feat: add team category distribution pie chart and per-member contribution report"
```

---

### Task R3: 마감일 기준 월간 캘린더 (담당자 필터)

**Files:**
- Create: `components/task-calendar.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`components/task-calendar.tsx`:
```tsx
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MEMBERS, type Task } from "@/lib/types";
import { priorityColor } from "@/lib/derived";

type Props = { tasks: Task[] };

function startOfMonthGrid(year: number, month: number): Date {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function TaskCalendar({ tasks }: Props) {
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() }; // month: 0-11
  });

  const filtered = tasks.filter(
    (t) => (memberFilter === "all" || t.member === memberFilter) && t.due_date
  );

  const weeks = useMemo(() => {
    const gridStart = startOfMonthGrid(cursor.year, cursor.month);
    const days: Date[] = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      return d;
    });
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7));
    return result;
  }, [cursor]);

  function tasksOn(day: Date) {
    const key = toLocalDateKey(day); // NOT day.toISOString().slice(0,10) — that shifts a day back in KST (UTC+9)
    return filtered.filter((t) => t.due_date === key);
  }

  function changeMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>
          {cursor.year}년 {cursor.month + 1}월 업무 캘린더
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={memberFilter} onValueChange={(v) => v && setMemberFilter(v)}>
            <SelectTrigger className="w-32"><SelectValue placeholder="담당자" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체보기</SelectItem>
              {MEMBERS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>이전</Button>
          <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>다음</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="pb-1">{d}</div>
          ))}
        </div>
        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((day) => {
                const inMonth = day.getMonth() === cursor.month;
                const dayTasks = tasksOn(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-20 rounded-md border p-1 text-xs ${
                      inMonth ? "bg-card" : "bg-transparent opacity-40"
                    }`}
                  >
                    <div className="mb-1 text-muted-foreground">{day.getDate()}</div>
                    <div className="space-y-0.5">
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          className={`truncate rounded px-1 py-0.5 text-white ${priorityColor(t.priority)}`}
                          title={`${t.member} · ${t.project}`}
                        >
                          {t.member} · {t.project}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

Note: `onValueChange={(v) => v && setMemberFilter(v)}` follows the established Base UI Select null-guard pattern from `task-table.tsx`/`task-form-dialog.tsx`. Verify this compiles the same way; adjust to the exact established pattern if it differs.

- [ ] **Step 2: 타입 체크 및 커밋**

Run: `npx tsc --noEmit`

```bash
git add components/task-calendar.tsx
git commit -m "feat: add due-date monthly calendar with per-member filter"
```

---

### Task R4: 메인 페이지에 조합

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 새 섹션 추가**

`app/page.tsx`의 `TaskTable` 아래, `editingTask` 다이얼로그 위에 추가:
```tsx
import { ContributionReport } from "@/components/contribution-report";
import { TaskCalendar } from "@/components/task-calendar";

// ... inside the returned JSX, after the grid with MemberProgressBars/TaskTable:
<ContributionReport tasks={tasks} />
<TaskCalendar tasks={tasks} />
```

- [ ] **Step 2: 개발 서버 실행 및 실제 Supabase 데이터로 수동 확인**

Run: `npm run dev`
Expected:
- 원형 차트가 실제 업무구분 분포를 반영해 렌더링됨 (업무가 없으면 빈 상태 메시지)
- 팀원별 기여율 막대가 이번 달 데이터 기준으로 표시됨
- 캘린더에 마감일이 있는 업무가 해당 날짜 칸에 표시됨
- 캘린더 담당자 드롭다운에서 특정 이름을 선택하면 그 사람 업무만 남고, "전체보기"로 되돌리면 다시 다 보임
- 이전/다음 버튼으로 월 이동 시 정상 동작

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 4: 커밋**

```bash
git add app/page.tsx
git commit -m "feat: add contribution report and task calendar to dashboard"
```

---

## Self-Review Notes

- 기여율 계산은 원본 엑셀의 "제품개발 기여율" 수식(해당 월 해당 카테고리 업무 수 / 해당 월 전체 업무 수)을 모든 업무구분에 일반화했다 — "완료" 여부와 무관하게 원본 엑셀 개인 시트(`이은혜!L7` 등)의 정의를 따랐다 (부서장님 보고 시트의 완료-only 버전이 아님). 사용자가 "완료된 업무만 반영"을 원하면 후속 조정 필요.
- 캘린더는 `due_date` 기준으로 배치한다(엑셀의 "8월 달력" 시트는 담당자별 텍스트 나열이었지만, 우리 데이터 모델은 업무 단위로 마감일이 있으므로 이 방식이 더 정확하다).
- bklit-ui pie chart의 정확한 API는 설치 시점에 실제 파일을 열어 확인 후 구현한다 (Task R2 Step 1에 명시).
