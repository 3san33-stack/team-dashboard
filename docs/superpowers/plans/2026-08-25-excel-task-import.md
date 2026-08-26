# 엑셀 업무 가져오기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 팀이 쓰는 원본 엑셀(`디자인R&D_업무관리_개인시트.xlsx`)의 "통합DB" 시트를 대시보드에서 바로 업로드해서, 담당자+프로젝트+업무구분이 같은 기존 업무는 최신 값으로 갱신하고 없는 건 새로 추가한다.

**Architecture:** `xlsx`(SheetJS)로 클라이언트에서 파일을 파싱하는 순수 함수(`lib/excel-import.ts`)와, 그 결과를 기존 `createTask`/`updateTask`로 저장하는 자기완결형 버튼 컴포넌트(`components/excel-import-button.tsx`)로 나눈다. 서버 API는 추가하지 않는다.

**Tech Stack:** Next.js 16, TypeScript, `xlsx`(SheetJS, 신규 의존성), Supabase, vitest.

**Spec:** `docs/superpowers/specs/2026-08-25-excel-task-import-design.md`

---

## 설계 참고: 따라야 할 기존 패턴

- 순수 함수 + 테스트: `lib/derived.ts` / `lib/derived.test.ts`의 스타일(설명 주석, 입력→출력이 명확한 작은 함수)
- 파일 업로드 버튼: `components/sample-request-form-dialog.tsx`의 숨겨진 `<input type="file">` + 트리거 버튼 패턴
- 헤더 버튼 스타일: `app/page.tsx`의 "OO님 · 전환" 버튼과 동일한 클래스(`motion.button`, `rounded-xl border border-white/20 bg-white/10 ...`)
- CRUD: `lib/supabase.ts`의 `createTask`/`updateTask`를 그대로 재사용 (새 함수 불필요)

---

### Task 1: `xlsx` 의존성 추가

**Files:**
- Modify: `package.json` / `package-lock.json` (npm이 자동 수정)

- [ ] **Step 1: 설치**

Run: `npm install xlsx@0.18.5`
Expected: `package.json`의 `dependencies`에 `"xlsx": "^0.18.5"` 추가됨

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add xlsx dependency for task import"
```

---

### Task 2: 행 매핑 순수 함수 + 테스트 (TDD)

**Files:**
- Create: `lib/excel-import.ts`
- Test: `lib/excel-import.test.ts`

- [ ] **Step 1: 실패하는 테스트 먼저 작성**

`lib/excel-import.test.ts` 새로 생성:

```ts
import { describe, it, expect } from "vitest";
import { mapImportRow } from "./excel-import";

function makeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    담당자: "구민석",
    프로젝트: "테스트 프로젝트",
    업무구분: "제품개발",
    세부업무: "세부 내용",
    우선순위: "P2-높음",
    시작일: new Date(2026, 7, 1), // 2026-08-01 (month is 0-indexed)
    마감일: new Date(2026, 7, 31), // 2026-08-31
    진행률: 0.5,
    상태: "진행중",
    팀장코멘트: "코멘트",
    ...overrides,
  };
}

