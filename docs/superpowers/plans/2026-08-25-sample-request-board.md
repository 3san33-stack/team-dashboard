# 샘플 제직 요청 칸반 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 디자이너가 제직자(구민석/안도현)에게 샘플 제직을 요청하고, 요청 상태를 4단계(요청됨/확인함/제직중/완료)로 추적하는 칸반 위젯을 메인 대시보드에 추가한다.

**Architecture:** 신규 Supabase 테이블 `sample_requests` + 신규 CRUD 함수(`lib/supabase.ts`) + 신규 자기완결형(self-contained) 위젯 컴포넌트(`SampleRequestBoard`, `SampleRequestFormDialog`). 기존 `PersonalTodo` 컴포넌트와 동일하게 컴포넌트가 자체적으로 데이터를 fetch하고 로컬 state로 관리하며, `app/page.tsx`는 이 위젯을 배치만 한다. 기존 `tasks` 테이블/컴포넌트는 건드리지 않는다.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (`@supabase/supabase-js`), shadcn/ui (`@base-ui/react` 기반 Select/Dialog/Card 등), Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-08-25-sample-request-board-design.md`

---

## 설계 참고: 컴포넌트가 따라야 할 기존 패턴

- CRUD 함수: `lib/supabase.ts`의 `listTasks`/`createTask`/`updateTask` 패턴 그대로 따름 (에러 시 `throw error`)
- 자기완결형 위젯: `components/personal-todo.tsx` 패턴 그대로 따름 (컴포넌트 내부에서 `useEffect`로 fetch, 로컬 `error`/`loaded` state)
- 폼 다이얼로그: `components/task-form-dialog.tsx` 패턴 (controlled/uncontrolled 겸용 `open` prop, `Select`/`Input`/`Textarea` 조합)
- SQL 마이그레이션: `supabase/personal_todos.sql` 패턴 (완전 공개 RLS 정책 4개: read/insert/update/delete)

이 패턴에서 벗어나는 코드를 짜지 않는다 — 기존 코드베이스와 다르게 짤 이유가 없다.

---

### Task 1: Supabase 마이그레이션 SQL 작성

**Files:**
- Create: `supabase/sample_requests.sql`

- [ ] **Step 1: SQL 파일 작성**

```sql
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Sample-weaving request board: designers request a sample from a weaver
-- (구민석/안도현) and track it through 요청됨 → 확인함 → 제직중 → 완료.
-- Same open-access convention as `tasks` and `personal_todos` (anon key,
-- public RLS).

