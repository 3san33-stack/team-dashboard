# 업로드 기록 위젯 + 샘플 요청 수정 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구민석/안도현이 파일 업로드할 때마다 신규/수정/동일 건수를 버튼 한 번으로 기록하고 주간/월간 합산을 볼 수 있는 위젯을 추가하고, 샘플 제직 요청에 빠져있던 수정 기능을 채워 넣는다.

**Architecture:** 신규 Supabase 테이블 `upload_logs`(이벤트 로그, 한 번 클릭 = 한 행) + `lib/derived.ts`의 순수 집계 함수 `summarizeUploadLogs` + 자기완결형 위젯 `UploadLogWidget`(기존 `PersonalTodo`/`SampleRequestBoard`와 동일하게 스스로 데이터를 fetch). 샘플 요청 수정은 `TaskFormDialog`가 이미 쓰고 있는 등록/수정 겸용 다이얼로그 패턴을 `SampleRequestFormDialog`에 그대로 적용한다.

**Tech Stack:** Next.js 16, TypeScript, Supabase (`@supabase/supabase-js`), shadcn/ui, vitest.

**Spec:** `docs/superpowers/specs/2026-08-25-upload-log-and-sample-request-edit-design.md`

---

## 설계 참고: 따라야 할 기존 패턴

- 자기완결형 위젯: `components/sample-request-board.tsx` 패턴 (컴포넌트 내부 `useEffect` fetch, 로컬 `error`/`loaded` state, 낙관적 갱신 + 실패 시 롤백)
- 등록/수정 겸용 다이얼로그: `components/task-form-dialog.tsx`가 `task?: Task`, `open?`, `onOpenChange?` prop으로 두 모드를 겸하는 방식 그대로
- CRUD 함수: `lib/supabase.ts`의 기존 함수들과 동일하게 에러 시 `throw error`
- 순수 함수 + 테스트: `lib/derived.ts` / `lib/derived.test.ts`의 기존 스타일(설명 주석, `today: Date = new Date()` 형태의 테스트 가능한 기본 인자)

---

### Task 1: `upload_logs` 테이블 SQL 작성

**Files:**
- Create: `supabase/upload_logs.sql`

- [ ] **Step 1: SQL 파일 작성**

```sql
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- One row per upload-count button click (신규/수정/동일), so weekly/monthly
-- totals are just a date-range count — no read-modify-write races between
-- 구민석/안도현 tapping at the same time. Same open-access convention as the
-- rest of this app (anon key, no auth). No update policy — corrections are
-- done by deleting a row (되돌리기), not editing one.

create table upload_logs (
  id uuid primary key default gen_random_uuid(),
  member text not null,
  category text not null,
  created_at timestamptz not null default now()
);

alter table upload_logs enable row level security;

create policy "public read" on upload_logs
  for select using (true);

create policy "public insert" on upload_logs
  for insert with check (true);

create policy "public delete" on upload_logs
  for delete using (true);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/upload_logs.sql
git commit -m "feat: add upload_logs table migration"
```

(사용자가 Supabase SQL Editor에서 수동 실행해야 한다는 점은 마지막 검증 태스크에서 다시 안내한다.)

---

### Task 2: 타입 정의 추가

**Files:**
- Modify: `lib/types.ts` (파일 끝에 추가)

- [ ] **Step 1: `lib/types.ts` 끝에 다음 코드 추가**

```ts
export const UPLOAD_LOG_CATEGORIES = ["신규", "수정", "동일"] as const;
export type UploadLogCategory = (typeof UPLOAD_LOG_CATEGORIES)[number];

export type UploadLog = {
  id: string;
  member: Weaver;
  category: UploadLogCategory;
  created_at: string;
};
```

