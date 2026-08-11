# 팀 업무관리 대시보드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 팀원 5명이 이름만 선택해서 접속하고, 업무를 등록/수정/삭제하며, 팀 전체 현황(전체/진행중/완료/지연, 팀원별 평균 진행률)을 애니메이션과 함께 실시간 공유 데이터로 보는 웹 대시보드를 만든다.

**Architecture:** Next.js App Router 단일 페이지. Supabase Postgres의 `tasks` 테이블을 anon key로 직접 읽고 쓴다(백엔드 서버 코드 없음). UI는 shadcn/ui + bklit-ui + motion으로 구성하고, 지연 여부·평균 진행률 같은 파생 값은 `lib/derived.ts`가 순수 함수로 계산한다.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, bklit-ui, motion, @supabase/supabase-js, Vitest

---

## File Structure

- `lib/types.ts` — `Task`, `Member`, `Category`, `Priority`, `Status` 타입
- `lib/derived.ts` — `isOverdue`, `averageProgress`, `statusColor`, `priorityColor`
- `lib/derived.test.ts` — 위 함수들의 단위 테스트
- `lib/supabase.ts` — Supabase 클라이언트 + `listTasks`/`createTask`/`updateTask`/`deleteTask`
- `components/member-select.tsx` — 최초 진입 시 이름 선택 화면 (localStorage에 저장)
- `components/summary-cards.tsx` — 전체/진행중/완료/지연 카운트업 카드
- `components/member-progress-bars.tsx` — 팀원별 평균 진행률 애니메이션 바
- `components/task-table.tsx` — 업무 목록 + 필터 + 수정/삭제 트리거
- `components/task-form-dialog.tsx` — 업무 추가/수정 다이얼로그 폼
- `app/page.tsx` — 위 컴포넌트 조합

---

### Task 1: Supabase 프로젝트 준비 (사용자 작업 필요)

이 작업은 계정 생성이 포함되어 있어 **사용자가 직접** 해야 합니다.

- [ ] **Step 1: Supabase 프로젝트 생성**

https://supabase.com 에서 무료 계정으로 로그인 → "New Project" → 이름 `team-dashboard` (원하는 이름) →
리전은 서울(ap-northeast-2) 선택 → DB 비밀번호 설정 → 생성 (1~2분 소요)

- [ ] **Step 2: 테이블 생성 SQL 실행**

Supabase 대시보드 → SQL Editor → New query에 아래 SQL 붙여넣고 실행:

```sql
create table tasks (
  id uuid primary key default gen_random_uuid(),
  member text not null,
  project text not null,
  category text not null,
  detail text,
  priority text not null default 'P3-보통',
  start_date date,
  due_date date,
  progress int not null default 0,
  status text not null default '예정',
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tasks enable row level security;

create policy "public read" on tasks for select using (true);
create policy "public insert" on tasks for insert with check (true);
create policy "public update" on tasks for update using (true);
create policy "public delete" on tasks for delete using (true);
```

- [ ] **Step 3: API 키 확인 및 전달**

Supabase 대시보드 → Project Settings → API 페이지에서
`Project URL`과 `anon public` 키를 복사해서 알려주세요. (다음 Task에서 `.env.local`에 넣습니다)

---

### Task 2: 프로젝트 스캐폴딩 + 라이브러리 설치

**Files:**
- Create: 프로젝트 전체 (`create-next-app` 결과물)
- Create: `.env.local`

- [ ] **Step 1: Next.js 프로젝트 생성**

Run: `npx create-next-app@latest team-dashboard --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint --use-npm`

- [ ] **Step 2: shadcn/ui 초기화 및 컴포넌트 추가**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button input select dialog badge card table label textarea
```

- [ ] **Step 3: bklit-ui 레지스트리 등록**

`components.json`에 추가:
```json
"registries": {
  "@bklit": "https://ui.bklit.com/r/{name}.json"
}
```

- [ ] **Step 4: Supabase 클라이언트 설치**

Run: `npm install @supabase/supabase-js`

- [ ] **Step 5: Vitest 설치**

Run: `npm install -D vitest jsdom`

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "jsdom", globals: true },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

`package.json`의 `"scripts"`에 추가:
```json
"test": "vitest run"
```

- [ ] **Step 6: 환경변수 파일 작성**

사용자가 Task 1에서 전달한 URL/키로 `.env.local` 생성:
```
NEXT_PUBLIC_SUPABASE_URL=<전달받은 Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<전달받은 anon public 키>
```

`.gitignore`에 `.env.local`이 이미 포함되어 있는지 확인 (create-next-app 기본값에 포함됨).

- [ ] **Step 7: 커밋**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js project with shadcn/ui, bklit-ui, supabase, vitest"
```

---

### Task 3: 타입 + 파생 로직 (TDD)