create table sample_requests (
  id uuid primary key default gen_random_uuid(),
  requester text not null,
  weaver text not null,
  title text not null,
  spec_note text,
  reference_link text,
  desired_date date,
  status text not null default '요청됨',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sample_requests enable row level security;

create policy "public read" on sample_requests
  for select using (true);

create policy "public insert" on sample_requests
  for insert with check (true);

create policy "public update" on sample_requests
  for update using (true);

create policy "public delete" on sample_requests
  for delete using (true);
```

- [ ] **Step 2: 사용자에게 수동 실행 안내**

이 SQL은 자동으로 실행되지 않는다. 사용자에게 Supabase 프로젝트의 SQL Editor에서
`supabase/sample_requests.sql` 내용을 붙여넣고 실행해 테이블을 만들어야 한다고
안내한다 (기존 `personal_todos`/`push_subscriptions` 테이블을 만들 때와 동일한 절차).

- [ ] **Step 3: Commit**

```bash
git add supabase/sample_requests.sql
git commit -m "feat: add sample_requests table migration"
```

---

### Task 2: 타입 정의 추가

**Files:**
- Modify: `lib/types.ts` (파일 끝에 추가)

- [ ] **Step 1: `lib/types.ts` 끝에 다음 코드 추가**

```ts
export const WEAVERS = ["구민석", "안도현"] as const;
export type Weaver = (typeof WEAVERS)[number];

export const SAMPLE_REQUEST_STATUSES = ["요청됨", "확인함", "제직중", "완료"] as const;
export type SampleRequestStatus = (typeof SAMPLE_REQUEST_STATUSES)[number];

export type SampleRequest = {
  id: string;
  requester: Member;
  weaver: Weaver;
  title: string;
  spec_note: string | null;
  reference_link: string | null;
  desired_date: string | null;
  status: SampleRequestStatus;
  created_at: string;
  updated_at: string;
};

export type SampleRequestInput = Omit<SampleRequest, "id" | "created_at" | "updated_at">;
```

- [ ] **Step 2: 타입 체크로 확인**

Run: `npx tsc --noEmit`
Expected: 기존 에러 없이 통과 (새 타입만 추가했으므로 에러가 나면 문법 오류를 의미함)

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add SampleRequest types"
```

---

### Task 3: CRUD 함수 추가

**Files:**
- Modify: `lib/supabase.ts`

- [ ] **Step 1: import 문 수정**

`lib/supabase.ts` 1~2번째 줄의 import를 다음으로 교체:

```ts
import { createClient } from "@supabase/supabase-js";
import type {
  Member, PersonalTodoItem, SampleRequest, SampleRequestInput, Task, TaskInput,
} from "./types";
```

- [ ] **Step 2: 파일 끝에 CRUD 함수 3개 추가**

```ts
export async function listSampleRequests(): Promise<SampleRequest[]> {
  const { data, error } = await supabase
    .from("sample_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as SampleRequest[];
}

export async function createSampleRequest(input: SampleRequestInput): Promise<SampleRequest> {
  const { data, error } = await supabase.from("sample_requests").insert(input).select().single();
  if (error) throw error;
  return data as SampleRequest;
}

export async function updateSampleRequestStatus(
  id: string,
  status: SampleRequest["status"]
): Promise<void> {
  const { error } = await supabase
    .from("sample_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 3: 타입 체크로 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 통과

- [ ] **Step 4: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add sample request CRUD functions"
```

---

### Task 4: `SampleRequestFormDialog` 컴포넌트 작성

**Files:**
- Create: `components/sample-request-form-dialog.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MEMBERS, WEAVERS, type SampleRequestInput } from "@/lib/types";

type Props = {
  trigger: React.ReactElement;
  defaultRequester: string;
  onSubmit: (input: SampleRequestInput) => Promise<void>;
};

function buildDefaultForm(defaultRequester: string): SampleRequestInput {
  return {
    requester: defaultRequester as SampleRequestInput["requester"],
    weaver: WEAVERS[0],
    title: "",
    spec_note: "",
    reference_link: "",
    desired_date: null,
    status: "요청됨",
  };
}

export function SampleRequestFormDialog({ trigger, defaultRequester, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SampleRequestInput>(buildDefaultForm(defaultRequester));

  const canSubmit = form.requester && form.weaver && form.title.trim().length > 0;

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>샘플 제직 요청</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>요청자</Label>
            <Select
              value={form.requester}
              onValueChange={(v) => v && setForm({ ...form, requester: v as SampleRequestInput["requester"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEMBERS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>제직 담당자</Label>
            <Select
              value={form.weaver}
              onValueChange={(v) => v && setForm({ ...form, weaver: v as SampleRequestInput["weaver"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WEAVERS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>건명</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="예: 봄 신상 타월 샘플"
            />
          </div>
          <div className="space-y-1.5">
            <Label>사양 / 메모</Label>
            <Textarea
              value={form.spec_note ?? ""}
              onChange={(e) => setForm({ ...form, spec_note: e.target.value })}
              placeholder="원사, 조직, 수량 등"
            />
          </div>
          <div className="space-y-1.5">
            <Label>참고 일러스트 파일 위치 링크</Label>
            <Input
              value={form.reference_link ?? ""}
              onChange={(e) => setForm({ ...form, reference_link: e.target.value })}
              placeholder="공유 폴더 경로 또는 URL"
            />
          </div>
          <div className="space-y-1.5">
            <Label>희망 완료일</Label>
            <Input
              type="date"
              value={form.desired_date ?? ""}
              onChange={(e) => setForm({ ...form, desired_date: e.target.value || null })}
            />
          </div>
          <Button className="mt-2 w-full" disabled={!canSubmit} onClick={handleSubmit}>
            요청하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: 타입 체크로 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 통과

- [ ] **Step 3: Commit**

```bash
git add components/sample-request-form-dialog.tsx
git commit -m "feat: add sample request form dialog"
```

---

### Task 5: `SampleRequestBoard` 칸반 위젯 작성

**Files:**
- Create: `components/sample-request-board.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SampleRequestFormDialog } from "@/components/sample-request-form-dialog";
import { listSampleRequests, createSampleRequest, updateSampleRequestStatus } from "@/lib/supabase";
import { SAMPLE_REQUEST_STATUSES, type Member, type SampleRequest, type SampleRequestStatus } from "@/lib/types";

