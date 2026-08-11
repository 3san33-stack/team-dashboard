# 트렌드 라인차트 + 활동 히트맵 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `team-dashboard`에 bklit-ui의 line-chart와 heatmap-chart를 추가로 활용해 (1) 최근 6개월 팀 업무 등록 추이 라인차트, (2) 마감일 기준 업무 밀집도 히트맵을 넣는다.

**Architecture:** `lib/derived.ts`에 두 순수 함수를 추가하고, 새 컴포넌트 2개를 만들어 `app/page.tsx`에 조합한다. bklit-ui의 `LineChart`/`Line`/`Grid`/`XAxis`와 `HeatmapChart`/`HeatmapCells` API는 이미 `todo-dashboard` 프로젝트(`components/trend-chart.tsx`, `components/monthly-heatmap.tsx`, `lib/heatmap.ts`)에서 검증됐으므로 그 패턴을 그대로 재사용한다 — API를 처음부터 다시 탐색할 필요 없음.

**Tech Stack:** 기존 스택 그대로. bklit-ui `@bklit/line-chart`, `@bklit/heatmap-chart` 신규 설치.

---

## Reference (이미 검증된 실제 API — todo-dashboard에서 그대로 가져옴)

`components/charts/line-chart.tsx`의 `LineChart`는 합성 컴포넌트:
```tsx
import { Grid } from "@/components/charts/grid";
import { Line, LineChart } from "@/components/charts/line-chart";
import { XAxis } from "@/components/charts/x-axis";

<LineChart data={data} xDataKey="date">
  <Grid />
  <XAxis />
  <Line dataKey="count" />
</LineChart>
```

`components/charts/heatmap/`의 `HeatmapChart`는 `HeatmapColumn[]`(주 단위 컬럼 × 요일 bin, `{bin, bins: [{bin, date, count}]}`) 형식을 받는다:
```tsx
import { HeatmapCells, HeatmapChart } from "@/components/charts/heatmap";

<HeatmapChart data={columns} layout="fluid">
  <HeatmapCells />
</HeatmapChart>
```
`count`는 0~4 정수로 레벨을 표현한다(간격 기반 스케일).

**주의:** team-dashboard는 아직 이 두 컴포넌트를 설치하지 않았다. 설치 후 실제 생성된 파일이 위 참고와 다르면(과거 프로젝트마다 미묘하게 달랐던 전례가 있음), 실제 파일을 열어 확인하고 그에 맞춰 조정한다.

---

## File Structure

- `lib/derived.ts` — 함수 추가: `monthlyTaskCounts`, `dueDateHeatmapColumns`
- `lib/derived.test.ts` — 테스트 추가
- `components/task-trend-chart.tsx` — 최근 6개월 업무 등록 추이 라인차트
- `components/task-activity-heatmap.tsx` — 마감일 기준 업무 밀집도 히트맵
- `app/page.tsx` — 두 섹션 조합 (수정)

---

### Task L1: 월별 업무량 + 히트맵 데이터 계산 (TDD)

**Files:**
- Modify: `lib/derived.ts`
- Modify: `lib/derived.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/derived.test.ts`에 추가:
```ts
import { monthlyTaskCounts, dueDateHeatmapColumns } from "./derived";

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
    const allBins = columns.flatMap((c) => c.bins);
    const byKey = new Map(
      allBins.map((b) => [b.date.toISOString().slice(0, 10), b.count])
    );
    expect(byKey.get("2026-08-11")).toBe(4);
    expect(byKey.get("2026-08-12")).toBe(1);
  });
});
```
(`makeTask`가 `created_at`을 override 가능한지 확인 — 기존 `derived.test.ts`의 `makeTask` 헬퍼는 이미 `created_at: "2026-01-01T00:00:00Z"` 기본값을 갖고 있으므로 override만 하면 됨.)

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm test`
Expected: FAIL — 함수 없음

- [ ] **Step 3: 구현**

`lib/derived.ts`에 추가 (`HeatmapColumn` 타입은 `todo-dashboard`의 `lib/heatmap.ts`에서 썼던 것과 동일하게 `@/components/charts/heatmap`에서 가져온다 — Task H2에서 heatmap-chart를 설치한 뒤에만 이 타입을 import할 수 있으므로, **Task L1은 heatmap-chart 설치 이후(Task H1) 순서로 재배치하거나, `dueDateHeatmapColumns`의 반환 타입을 로컬로 선언**한다. 아래처럼 로컬 타입으로 선언해 순서 의존성을 없앤다):

```ts
export function monthlyTaskCounts(
  tasks: Task[], monthsBack: number, today: Date = new Date()
): { month: string; count: number }[] {
  const result: { month: string; count: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const count = tasks.filter((t) => {
      const created = new Date(t.created_at);
      return (
        created.getFullYear() === d.getFullYear() &&
        created.getMonth() === d.getMonth()
      );
    }).length;
    result.push({ month: key, count });
  }
  return result;
}