**Files:**
- Create: `lib/types.ts`
- Create: `lib/derived.ts`
- Test: `lib/derived.test.ts`

- [ ] **Step 1: 타입 정의**

`lib/types.ts`:
```ts
export type Member = "이은혜" | "김혜진" | "양세현" | "구민석" | "안도현";
export const MEMBERS: Member[] = ["이은혜", "김혜진", "양세현", "구민석", "안도현"];

export type Category =
  | "제품개발" | "타부서(팀)지원" | "조직연구" | "샘플제직" | "생산지원" | "기타업무" | "OKR";
export const CATEGORIES: Category[] = [
  "제품개발", "타부서(팀)지원", "조직연구", "샘플제직", "생산지원", "기타업무", "OKR",
];

export type Priority = "P1-긴급" | "P2-높음" | "P3-보통" | "P4-낮음";
export const PRIORITIES: Priority[] = ["P1-긴급", "P2-높음", "P3-보통", "P4-낮음"];

export type Status = "예정" | "진행중" | "검토중" | "완료" | "보류";
export const STATUSES: Status[] = ["예정", "진행중", "검토중", "완료", "보류"];

export type Task = {
  id: string;
  member: Member;
  project: string;
  category: Category;
  detail: string | null;
  priority: Priority;
  start_date: string | null;
  due_date: string | null;
  progress: number;
  status: Status;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskInput = Omit<Task, "id" | "created_at" | "updated_at">;
```

- [ ] **Step 2: 실패하는 테스트 작성**

`lib/derived.test.ts`:
```ts
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
```

- [ ] **Step 3: 테스트 실행해서 실패 확인**

Run: `npm test`
Expected: FAIL — `lib/derived.ts` 없음

- [ ] **Step 4: 구현**

`lib/derived.ts`:
```ts
import type { Member, Priority, Status, Task } from "./types";

export function isOverdue(task: Task, today: Date = new Date()): boolean {
  if (!task.due_date || task.status === "완료") return false;
  const due = new Date(`${task.due_date}T00:00:00`);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return due.getTime() < todayMidnight.getTime();
}

export function averageProgress(tasks: Task[], member: Member): number {
  const mine = tasks.filter((t) => t.member === member);
  if (mine.length === 0) return 0;
  const sum = mine.reduce((acc, t) => acc + t.progress, 0);
  return Math.round(sum / mine.length);
}

const STATUS_COLORS: Record<Status, string> = {
  예정: "bg-zinc-500",
  진행중: "bg-blue-500",
  검토중: "bg-purple-500",
  완료: "bg-green-500",
  보류: "bg-orange-500",
};

export function statusColor(status: Status): string {
  return STATUS_COLORS[status];
}

const PRIORITY_COLORS: Record<Priority, string> = {
  "P1-긴급": "bg-red-500",
  "P2-높음": "bg-amber-500",
  "P3-보통": "bg-zinc-400",
  "P4-낮음": "bg-zinc-300",
};

export function priorityColor(priority: Priority): string {
  return PRIORITY_COLORS[priority];
}
```

- [ ] **Step 5: 테스트 실행해서 통과 확인**

Run: `npm test`
Expected: PASS (8 tests)

- [ ] **Step 6: 커밋**

```bash
git add lib/types.ts lib/derived.ts lib/derived.test.ts
git commit -m "feat: add task types and derived calculations (overdue, average progress, colors)"
```

---

### Task 4: Supabase 클라이언트 + CRUD

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: 클라이언트 + CRUD 함수 작성**

`lib/supabase.ts`:
```ts
import { createClient } from "@supabase/supabase-js";
import type { Task, TaskInput } from "./types";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Task[];
}

export async function createTask(input: TaskInput): Promise<Task> {
  const { data, error } = await supabase.from("tasks").insert(input).select().single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, input: Partial<TaskInput>): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add lib/supabase.ts
git commit -m "feat: add supabase client and task CRUD functions"
```

---

### Task 5: 이름 선택 화면

**Files:**
- Create: `components/member-select.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`components/member-select.tsx`:
```tsx
"use client";

import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { MEMBERS, type Member } from "@/lib/types";

type Props = { onSelect: (member: Member) => void };

export function MemberSelect({ onSelect }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-semibold">누구신가요?</h1>
      <div className="flex flex-wrap justify-center gap-4">
        {MEMBERS.map((member, i) => (
          <motion.div
            key={member}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -4 }}
          >
            <Card
              className="w-32 cursor-pointer text-center transition-shadow hover:shadow-lg"
              onClick={() => onSelect(member)}
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

- [ ] **Step 2: 타입 체크 및 커밋**

Run: `npx tsc --noEmit`

```bash
git add components/member-select.tsx
git commit -m "feat: add member select screen"
```

---

### Task 6: 요약 카운트업 카드

**Files:**
- Create: `components/summary-cards.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`components/summary-cards.tsx`:
```tsx
"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";

function CountUpNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: 0.8 }); // seconds, not ms
  const display = useTransform(spring, (v) => Math.round(v).toString());
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    return display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
  }, [display]);

  return <span ref={ref}>0</span>;
}