- [ ] **Step 2: 타입 체크로 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 통과

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add UploadLog types"
```

---

### Task 3: CRUD 함수 추가 (upload_logs + updateSampleRequest)

**Files:**
- Modify: `lib/supabase.ts`

- [ ] **Step 1: import 문 수정**

1~4번째 줄을 다음으로 교체:

```ts
import { createClient } from "@supabase/supabase-js";
import type {
  Member, PersonalTodoItem, SampleRequest, SampleRequestInput, Task, TaskInput,
  UploadLog, UploadLogCategory, Weaver,
} from "./types";
```

- [ ] **Step 2: 파일 끝에 함수 4개 추가**

```ts
export async function listUploadLogs(): Promise<UploadLog[]> {
  const { data, error } = await supabase
    .from("upload_logs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as UploadLog[];
}

export async function createUploadLog(
  member: Weaver,
  category: UploadLogCategory
): Promise<UploadLog> {
  const { data, error } = await supabase
    .from("upload_logs")
    .insert({ member, category })
    .select()
    .single();
  if (error) throw error;
  return data as UploadLog;
}

export async function deleteUploadLog(id: string): Promise<void> {
  const { error } = await supabase.from("upload_logs").delete().eq("id", id);
  if (error) throw error;
}

export async function updateSampleRequest(
  id: string,
  input: SampleRequestInput
): Promise<SampleRequest> {
  const { data, error } = await supabase
    .from("sample_requests")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as SampleRequest;
}
```

- [ ] **Step 3: 타입 체크로 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 통과

- [ ] **Step 4: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add upload_logs CRUD and updateSampleRequest"
```

---

### Task 4: `summarizeUploadLogs` 순수 함수 + 테스트 (TDD)

**Files:**
- Modify: `lib/derived.ts`
- Test: `lib/derived.test.ts`

- [ ] **Step 1: 실패하는 테스트 먼저 작성**

`lib/derived.test.ts`의 import 블록(1~16번째 줄)을 다음으로 교체:

```ts
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
```

파일 끝에 다음 테스트 블록 추가:

```ts
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
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run lib/derived.test.ts`
Expected: FAIL — `summarizeUploadLogs is not a function` (아직 구현 전이므로)

- [ ] **Step 3: `lib/derived.ts`에 구현 추가**

파일 최상단 import를 다음으로 교체 (1번째 줄):

```ts
import {
  CATEGORIES, UPLOAD_LOG_CATEGORIES, WEAVERS,
  type Category, type Member, type Priority, type Status, type Task,
  type UploadLog, type UploadLogCategory, type Weaver,
} from "./types";
```

파일 끝에 추가:

```ts
function startOfWeek(now: Date): Date {
  const day = now.getDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
}

function dateRangeFor(range: "week" | "month", now: Date): [Date, Date] {
  if (range === "week") {
    const start = startOfWeek(now);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
    return [start, end];
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return [start, end];
}

export function summarizeUploadLogs(
  logs: UploadLog[],
  range: "week" | "month",
  now: Date = new Date()
): Record<Weaver, Record<UploadLogCategory, number>> {
  const [start, end] = dateRangeFor(range, now);
  const summary = Object.fromEntries(
    WEAVERS.map((w) => [w, Object.fromEntries(UPLOAD_LOG_CATEGORIES.map((c) => [c, 0]))])
  ) as Record<Weaver, Record<UploadLogCategory, number>>;

  for (const log of logs) {
    const created = new Date(log.created_at);
    if (created < start || created > end) continue;
    summary[log.member][log.category] += 1;
  }
  return summary;
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npx vitest run lib/derived.test.ts`
Expected: PASS — 전체 테스트(기존 30개 + 신규 3개) 통과

- [ ] **Step 5: Commit**

```bash
git add lib/derived.ts lib/derived.test.ts
git commit -m "feat: add summarizeUploadLogs with week/month bucketing"
```

---

### Task 5: `UploadLogWidget` 컴포넌트 작성

**Files:**
- Create: `components/upload-log-widget.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { listUploadLogs, createUploadLog, deleteUploadLog } from "@/lib/supabase";
import { summarizeUploadLogs, toLocalDateKey } from "@/lib/derived";
import {
  UPLOAD_LOG_CATEGORIES, WEAVERS, type UploadLog, type UploadLogCategory, type Weaver,
} from "@/lib/types";

export function UploadLogWidget() {
  const [logs, setLogs] = useState<UploadLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [range, setRange] = useState<"week" | "month">("week");

  useEffect(() => {
    listUploadLogs()
      .then(setLogs)
      .catch(() => setError("업로드 기록을 불러오지 못했습니다."))
      .finally(() => setLoaded(true));
  }, []);

  function todayCount(member: Weaver, category: UploadLogCategory): number {
    const todayKey = toLocalDateKey(new Date());
    return logs.filter(
      (l) =>
        l.member === member &&
        l.category === category &&
        toLocalDateKey(new Date(l.created_at)) === todayKey
    ).length;
  }

  async function handleLog(member: Weaver, category: UploadLogCategory) {
    const tempId = `temp-${Date.now()}`;
    const optimistic: UploadLog = { id: tempId, member, category, created_at: new Date().toISOString() };
    setLogs((prev) => [optimistic, ...prev]);
    try {
      const created = await createUploadLog(member, category);
      setLogs((prev) => prev.map((l) => (l.id === tempId ? created : l)));
      setError(null);
    } catch {
      setLogs((prev) => prev.filter((l) => l.id !== tempId));
      setError("기록을 저장하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  async function handleUndo(member: Weaver, category: UploadLogCategory) {
    const todayKey = toLocalDateKey(new Date());
    const todays = logs
      .filter(
        (l) =>
          l.member === member &&
          l.category === category &&
          toLocalDateKey(new Date(l.created_at)) === todayKey
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const latest = todays[0];
    if (!latest) return;
    const prev = logs;
    setLogs((ls) => ls.filter((l) => l.id !== latest.id));
    try {
      await deleteUploadLog(latest.id);
      setError(null);
    } catch {
      setLogs(prev);
      setError("되돌리지 못했습니다. 다시 시도해 주세요.");
    }
  }

  const summary = summarizeUploadLogs(logs, range);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>업로드 기록</CardTitle>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-primary underline"
        >
          {expanded ? "숨기기" : "주간/월간 보기"}
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loaded ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <>
            <div className="space-y-3">
              {WEAVERS.map((member) => (
                <div key={member} className="flex flex-wrap items-center gap-2">
                  <span className="w-14 shrink-0 text-sm font-medium">{member}</span>
                  {UPLOAD_LOG_CATEGORIES.map((category) => {
                    const count = todayCount(member, category);
                    return (
                      <div key={category} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleLog(member, category)}
                          className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                        >
                          {category} {count}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUndo(member, category)}
                          disabled={count === 0}
                          aria-label={`${member} ${category} 되돌리기`}
                          className="rounded-md border px-1.5 py-1 text-xs text-muted-foreground disabled:opacity-30"
                        >
                          −
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {expanded && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRange("week")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      range === "week" ? "bg-primary text-primary-foreground" : "border"
                    }`}
                  >
                    이번 주
                  </button>
                  <button
                    type="button"
                    onClick={() => setRange("month")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      range === "month" ? "bg-primary text-primary-foreground" : "border"
                    }`}
                  >
                    이번 달
                  </button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>담당자</TableHead>
                      {UPLOAD_LOG_CATEGORIES.map((c) => <TableHead key={c}>{c}</TableHead>)}
                      <TableHead>합계</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {WEAVERS.map((member) => {
                      const row = summary[member];
                      const total = UPLOAD_LOG_CATEGORIES.reduce((sum, c) => sum + row[c], 0);
                      return (
                        <TableRow key={member}>
                          <TableCell className="font-medium">{member}</TableCell>
                          {UPLOAD_LOG_CATEGORIES.map((c) => <TableCell key={c}>{row[c]}</TableCell>)}
                          <TableCell className="font-medium">{total}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 타입 체크로 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 통과

- [ ] **Step 3: Commit**

```bash
git add components/upload-log-widget.tsx
git commit -m "feat: add upload log widget with week/month summary"
```

---

### Task 6: 메인 대시보드에 위젯 배치

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: import 추가**

`app/page.tsx`의 `SampleRequestBoard` import 다음 줄에 추가:

```tsx
import { SampleRequestBoard } from "@/components/sample-request-board";
import { UploadLogWidget } from "@/components/upload-log-widget";
```

- [ ] **Step 2: 3열 그리드(카테고리분포/기여율/평균진행률) 다음에 배치**

아래 블록(현재 208~218번째 줄 부근, `MemberProgressBars`를 포함한 3열 그리드 `</div>` 다음, `{editingTask && (` 이전)을:

```tsx
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <motion.div whileHover={{ y: -4 }}>
            <CategoryDistribution tasks={tasks} />
          </motion.div>
          <motion.div whileHover={{ y: -4 }}>
            <ContributionReport tasks={tasks} />
          </motion.div>
          <motion.div whileHover={{ y: -4 }}>
            <MemberProgressBars tasks={tasks} />
          </motion.div>
        </div>

        {editingTask && (
```

다음으로 교체:

```tsx
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <motion.div whileHover={{ y: -4 }}>
            <CategoryDistribution tasks={tasks} />
          </motion.div>
          <motion.div whileHover={{ y: -4 }}>
            <ContributionReport tasks={tasks} />
          </motion.div>
          <motion.div whileHover={{ y: -4 }}>
            <MemberProgressBars tasks={tasks} />
          </motion.div>
        </div>

        <UploadLogWidget />

        {editingTask && (
```

- [ ] **Step 3: 타입 체크로 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 통과

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: place upload log widget at the bottom of the dashboard"
```

---

### Task 7: `SampleRequestFormDialog`를 등록/수정 겸용으로 확장

**Files:**
- Modify: `components/sample-request-form-dialog.tsx`

- [ ] **Step 1: Props 타입과 상태 초기화 로직 수정**

`type Props = { ... };`부터 `const canSubmit = ...` 줄까지(현재 17~42번째 줄)를 다음으로 교체:

```tsx
type Props = {
  trigger?: React.ReactElement;
  defaultRequester: Member;
  request?: SampleRequest;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (input: SampleRequestInput) => Promise<void>;
};

function buildDefaultForm(defaultRequester: Member): SampleRequestInput {
  return {
    requester: defaultRequester,
    weaver: WEAVERS[0],
    title: "",
    spec_note: "",
    reference_link: "",
    desired_date: null,
    status: "요청됨",
  };
}

function toFormInput(request: SampleRequest): SampleRequestInput {
  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...input } = request;
  return input;
}

export function SampleRequestFormDialog({
  trigger, defaultRequester, request, open: openProp, onOpenChange, onSubmit,
}: Props) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const [form, setForm] = useState<SampleRequestInput>(
    request ? toFormInput(request) : buildDefaultForm(defaultRequester)
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = form.requester && form.weaver && form.title.trim().length > 0 && !uploading;
```

`import` 블록의 타입 import 줄(15번째 줄)도 `SampleRequest`를 포함하도록 수정:

```ts
import { MEMBERS, WEAVERS, type Member, type SampleRequest, type SampleRequestInput } from "@/lib/types";
```

- [ ] **Step 2: `handleSubmit`에서 등록 성공 후 폼 리셋을 "등록 모드일 때만" 하도록 수정**

현재 `handleSubmit` 함수를:

```tsx
  async function handleSubmit() {
    try {
      await onSubmit(form);
      setOpen(false);
      setForm(buildDefaultForm(defaultRequester));
    } catch {
      // onSubmit already surfaces the error to the user; keep the dialog
      // open with the user's input so they can retry.
    }
  }
```

다음으로 교체 (수정 모드에서 닫았다가 다시 열 때 방금 수정한 값이 아니라 기본값으로 리셋되는 걸 방지):

```tsx
  async function handleSubmit() {
    try {
      await onSubmit(form);
      setOpen(false);
      if (!request) setForm(buildDefaultForm(defaultRequester));
    } catch {
      // onSubmit already surfaces the error to the user; keep the dialog
      // open with the user's input so they can retry.
    }
  }
```

- [ ] **Step 3: `trigger`가 없을 수도 있으므로 조건부 렌더링으로 변경**

`SampleRequestBoard`가 수정 모드에서는 `trigger` 없이 `open`/`onOpenChange`만으로
이 다이얼로그를 열 것이므로(Task 9), `trigger`가 `undefined`일 때 `DialogTrigger`를
렌더링하지 않도록 `TaskFormDialog`와 동일하게 바꾼다.

```tsx
        <DialogTrigger render={trigger} />
```

를:

```tsx
        {trigger && <DialogTrigger render={trigger} />}
```

로 교체.

- [ ] **Step 4: 다이얼로그 제목과 버튼 문구를 모드에 따라 변경**

```tsx
        <DialogHeader>
          <DialogTitle>샘플 제직 요청</DialogTitle>
        </DialogHeader>
```

를:

```tsx
        <DialogHeader>
          <DialogTitle>{request ? "샘플 제직 요청 수정" : "샘플 제직 요청"}</DialogTitle>
        </DialogHeader>
```

로, 그리고:

```tsx
          <Button className="mt-2 w-full" disabled={!canSubmit} onClick={handleSubmit}>
            요청하기
          </Button>
```

를:

```tsx
          <Button className="mt-2 w-full" disabled={!canSubmit} onClick={handleSubmit}>
            {request ? "수정하기" : "요청하기"}
          </Button>
```

로 교체.

- [ ] **Step 5: 타입 체크로 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 통과 (`_id`/`_createdAt`/`_updatedAt` 미사용 변수는 언더스코어 프리픽스라 eslint `no-unused-vars`에 걸리지 않음 — 프로젝트 eslint 설정이 `argsIgnorePattern`/`varsIgnorePattern: "^_"` 를 안 쓴다면 다음 스텝에서 lint로 재확인)

- [ ] **Step 6: lint로 재확인**

Run: `npm run lint`
Expected: `sample-request-form-dialog.tsx`에 새 에러 없음. 만약 `_id` 등 구조분해 미사용 변수가 걸리면, 구조분해 대신 아래로 교체:

```ts
function toFormInput(request: SampleRequest): SampleRequestInput {
  return {
    requester: request.requester,
    weaver: request.weaver,
    title: request.title,
    spec_note: request.spec_note,
    reference_link: request.reference_link,
    desired_date: request.desired_date,
    status: request.status,
  };
}
```

- [ ] **Step 7: Commit**

```bash
git add components/sample-request-form-dialog.tsx
git commit -m "feat: support edit mode in SampleRequestFormDialog"
```

---

### Task 8: `SampleRequestDetailDialog`에 수정 버튼 추가

**Files:**
- Modify: `components/sample-request-detail-dialog.tsx`

- [ ] **Step 1: Props에 `onEdit` 추가**

```tsx
type Props = {
  request: SampleRequest;
  trigger: React.ReactElement;
  onDelete: (id: string) => void;
};
```

를:

```tsx
type Props = {
  request: SampleRequest;
  trigger: React.ReactElement;
  onDelete: (id: string) => void;
  onEdit: (request: SampleRequest) => void;
};
```

로, 컴포넌트 시그니처도:

```tsx
export function SampleRequestDetailDialog({ request, trigger, onDelete }: Props) {
```

를:

```tsx
export function SampleRequestDetailDialog({ request, trigger, onDelete, onEdit }: Props) {
```

로 교체.

- [ ] **Step 2: "수정" 버튼 추가**

```tsx
          <Button variant="destructive" className="w-full" onClick={handleDelete}>
            요청 삭제
          </Button>
```

를:

```tsx
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setOpen(false);
              onEdit(request);
            }}
          >
            수정
          </Button>
          <Button variant="destructive" className="w-full" onClick={handleDelete}>
            요청 삭제
          </Button>
```

로 교체 (삭제 버튼 위에 수정 버튼을 추가).

- [ ] **Step 3: 타입 체크로 확인**

Run: `npx tsc --noEmit`
Expected: `SampleRequestDetailDialog`를 사용하는 곳(`sample-request-board.tsx`)에서 `onEdit` prop 누락 에러가 남 — Task 9에서 해결됨. 이 시점의 에러는 예상된 것이므로 무시하고 다음 태스크로 진행.

- [ ] **Step 4: Commit**

```bash
git add components/sample-request-detail-dialog.tsx
git commit -m "feat: add edit button to sample request detail dialog"
```

---

### Task 9: `SampleRequestBoard`에 수정 다이얼로그 상태 연결

**Files:**
- Modify: `components/sample-request-board.tsx`

- [ ] **Step 1: import 수정**

```ts
import {
  listSampleRequests, createSampleRequest, updateSampleRequestStatus, deleteSampleRequest,
} from "@/lib/supabase";
```

를:

```ts
import {
  listSampleRequests, createSampleRequest, updateSampleRequestStatus, updateSampleRequest,
  deleteSampleRequest,
} from "@/lib/supabase";
```

로 교체.

- [ ] **Step 2: `RequestCard`가 `onEdit`을 받아 `SampleRequestDetailDialog`로 전달하도록 수정**

```tsx
function RequestCard({ req, onStatusChange, onDelete }: {
  req: SampleRequest;
  onStatusChange: (id: string, status: SampleRequestStatus) => void;
  onDelete: (id: string) => void;
}) {
```

를:

```tsx
function RequestCard({ req, onStatusChange, onDelete, onEdit }: {
  req: SampleRequest;
  onStatusChange: (id: string, status: SampleRequestStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (request: SampleRequest) => void;
}) {
```

로, 그리고:

```tsx
        <SampleRequestDetailDialog
          request={req}
          onDelete={onDelete}
          trigger={
```

를:

```tsx
        <SampleRequestDetailDialog
          request={req}
          onDelete={onDelete}
          onEdit={onEdit}
          trigger={
```

로 교체.

- [ ] **Step 3: `SampleRequestBoard`에 `editingRequest` state와 `handleUpdate` 추가**

```tsx
export function SampleRequestBoard({ member }: Props) {
  const [requests, setRequests] = useState<SampleRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
```

를:

```tsx
export function SampleRequestBoard({ member }: Props) {
  const [requests, setRequests] = useState<SampleRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<SampleRequest | null>(null);
```

로 교체.

`handleDelete` 함수 다음(현재 132~144번째 줄 이후)에 추가:

```tsx
  async function handleUpdate(id: string, input: SampleRequestInput) {
    try {
      const updated = await updateSampleRequest(id, input);
      setRequests((prev) => prev.map((req) => (req.id === id ? updated : req)));
      setError(null);
      setEditingRequest(null);
    } catch {
      setError("요청을 수정하지 못했습니다. 다시 시도해 주세요.");
      throw new Error("update failed");
    }
  }
```

`SampleRequestInput`을 이 파일에서 import해야 한다 — 타입 import 줄:

```ts
import { SAMPLE_REQUEST_STATUSES, type Member, type SampleRequest, type SampleRequestStatus } from "@/lib/types";
```

를:

```ts
import {
  SAMPLE_REQUEST_STATUSES, type Member, type SampleRequest, type SampleRequestInput,
  type SampleRequestStatus,
} from "@/lib/types";
```

로 교체.

- [ ] **Step 4: `RequestCard` 호출부에 `onEdit` 전달**

```tsx
                          <RequestCard
                            key={req.id}
                            req={req}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDelete}
                          />
```

를:

```tsx
                          <RequestCard
                            key={req.id}
                            req={req}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDelete}
                            onEdit={setEditingRequest}
                          />
```

로 교체.

- [ ] **Step 5: 수정 다이얼로그를 컴포넌트 트리에 추가**

`</Card>` 바로 앞(파일 끝, 현재 241~244번째 줄 부근)에 추가 — `CardContent` 닫는 태그 다음, `</Card>` 이전:

```tsx
      </CardContent>
      {editingRequest && (
        <SampleRequestFormDialog
          key={editingRequest.id}
          defaultRequester={editingRequest.requester}
          request={editingRequest}
          open={true}
          onOpenChange={(open) => !open && setEditingRequest(null)}
          onSubmit={(input) => handleUpdate(editingRequest.id, input)}
        />
      )}
    </Card>
```

`trigger`는 생략한다 — Task 7에서 `trigger`를 `trigger?: React.ReactElement`로
바꾸고 `{trigger && <DialogTrigger render={trigger} />}`로 조건부 렌더링하게
했으므로(`TaskFormDialog`가 `editingTask`를 controlled로 열 때 쓰는 것과 동일한
패턴), controlled 모드에서는 `trigger` 없이 `open`/`onOpenChange`만으로 연다.

- [ ] **Step 6: 타입 체크로 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 통과

- [ ] **Step 7: Commit**

```bash
git add components/sample-request-board.tsx
git commit -m "feat: wire up sample request edit dialog"
```

---

### Task 10: 빌드/린트 확인 + 브라우저 수동 검증

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: 전체 테스트 실행**

Run: `npm test`
Expected: 모든 테스트 통과 (기존 30개 + Task 4에서 추가한 3개)

- [ ] **Step 2: lint 확인**

Run: `npm run lint`
Expected: 이번 태스크들에서 건드린 파일에 새 에러 없음 (프로젝트에 이미 있던 기존 에러는 무관)

- [ ] **Step 3: build 확인**

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 4: 사용자에게 Supabase 마이그레이션 실행 요청**

Task 1에서 만든 `supabase/upload_logs.sql`을 사용자가 Supabase SQL Editor에서
아직 실행하지 않았다면 지금 실행해달라고 요청한다. 테이블이 없으면 위젯이
"업로드 기록을 불러오지 못했습니다" 에러만 보여준다(크래시는 아님).

- [ ] **Step 5: 브라우저로 확인**

`npm run dev` 실행 후:
1. 대시보드 맨 아래에 "업로드 기록" 카드가 보이는지, 구민석/안도현 두 줄에
   신규/수정/동일 버튼이 있는지
2. 버튼 클릭 시 옆의 숫자가 바로 올라가는지, 새로고침해도 유지되는지
3. 되돌리기(−) 클릭 시 숫자가 줄어들고, 0건일 때 버튼이 비활성화되는지
4. "주간/월간 보기" 클릭 시 표가 펼쳐지고 "이번 주"/"이번 달" 전환이 되는지,
   숫자가 실제 클릭한 것과 맞는지
5. 샘플 제직 요청 카드를 열어서 "수정" 버튼 클릭 → 기존 값이 채워진 입력창이
   뜨는지 → 값을 바꿔서 저장 → 카드에 바뀐 내용이 반영되는지, 새로고침해도
   유지되는지

- [ ] **Step 6: 최종 커밋 (수정사항이 있었다면)**

```bash
git status
```

검증 중 코드를 수정했다면 해당 파일들을 커밋한다. 수정이 없었다면 건너뛴다.

---

## Self-Review 결과

- **스펙 커버리지:** 데이터 모델(Task 1~2), CRUD(Task 3), 순수 함수+테스트(Task 4),
  위젯(Task 5~6), 샘플 요청 수정(Task 7~9), 검증(Task 10) — 스펙의 모든 섹션과
  1:1 대응됨.
- **플레이스홀더 스캔:** 없음 — 모든 스텝에 실제 코드/명령어 포함.
- **타입 일관성:** `UploadLog`/`UploadLogCategory`/`UPLOAD_LOG_CATEGORIES`가
  Task 2~6에서 동일하게 사용됨. `SampleRequestFormDialog`의 `request?:
  SampleRequest` prop과 `SampleRequestBoard`의 `editingRequest: SampleRequest
  | null` 타입이 일치함. `handleUpdate`의 시그니처(`(id: string, input:
  SampleRequestInput) => Promise<void>`)가 `updateSampleRequest`와
  `SampleRequestFormDialog`의 `onSubmit` 계약에 맞음.
- **`trigger` optional 처리:** `TaskFormDialog`의 실제 시그니처(`trigger?:
  React.ReactElement`, `{trigger && <DialogTrigger render={trigger} />}`)를
  직접 확인해 Task 7에 반영했고, Task 9의 controlled 사용부는 `trigger`를
  아예 생략하도록 명확히 했다 — 구현 중 판단이 필요한 지점을 남기지 않음.