type HeatmapBin = { bin: number; date: Date; count: number };
type HeatmapColumnLocal = { bin: number; bins: HeatmapBin[] };

export function dueDateHeatmapColumns(tasks: Task[]): HeatmapColumnLocal[] {
  const dueDates = tasks.map((t) => t.due_date).filter((d): d is string => !!d);
  if (dueDates.length === 0) return [];

  const counts = new Map<string, number>();
  for (const d of dueDates) counts.set(d, (counts.get(d) ?? 0) + 1);

  const sorted = [...dueDates].sort();
  const start = new Date(`${sorted[0]}T00:00:00`);
  const end = new Date(`${sorted[sorted.length - 1]}T00:00:00`);
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const columns: HeatmapColumnLocal[] = [];
  const colDate = new Date(weekStart);
  let colIndex = 0;
  while (colDate <= end) {
    const bins: HeatmapBin[] = Array.from({ length: 7 }, (_, day) => {
      const d = new Date(colDate);
      d.setDate(d.getDate() + day);
      const key = d.toISOString().slice(0, 10);
      const count = counts.get(key) ?? 0; // don't cap — HeatmapCells buckets 0-4 for color internally, and the tooltip needs the true count
      return { bin: day, date: d, count };
    });
    columns.push({ bin: colIndex, bins });
    colDate.setDate(colDate.getDate() + 7);
    colIndex++;
  }
  return columns;
}
```

**중요:** `dueDateHeatmapColumns`의 날짜 키 생성에 `d.toISOString().slice(0,10)`을 쓰고 있는데, 이는 `task-calendar.tsx`에서 이미 발견/수정한 것과 동일한 KST off-by-one 버그를 재도입할 위험이 있다. 실제 구현 시 반드시 `task-calendar.tsx`의 `toLocalDateKey` 패턴(로컬 Y/M/D 직접 조합)을 재사용하거나 동일하게 구현할 것 — `lib/derived.ts`에 `toLocalDateKey`를 추출해서 `dueDateHeatmapColumns`와 `task-calendar.tsx` 양쪽에서 공유하는 것을 권장한다 (`task-calendar.tsx`도 이번 기회에 import로 바꾸면 중복 제거됨 — 다만 필수는 아니고 시간 되면).

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm test`
Expected: PASS (기존 13 + 신규 4 = 17)

- [ ] **Step 5: 커밋**

```bash
git add lib/derived.ts lib/derived.test.ts
git commit -m "feat: add monthly task count and due-date heatmap calculations"
```

---

### Task L2: 월별 업무 등록 추이 라인차트

**Files:**
- Create: `components/task-trend-chart.tsx`

- [ ] **Step 1: bklit-ui LineChart 설치**

Run: `echo n | npx shadcn@latest add @bklit/line-chart` (기존 파일 덮어쓰기 프롬프트는 n으로 응답)

실제 생성된 `components/charts/line-chart.tsx`, `line.tsx`, `grid.tsx`, `x-axis.tsx`를 열어 API가 위 "Reference" 섹션과 같은지 확인 후 진행.

- [ ] **Step 2: 컴포넌트 작성**