type Props = { total: number; inProgress: number; completed: number; overdue: number };

export function SummaryCards({ total, inProgress, completed, overdue }: Props) {
  const items = [
    { label: "전체 업무", value: total },
    { label: "진행중", value: inProgress },
    { label: "완료", value: completed },
    { label: "지연", value: overdue },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          whileHover={{ y: -4 }}
        >
          <Card>
            <CardContent className="py-6">
              <div className="text-sm text-muted-foreground">{item.label}</div>
              <div className="text-3xl font-semibold">
                <CountUpNumber value={item.value} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 및 커밋**

Run: `npx tsc --noEmit`

```bash
git add components/summary-cards.tsx
git commit -m "feat: add animated summary count-up cards"
```

---

### Task 7: 팀원별 진행률 바

**Files:**
- Create: `components/member-progress-bars.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`components/member-progress-bars.tsx`:
```tsx
"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEMBERS, type Task } from "@/lib/types";
import { averageProgress } from "@/lib/derived";

type Props = { tasks: Task[] };

export function MemberProgressBars({ tasks }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>팀원별 평균 진행률</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {MEMBERS.map((member, i) => {
          const percent = averageProgress(tasks, member);
          return (
            <div key={member} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{member}</span>
                <span className="text-muted-foreground">{percent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ type: "spring", stiffness: 80, damping: 20, delay: i * 0.08 }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 타입 체크 및 커밋**

Run: `npx tsc --noEmit`

```bash
git add components/member-progress-bars.tsx
git commit -m "feat: add animated member progress bars"
```

---

### Task 8: 업무 목록 + 필터

**Files:**
- Create: `components/task-table.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`components/task-table.tsx`:
```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MEMBERS, STATUSES, type Task } from "@/lib/types";
import { isOverdue, priorityColor, statusColor } from "@/lib/derived";

type Props = {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
};

export function TaskTable({ tasks, onEdit, onDelete }: Props) {
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = tasks.filter(
    (t) =>
      (memberFilter === "all" || t.member === memberFilter) &&
      (statusFilter === "all" || t.status === statusFilter)
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={memberFilter} onValueChange={setMemberFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="담당자" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 담당자</SelectItem>
            {MEMBERS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="상태" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>담당자</TableHead>
            <TableHead>프로젝트</TableHead>
            <TableHead>업무구분</TableHead>
            <TableHead>우선순위</TableHead>
            <TableHead>마감일</TableHead>
            <TableHead>진행률</TableHead>
            <TableHead>상태</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence>
            {filtered.map((task) => (
              <motion.tr
                key={task.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border-b"
              >
                <TableCell>{task.member}</TableCell>
                <TableCell>{task.project}</TableCell>
                <TableCell>{task.category}</TableCell>
                <TableCell>
                  <Badge className={priorityColor(task.priority)}>{task.priority}</Badge>
                </TableCell>
                <TableCell className={isOverdue(task) ? "font-medium text-red-500" : ""}>
                  {task.due_date ?? "-"}
                </TableCell>
                <TableCell>{task.progress}%</TableCell>
                <TableCell>
                  <Badge className={statusColor(task.status)}>{task.status}</Badge>
                </TableCell>
                <TableCell className="space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>수정</Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(task.id)}>삭제</Button>
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 및 커밋**

Run: `npx tsc --noEmit` (Table/Badge/Select가 없다면 `npx shadcn@latest add table badge select`로 먼저 설치)

```bash
git add components/task-table.tsx
git commit -m "feat: add task table with member/status filters"
```

---

### Task 9: 업무 추가/수정 다이얼로그

**Files:**
- Create: `components/task-form-dialog.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`components/task-form-dialog.tsx`:
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
import { CATEGORIES, PRIORITIES, STATUSES, type Member, type Task, type TaskInput } from "@/lib/types";

type Props = {
  member: Member;
  task?: Task;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (input: TaskInput) => Promise<void>;
};

export function TaskFormDialog({ member, task, trigger, open: openProp, onOpenChange, onSubmit }: Props) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const [form, setForm] = useState<TaskInput>(
    task ?? {
      member,
      project: "",
      category: "제품개발",
      detail: "",
      priority: "P3-보통",
      start_date: null,
      due_date: null,
      progress: 0,
      status: "예정",
      comment: "",
    }
  );

  async function handleSubmit() {
    await onSubmit(form);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "업무 수정" : "업무 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>프로젝트</Label>
            <Input
              value={form.project}
              onChange={(e) => setForm({ ...form, project: e.target.value })}
            />
          </div>
          <div>
            <Label>업무구분</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v as TaskInput["category"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>우선순위</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => setForm({ ...form, priority: v as TaskInput["priority"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>마감일</Label>
            <Input
              type="date"
              value={form.due_date ?? ""}
              onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
            />
          </div>
          <div>
            <Label>진행률 (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.progress}
              onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>상태</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as TaskInput["status"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>팀장코멘트</Label>
            <Textarea
              value={form.comment ?? ""}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
            />
          </div>
          <Button className="w-full" onClick={handleSubmit}>저장</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: 타입 체크 및 커밋**

Run: `npx tsc --noEmit`

```bash
git add components/task-form-dialog.tsx
git commit -m "feat: add task create/edit dialog form"
```

---

### Task 10: 대시보드 페이지 조합

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 페이지 작성**

`app/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { MemberSelect } from "@/components/member-select";
import { SummaryCards } from "@/components/summary-cards";
import { MemberProgressBars } from "@/components/member-progress-bars";
import { TaskTable } from "@/components/task-table";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { Button } from "@/components/ui/button";
import { listTasks, createTask, updateTask, deleteTask } from "@/lib/supabase";
import { isOverdue } from "@/lib/derived";
import type { Member, Task, TaskInput } from "@/lib/types";

const MEMBER_STORAGE_KEY = "team-dashboard:member";

export default function DashboardPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(MEMBER_STORAGE_KEY) as Member | null;
    if (saved) setMember(saved);
  }, []);

  useEffect(() => {
    if (!member) return;
    refresh();
  }, [member]);

  async function refresh() {
    try {
      setTasks(await listTasks());
      setError(null);
    } catch {
      setError("데이터를 불러오지 못했습니다.");
    }
  }

  function selectMember(m: Member) {
    localStorage.setItem(MEMBER_STORAGE_KEY, m);
    setMember(m);
  }

  async function handleCreate(input: TaskInput) {
    await createTask(input);
    await refresh();
  }

  async function handleUpdate(id: string, input: TaskInput) {
    await updateTask(id, input);
    await refresh();
    setEditingTask(null);
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    await refresh();
  }

  if (!member) return <MemberSelect onSelect={selectMember} />;

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p>{error}</p>
        <Button onClick={refresh}>다시 시도</Button>
      </div>
    );
  }

  const total = tasks.length;
  const inProgress = tasks.filter((t) => t.status === "진행중").length;
  const completed = tasks.filter((t) => t.status === "완료").length;
  const overdue = tasks.filter((t) => isOverdue(t)).length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">디자인R&D 팀 업무 대시보드</h1>
        <TaskFormDialog
          member={member}
          trigger={<Button>업무 추가</Button>}
          onSubmit={handleCreate}
        />
      </div>

      <SummaryCards total={total} inProgress={inProgress} completed={completed} overdue={overdue} />
      <MemberProgressBars tasks={tasks} />
      <TaskTable
        tasks={tasks}
        onEdit={setEditingTask}
        onDelete={handleDelete}
      />

      {editingTask && (
        <TaskFormDialog
          member={editingTask.member}
          task={editingTask}
          open={true}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onSubmit={(input) => handleUpdate(editingTask.id, input)}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 2: 개발 서버 실행 및 수동 확인**

Run: `npm run dev`
Expected: 이름 선택 화면 → 선택 후 대시보드 진입 → 업무 추가 시 목록/요약/진행률 바 갱신

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add app/page.tsx
git commit -m "feat: wire team dashboard page together"
```

---

## Self-Review Notes

- 스펙의 5개 화면(이름 선택, 요약 카드, 진행률 바, 업무 목록+필터, 추가/수정 다이얼로그) 모두 Task 5~10에서 구현됨
- 지연 계산·평균 진행률·색상 매핑에 단위 테스트 포함 (스펙의 "테스트" 섹션 충족)
- `TaskFormDialog`는 `open`/`onOpenChange`를 선택적으로 받는 controlled/uncontrolled 겸용 컴포넌트로 설계함 — 추가 시엔 `trigger`만 넘기고, 수정 시엔 `open`/`onOpenChange`로 외부(`editingTask` state)에서 제어한다.
- bklit-ui 컴포넌트는 이번 1차 범위(요약 카드/진행률 바)에서는 직접 쓰지 않고 순수 CSS+motion으로 구현했다 — Task 1 프로젝트의 경험상 bklit-ui 개별 컴포넌트 설치 시 실제 API가 문서와 다를 수 있어, 1차 범위는 우선 shadcn+motion으로 안정적으로 구현하고 이후 확장 단계에서 bklit-ui 차트(월간 기여율 등)를 붙인다.