type Props = { member: Member };

export function SampleRequestBoard({ member }: Props) {
  const [requests, setRequests] = useState<SampleRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSampleRequests()
      .then(setRequests)
      .catch(() => setError("샘플 요청 목록을 불러오지 못했습니다."))
      .finally(() => setLoaded(true));
  }, []);

  async function handleCreate(input: Parameters<typeof createSampleRequest>[0]) {
    try {
      const created = await createSampleRequest(input);
      setRequests((prev) => [created, ...prev]);
      setError(null);
    } catch {
      setError("요청을 저장하지 못했습니다. 다시 시도해 주세요.");
      throw new Error("create failed");
    }
  }

  async function handleStatusChange(id: string, status: SampleRequestStatus) {
    const prev = requests;
    setRequests((r) => r.map((req) => (req.id === id ? { ...req, status } : req)));
    try {
      await updateSampleRequestStatus(id, status);
      setError(null);
    } catch {
      setRequests(prev);
      setError("상태를 변경하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>샘플 제직 요청</CardTitle>
        <SampleRequestFormDialog
          defaultRequester={member}
          trigger={
            <button
              type="button"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              + 새 요청
            </button>
          }
          onSubmit={handleCreate}
        />
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        {!loaded ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SAMPLE_REQUEST_STATUSES.map((status) => {
              const cards = requests.filter((r) => r.status === status);
              return (
                <div key={status} className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    {status} ({cards.length})
                  </h4>
                  <div className="space-y-2">
                    {cards.length === 0 ? (
                      <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                        없음
                      </p>
                    ) : (
                      cards.map((req) => (
                        <div key={req.id} className="space-y-2 rounded-md border p-3">
                          <p className="text-sm font-medium">{req.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {req.requester} → {req.weaver}
                          </p>
                          {req.desired_date && (
                            <p className="text-xs text-muted-foreground">희망일 {req.desired_date}</p>
                          )}
                          {req.reference_link && (
                            req.reference_link.startsWith("http") ? (
                              <a
                                href={req.reference_link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary underline"
                              >
                                <ExternalLink className="h-3 w-3" /> 참고 파일
                              </a>
                            ) : (
                              <p className="truncate text-xs text-muted-foreground">{req.reference_link}</p>
                            )
                          )}
                          <Select
                            value={req.status}
                            onValueChange={(v) => v && handleStatusChange(req.id, v as SampleRequestStatus)}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SAMPLE_REQUEST_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
git add components/sample-request-board.tsx
git commit -m "feat: add sample request kanban board"
```

---

### Task 6: 메인 대시보드에 위젯 배치

**Files:**
- Modify: `app/page.tsx:16` (import 추가)
- Modify: `app/page.tsx:204` 부근 (위젯 배치)

- [ ] **Step 1: import 추가**

`app/page.tsx`의 기존 import 블록에서 `UpcomingDeadlines` import 다음 줄에 추가:

```tsx
import { UpcomingDeadlines } from "@/components/upcoming-deadlines";
import { SampleRequestBoard } from "@/components/sample-request-board";
```

- [ ] **Step 2: 위젯 배치**

`app/page.tsx`에서 아래 블록(현재 202~204번째 줄, 3열 그리드 `</div>` 다음, `<TaskTable ...>` 이전)을:

```tsx
        </div>

        <TaskTable tasks={tasks} member={member} onEdit={setEditingTask} onDelete={handleDelete} />
```

다음으로 교체:

```tsx
        </div>

        <SampleRequestBoard member={member} />

        <TaskTable tasks={tasks} member={member} onEdit={setEditingTask} onDelete={handleDelete} />
```

- [ ] **Step 3: 타입 체크로 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 통과

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: place sample request board on the dashboard"
```

---

### Task 7: 빌드/린트 확인 + 브라우저 수동 검증

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: 사용자에게 Supabase 마이그레이션 실행 요청**

Task 1에서 만든 `supabase/sample_requests.sql`을 사용자가 아직 Supabase SQL Editor에서
실행하지 않았다면, 이 시점에 실행해달라고 요청한다. 테이블이 없으면 이후 브라우저
검증에서 목록 fetch가 실패한다.

- [ ] **Step 2: lint 확인**

Run: `npm run lint`
Expected: 에러 없음 (경고는 기존 코드베이스에 이미 있던 것이 아니라면 확인 후 수정)

- [ ] **Step 3: build 확인**

Run: `npm run build`
Expected: 빌드 성공 (타입 에러나 사용하지 않는 import 등이 있으면 실패하므로 최종 확인 용도)

- [ ] **Step 4: 로컬 서버로 브라우저 확인**

Run: `npm run dev`

브라우저에서 다음을 확인:
1. 대시보드에 "샘플 제직 요청" 섹션이 4개 칸(요청됨/확인함/제직중/완료)으로 보이는지
2. "+ 새 요청" 클릭 → 요청자/제직담당자/건명/사양/참고링크/희망일 입력 → "요청하기" 클릭 시
   "요청됨" 칸에 카드가 새로 생기는지
3. 카드의 상태 드롭다운을 "제직중"으로 바꾸면 카드가 "제직중" 칸으로 이동하는지
4. 새로고침(F5) 후에도 방금 바꾼 상태가 유지되는지 (Supabase에 실제로 반영됐는지 확인)
5. 참고 링크에 `https://...` 형태를 넣은 카드는 클릭 가능한 링크로, 일반 텍스트를 넣은
   카드는 텍스트로만 보이는지
6. 모바일 너비(개발자도구 반응형 모드)에서 칸이 1~2열로 스택되는지

- [ ] **Step 5: 최종 커밋 (수정사항이 있었다면)**

```bash
git status
```

검증 중 코드를 수정했다면 해당 파일들을 커밋한다. 수정이 없었다면 이 단계는 건너뛴다.

---

## Self-Review 결과

- **스펙 커버리지:** 데이터 모델(Task 1~3), 폼 다이얼로그(Task 4), 칸반 위젯(Task 5),
  대시보드 배치(Task 6), 검증(Task 7) 모두 스펙의 각 섹션과 1:1 대응됨.
- **플레이스홀더 스캔:** 없음 — 모든 스텝에 실제 코드/명령어 포함.
- **타입 일관성:** `SampleRequest`/`SampleRequestInput`/`SampleRequestStatus`/`Weaver` 네이밍이
  Task 2~6 전체에서 동일하게 사용됨. `SampleRequestFormDialog`의 `onSubmit` 시그니처
  (`(input: SampleRequestInput) => Promise<void>`)가 `SampleRequestBoard`의 `handleCreate`와
  일치함.