describe("mapImportRow", () => {
  it("maps a fully-populated row to a TaskInput", () => {
    const result = mapImportRow(makeRow());
    expect(result).toEqual({
      input: {
        member: "구민석",
        project: "테스트 프로젝트",
        category: "제품개발",
        detail: "세부 내용",
        priority: "P2-높음",
        start_date: "2026-08-01",
        due_date: "2026-08-31",
        progress: 50,
        status: "진행중",
        comment: "코멘트",
      },
    });
  });

  it("skips a row with an unknown member", () => {
    const result = mapImportRow(makeRow({ 담당자: "알수없음" }));
    expect(result).toEqual({ skipReason: "알 수 없는 담당자: 알수없음" });
  });

  it("skips a row with an unknown category", () => {
    const result = mapImportRow(makeRow({ 업무구분: "없는분류" }));
    expect(result).toEqual({ skipReason: "알 수 없는 업무구분: 없는분류" });
  });

  it("skips a row with no project name", () => {
    const result = mapImportRow(makeRow({ 프로젝트: null }));
    expect(result).toEqual({ skipReason: "프로젝트 이름이 없습니다" });
  });

  it("defaults priority to P3-보통 when the cell is 0", () => {
    const result = mapImportRow(makeRow({ 우선순위: 0 }));
    expect("input" in result && result.input.priority).toBe("P3-보통");
  });

  it("defaults status to 예정 when the cell is 0", () => {
    const result = mapImportRow(makeRow({ 상태: 0 }));
    expect("input" in result && result.input.status).toBe("예정");
  });

  it("converts comment of 0 to null", () => {
    const result = mapImportRow(makeRow({ 팀장코멘트: 0 }));
    expect("input" in result && result.input.comment).toBeNull();
  });

  it("converts non-Date date cells (blank/time-only) to null", () => {
    const result = mapImportRow(makeRow({ 시작일: undefined, 마감일: null }));
    expect("input" in result && result.input.start_date).toBeNull();
    expect("input" in result && result.input.due_date).toBeNull();
  });

  it("rounds fractional progress to a 0-100 integer", () => {
    const result = mapImportRow(makeRow({ 진행률: 0.714286 }));
    expect("input" in result && result.input.progress).toBe(71);
  });

  it("defaults progress to 0 when the cell isn't a number", () => {
    const result = mapImportRow(makeRow({ 진행률: null }));
    expect("input" in result && result.input.progress).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx vitest run lib/excel-import.test.ts`
Expected: FAIL — `Failed to resolve import "./excel-import"` (파일이 아직 없으므로)

- [ ] **Step 3: `lib/excel-import.ts` 작성 (매핑 함수만, 아직 파일 파싱 없음)**

```ts
import {
  CATEGORIES, MEMBERS, PRIORITIES, STATUSES,
  type Category, type Member, type Priority, type Status, type TaskInput,
} from "./types";

function toDateOrNull(value: unknown): string | null {
  if (!(value instanceof Date)) return null;
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toPriority(value: unknown): Priority {
  return (PRIORITIES as readonly unknown[]).includes(value) ? (value as Priority) : "P3-보통";
}

function toStatus(value: unknown): Status {
  return (STATUSES as readonly unknown[]).includes(value) ? (value as Status) : "예정";
}

function toTextOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === 0 || value === "") return null;
  return String(value);
}

export function mapImportRow(
  row: Record<string, unknown>
): { input: TaskInput } | { skipReason: string } {
  const member = row["담당자"];
  if (!(MEMBERS as readonly unknown[]).includes(member)) {
    return { skipReason: `알 수 없는 담당자: ${String(member)}` };
  }

  const category = row["업무구분"];
  if (!(CATEGORIES as readonly unknown[]).includes(category)) {
    return { skipReason: `알 수 없는 업무구분: ${String(category)}` };
  }

  const project = row["프로젝트"];
  if (typeof project !== "string" || project.trim() === "") {
    return { skipReason: "프로젝트 이름이 없습니다" };
  }

  const progressRaw = row["진행률"];
  const progress = typeof progressRaw === "number" ? Math.round(progressRaw * 100) : 0;

  return {
    input: {
      member: member as Member,
      project,
      category: category as Category,
      detail: toTextOrNull(row["세부업무"]),
      priority: toPriority(row["우선순위"]),
      start_date: toDateOrNull(row["시작일"]),
      due_date: toDateOrNull(row["마감일"]),
      progress,
      status: toStatus(row["상태"]),
      comment: toTextOrNull(row["팀장코멘트"]),
    },
  };
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npx vitest run lib/excel-import.test.ts`
Expected: PASS — 10개 테스트 전부 통과

- [ ] **Step 5: Commit**

```bash
git add lib/excel-import.ts lib/excel-import.test.ts
git commit -m "feat: add pure row-mapping logic for excel task import"
```

---

### Task 3: 파일 파싱 함수 추가 (xlsx 연결)

**Files:**
- Modify: `lib/excel-import.ts`

- [ ] **Step 1: 파일 맨 위에 import 추가**

`lib/excel-import.ts`의 1번째 줄(기존 `import { CATEGORIES, ... } from "./types";`) 바로 위에 추가:

```ts
import * as XLSX from "xlsx";
```

- [ ] **Step 2: 파일 끝에 타입과 파싱 함수 추가**

```ts
const REQUIRED_HEADERS = [
  "담당자", "프로젝트", "업무구분", "세부업무", "우선순위",
  "시작일", "마감일", "진행률", "상태", "팀장코멘트",
] as const;

export type ParsedImportRow = { input: TaskInput; rowNumber: number };
export type ImportParseResult = {
  rows: ParsedImportRow[];
  skipped: { rowNumber: number; reason: string }[];
};

export async function parseTaskImportFile(file: File): Promise<ImportParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets["통합DB"];
  if (!sheet) throw new Error("통합DB 시트를 찾을 수 없습니다");

  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  const [header, ...dataRows] = grid;
  if (!header) throw new Error("통합DB 시트에 헤더 행이 없습니다");

  for (const required of REQUIRED_HEADERS) {
    if (!header.includes(required)) {
      throw new Error(`통합DB 시트에 "${required}" 열이 없습니다`);
    }
  }

  const rows: ParsedImportRow[] = [];
  const skipped: ImportParseResult["skipped"] = [];

  dataRows.forEach((dataRow, i) => {
    const rowNumber = i + 2; // header is row 1
    const record: Record<string, unknown> = {};
    header.forEach((h, colIdx) => {
      record[h as string] = dataRow[colIdx];
    });
    if (record["담당자"] == null && record["프로젝트"] == null) return; // blank row

    const result = mapImportRow(record);
    if ("skipReason" in result) {
      skipped.push({ rowNumber, reason: result.skipReason });
    } else {
      rows.push({ input: result.input, rowNumber });
    }
  });

  return { rows, skipped };
}
```

- [ ] **Step 3: 타입 체크로 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 통과

- [ ] **Step 4: 기존 순수 함수 테스트가 여전히 통과하는지 확인**

Run: `npx vitest run lib/excel-import.test.ts`
Expected: PASS (Task 2의 10개 테스트 그대로 통과 — `parseTaskImportFile`은 실제 파일 I/O라 여기서는 테스트하지 않고 Task 6에서 브라우저로 직접 검증한다)

- [ ] **Step 5: Commit**

```bash
git add lib/excel-import.ts
git commit -m "feat: parse 통합DB sheet into task rows via xlsx"
```

---

### Task 4: `ExcelImportButton` 컴포넌트 작성

**Files:**
- Create: `components/excel-import-button.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { parseTaskImportFile } from "@/lib/excel-import";
import { createTask, updateTask } from "@/lib/supabase";
import type { Task } from "@/lib/types";

type Props = {
  tasks: Task[];
  onImported: () => void;
};

function keyFor(member: string, project: string, category: string): string {
  return `${member}|${project}|${category}`;
}

export function ExcelImportButton({ tasks, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setBusy(true);
    setMessage(null);
    try {
      const { rows, skipped } = await parseTaskImportFile(file);

      const existingByKey = new Map(
        tasks.map((t) => [keyFor(t.member, t.project, t.category), t.id])
      );

      let created = 0;
      let updated = 0;
      let failed = 0;

      for (const row of rows) {
        const key = keyFor(row.input.member, row.input.project, row.input.category);
        const existingId = existingByKey.get(key);
        try {
          if (existingId) {
            await updateTask(existingId, row.input);
            updated++;
          } else {
            await createTask(row.input);
            created++;
          }
        } catch {
          failed++;
        }
      }

      const parts = [`${created}건 추가`, `${updated}건 갱신`];
      if (failed > 0) parts.push(`${failed}건 실패`);
      if (skipped.length > 0) parts.push(`${skipped.length}건 건너뜀`);
      setMessage(parts.join(", "));
      onImported();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "엑셀 파일을 읽지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleFileSelect}
      />
      <motion.button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium whitespace-nowrap text-white backdrop-blur-sm disabled:opacity-60"
      >
        {busy ? "가져오는 중..." : "엑셀 업로드"}
      </motion.button>
      {message && <p className="text-xs whitespace-nowrap text-white/70">{message}</p>}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크로 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 통과

- [ ] **Step 3: Commit**

```bash
git add components/excel-import-button.tsx
git commit -m "feat: add excel import button component"
```

---

### Task 5: `app/page.tsx`에 버튼 배치

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: import 추가**

`app/page.tsx`의 `SampleRequestBoard` import 다음 줄에 추가(정확한 현재 줄):

```tsx
import { SampleRequestBoard } from "@/components/sample-request-board";
import { UploadLogWidget } from "@/components/upload-log-widget";
import { ExcelImportButton } from "@/components/excel-import-button";
```

- [ ] **Step 2: "업무 추가" 버튼 앞에 배치**

`app/page.tsx`에서 아래 블록(현재 `TaskFormDialog` 바로 앞)을:

```tsx
            <TaskFormDialog
              member={member}
              trigger={
```

다음으로 교체:

```tsx
            <ExcelImportButton tasks={tasks} onImported={refresh} />
            <TaskFormDialog
              member={member}
              trigger={
```

- [ ] **Step 3: 타입 체크로 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 통과

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: place excel import button in the dashboard header"
```

---

### Task 6: 빌드/린트/테스트 확인 + 실제 파일로 브라우저 검증

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: 전체 테스트 실행**

Run: `npm test`
Expected: 모든 테스트 통과 (기존 테스트 + Task 2의 10개)

- [ ] **Step 2: lint 확인**

Run: `npm run lint`
Expected: 이번에 만든/수정한 파일에 새 에러 없음

- [ ] **Step 3: build 확인**

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 4: 실제 엑셀 파일로 브라우저 검증**

`npm run dev` 실행 후 브라우저에서:
1. 헤더의 "엑셀 업로드" 버튼 클릭 → 실제 `디자인R&D_업무관리_개인시트.xlsx` 파일 선택
2. "가져오는 중..." 표시 후 결과 메시지가 뜨는지 확인 — 이 파일은 이미 한 번 수동으로 58건 다 들어가 있으므로 **"0건 추가, 58건 갱신"** 이 나와야 정상(전부 기존 업무와 매칭되어 갱신되는 경우)
3. 업무테이블에 값이 그대로 유지되는지(갱신이라 값이 같으므로 화면상 변화 없어야 정상) 확인
4. 일부러 엑셀에서 진행률 하나를 바꾼 사본을 만들어 다시 업로드 → 해당 업무의 진행률만 바뀌는지 확인 (선택 사항, 시간 되면)
5. "통합DB" 시트를 지운 사본이나 .xlsx가 아닌 파일을 업로드해서 에러 메시지가 뜨는지 확인

- [ ] **Step 5: 최종 커밋 (수정사항이 있었다면)**

```bash
git status
```

검증 중 코드를 수정했다면 해당 파일들을 커밋한다. 수정이 없었다면 건너뛴다.

---

## Self-Review 결과

- **스펙 커버리지:** 파싱+매핑(Task 2~3), 중복 판단/저장(Task 4), 배치(Task 5), 검증
  (Task 6) — 스펙의 모든 섹션과 1:1 대응됨.
- **플레이스홀더 스캔:** 없음 — 모든 스텝에 실제 코드/명령어 포함.
- **타입 일관성:** `ParsedImportRow`/`ImportParseResult`가 Task 3~4에서 동일하게
  사용됨. `mapImportRow`의 반환 타입(`{ input: TaskInput } | { skipReason: string }`)이
  Task 2 테스트와 Task 3의 `parseTaskImportFile` 양쪽에서 일관되게 쓰임.
  `ExcelImportButton`의 `onImported: () => void`가 `app/page.tsx`의 `refresh`
  (반환 타입 `Promise<void>`, `() => void`에 할당 가능)와 호환됨.