`components/task-trend-chart.tsx`:
```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid } from "@/components/charts/grid";
import { Line, LineChart } from "@/components/charts/line-chart";
import { XAxis } from "@/components/charts/x-axis";
import { monthlyTaskCounts } from "@/lib/derived";
import type { Task } from "@/lib/types";

type Props = { tasks: Task[] };

export function TaskTrendChart({ tasks }: Props) {
  const data = monthlyTaskCounts(tasks, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 6개월 업무 등록 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <LineChart data={data} xDataKey="month">
          <Grid />
          <XAxis />
          <Line dataKey="count" />
        </LineChart>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: 타입 체크 및 커밋**

Run: `npx tsc --noEmit`

```bash
git add components/task-trend-chart.tsx components/charts
git commit -m "feat: add monthly task registration trend line chart"
```

---

### Task H1: 마감일 밀집도 히트맵

**Files:**
- Create: `components/task-activity-heatmap.tsx`

- [ ] **Step 1: bklit-ui Heatmap 설치**

Run: `yes n | npx shadcn@latest add @bklit/heatmap-chart` (기존 파일 덮어쓰기 프롬프트 모두 n으로 응답 — 여러 번 뜰 수 있음)

실제 생성된 `components/charts/heatmap/` 하위 파일들을 확인. **`chart-loading-label.tsx`에 잘못된 상대경로 버그(`../components/shimmering-text` → `../shimmering-text`여야 함)가 있었던 전례가 있으니, 설치 후 `npx tsc --noEmit`에서 이 에러가 나면 같은 방식으로 수정할 것.**

- [ ] **Step 2: 컴포넌트 작성**

`components/task-activity-heatmap.tsx`:
```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeatmapCells, HeatmapChart } from "@/components/charts/heatmap";
import { dueDateHeatmapColumns } from "@/lib/derived";
import type { Task } from "@/lib/types";

type Props = { tasks: Task[] };

export function TaskActivityHeatmap({ tasks }: Props) {
  const columns = dueDateHeatmapColumns(tasks);

  return (
    <Card>
      <CardHeader>
        <CardTitle>마감일 밀집도</CardTitle>
      </CardHeader>
      <CardContent>
        {columns.length === 0 ? (
          <p className="text-sm text-muted-foreground">표시할 마감일 데이터가 없습니다.</p>
        ) : (
          <HeatmapChart data={columns} layout="fluid">
            <HeatmapCells />
          </HeatmapChart>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: 타입 체크, 테스트, 커밋**

Run: `npx tsc --noEmit && npm test`

```bash
git add components/task-activity-heatmap.tsx components/charts/heatmap
git commit -m "feat: add due-date density heatmap"
```

---

### Task W: 메인 페이지 조합

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 새 섹션 추가**

`ContributionReport`/`TaskCalendar` 사이 또는 이후에 추가:
```tsx
import { TaskTrendChart } from "@/components/task-trend-chart";
import { TaskActivityHeatmap } from "@/components/task-activity-heatmap";

// JSX 내:
<TaskTrendChart tasks={tasks} />
<TaskActivityHeatmap tasks={tasks} />
```

- [ ] **Step 2: 개발 서버 실행 및 실제 Supabase 데이터로 수동 확인**

Run: `npm run dev`
Expected: 라인차트가 최근 6개월 등록 추이를 보여줌(데이터가 최근 1~2개월에 몰려 있어도 정상), 히트맵이 마감일 있는 업무를 정확한 날짜에 표시(캘린더와 같은 날짜로 일치하는지 교차 확인).

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 4: 커밋**

```bash
git add app/page.tsx
git commit -m "feat: add trend chart and activity heatmap to dashboard"
```

---

## Self-Review Notes

- `dueDateHeatmapColumns`의 날짜 키 생성이 `task-calendar.tsx`에서 이미 고친 KST 버그를 재도입하지 않도록 Task L1 구현 시 반드시 로컬 날짜 방식을 쓸 것 (계획 본문에 경고 포함).
- `monthlyTaskCounts`는 `created_at`(업무 등록 시각) 기준, 히트맵은 `due_date`(마감일) 기준 — 서로 다른 날짜 필드를 쓰는 이유를 각 컴포넌트/함수 주석에 남길 것.
- **주의:** 이 문서의 Task L1 코드 예시(`Math.min(counts.get(key) ?? 0, 4)`로 캡핑)는 계획 초안 당시의 설계이며, 실제 구현/코드 리뷰 과정에서 버그로 확인되어 제거됐다(캡핑이 히트맵 툴팁의 정확한 건수 표시를 왜곡함). 실제 동작은 `lib/derived.ts`와 커밋 `43c5279`을 기준으로 볼 것 — 이 문서의 예시 코드를 그대로 복사하지 말 것.
