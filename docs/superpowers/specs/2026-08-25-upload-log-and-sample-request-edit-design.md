# 업로드 기록 위젯 + 샘플 요청 수정 기능 — 설계 문서

## 배경 / 목적

제직 담당자(구민석·안도현)는 매일 회사 프로그램(이 대시보드 밖)에 디자인 파일을
신규/수정/동일 세 분류로 업로드한다. 지금은 이 작업량을 어디에도 기록하지
않는다. 이번 기능은 두 사람이 파일을 올릴 때마다 버튼 한 번으로 건수를
기록하고, 주간/월간으로 합산해 한눈에 볼 수 있게 한다.

동시에, 이전에 만든 샘플 제직 요청 기능에 등록/삭제/상태변경은 있지만
내용(건명·사양·담당자 등)을 고치는 수정 기능이 빠져 있어 같이 추가한다.
두 기능은 서로 독립적이지만 규모가 작아 하나의 설계 문서로 묶는다.

## 범위

1. Supabase 신규 테이블 `upload_logs`
2. `components/upload-log-widget.tsx` — 메인 대시보드 맨 아래 위젯 (신규)
3. `lib/derived.ts`에 `summarizeUploadLogs` 순수 함수 추가 + 테스트
4. `SampleRequestFormDialog`를 등록/수정 겸용으로 확장
5. `SampleRequestDetailDialog`에 "수정" 버튼 추가
6. `lib/supabase.ts`에 `updateSampleRequest`, upload_logs 관련 CRUD 함수 추가

기존 기술 스택만 사용한다 (Next.js, Supabase, shadcn/ui). 새 라이브러리 추가 없음.

## 1. 업로드 기록 — 데이터 모델

### Supabase 테이블 `upload_logs`

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | uuid, PK | 기본키 |
| `member` | text | `구민석` \| `안도현` (기존 `Weaver` 타입 재사용) |
| `category` | text | `신규` \| `수정` \| `동일` |
| `created_at` | timestamptz | 기본값 `now()` — 이 값으로 일간/주간/월간 집계 |

RLS: 기존 테이블과 동일하게 완전 공개(읽기/쓰기/삭제 제한 없음).
`supabase/upload_logs.sql`에 마이그레이션 스크립트 작성, 사용자가 Supabase
SQL Editor에서 수동 실행.

### 타입 (`lib/types.ts`)

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

### CRUD (`lib/supabase.ts`)

- `listUploadLogs(): Promise<UploadLog[]>` — 전체 조회, `created_at` 내림차순
  (주간/월간 집계는 클라이언트에서 계산하므로 전체를 한 번에 가져온다;
  이 팀 규모에서 로그 총량은 매우 작아 문제되지 않는다)
- `createUploadLog(member: Weaver, category: UploadLogCategory): Promise<UploadLog>`
- `deleteUploadLog(id: string): Promise<void>` — 되돌리기(−) 버튼용

## 2. 업로드 기록 위젯 (`components/upload-log-widget.tsx`)

메인 대시보드 맨 아래, `MemberProgressBars` 다음에 배치하는 새 위젯 하나.

### 평소 화면 (간략)

구민석/안도현 두 줄. 각 줄:
- 이름
- 신규/수정/동일 버튼 3개. 버튼 안에 오늘 그 사람이 그 분류로 누른 횟수가
  같이 표시된다 (예: `신규 3`). 클릭하면 즉시 1건 기록되고 숫자가 올라간다.
- 각 버튼 옆에 작은 되돌리기(−) 아이콘 버튼. 오늘 그 사람·그 분류 기록이
  1건 이상일 때만 활성화되고, 누르면 가장 최근 기록 1건을 지운다(카운트
  즉시 감소).

### "주간/월간 보기" 확장 카드

위젯 헤더에 "주간/월간 보기" 토글 버튼. 누르면 아래에 표 카드가 펼쳐진다:
- "이번 주" / "이번 달" 탭 전환
- 표: 행 = 구민석/안도현, 열 = 신규/수정/동일/합계
- 주 기준은 월요일 시작, 월 기준은 달력상 1일~말일 (둘 다
  `summarizeUploadLogs`가 계산)

### 상태/에러 처리

- 위젯 마운트 시 `listUploadLogs()`로 전체 로그를 불러와 로컬 state에 보관
- 버튼 클릭: 로컬에 낙관적으로 새 로그를 추가 → `createUploadLog` 호출 →
  실패 시 되돌리고 에러 메시지 (기존 패턴과 동일)
- 되돌리기 클릭: 로컬에서 해당 항목 제거 → `deleteUploadLog` 호출 → 실패 시
  복원하고 에러 메시지

## 3. 순수 함수 (`lib/derived.ts`)

```ts
export function summarizeUploadLogs(
  logs: UploadLog[],
  range: "week" | "month",
  now: Date = new Date()
): Record<Weaver, Record<UploadLogCategory, number>>
```

- `week`: `now`가 속한 월요일~일요일 범위
- `month`: `now`가 속한 달의 1일~말일 범위
- 반환값은 `{ 구민석: { 신규: n, 수정: n, 동일: n }, 안도현: { ... } }` 형태로,
  위젯이 바로 표로 렌더링할 수 있게 한다
- `lib/derived.test.ts`에 주 경계(월요일 자정 등)와 월 경계 케이스 포함해
  테스트 작성

오늘 카운트(위젯 평소 화면용)는 별도 함수 없이 `logs.filter(l => l.member
=== member && l.category === category && toLocalDateKey(new
Date(l.created_at)) === toLocalDateKey(new Date()))` 형태로 위젯 안에서
직접 계산한다 (기존 `toLocalDateKey` 재사용, 새 함수 불필요).

## 4. 샘플 요청 수정 기능

### `lib/supabase.ts`

```ts
export async function updateSampleRequest(
  id: string,
  input: SampleRequestInput
): Promise<SampleRequest>
```
`updateTask`와 동일한 패턴 (전체 필드 갱신 + `updated_at` 갱신).

### `SampleRequestFormDialog` 확장

- 새 선택적 prop `request?: SampleRequest`, `open?: boolean`,
  `onOpenChange?: (open: boolean) => void` 추가 (controlled/uncontrolled
  겸용 — `TaskFormDialog`와 동일한 패턴)
- `request`가 있으면: 폼 초기값을 그 값으로 채움, 다이얼로그 제목
  "샘플 제직 요청 수정", 버튼 문구 "수정하기", `onSubmit`은 부모가 넘겨준
  업데이트 핸들러를 호출
- `request`가 없으면: 지금과 동일하게 "등록" 모드

### `SampleRequestDetailDialog`

- 새 prop `onEdit: (request: SampleRequest) => void`
- 하단에 "수정" 버튼 추가 (기존 "요청 삭제" 버튼 위). 클릭 시 자기 자신을
  닫고(`setOpen(false)`) `onEdit(request)` 호출

### `SampleRequestBoard`

- `editingRequest: SampleRequest | null` state 추가
- `RequestCard` → `SampleRequestDetailDialog`에 `onEdit={setEditingRequest}`
  전달
- `handleUpdate(id, input)` 추가 (기존 `handleCreate`/`handleDelete`와 동일
  패턴: 낙관적 갱신 → `updateSampleRequest` 호출 → 실패 시 롤백 + 에러)
- `editingRequest`가 있으면 controlled `SampleRequestFormDialog`를
  `request={editingRequest}` `open` `onOpenChange={() =>
  setEditingRequest(null)}`로 렌더링 (`app/page.tsx`가 `editingTask`를
  다루는 방식과 동일)

## 영향받는 파일

- 신규: `supabase/upload_logs.sql`
- 신규: `components/upload-log-widget.tsx`
- `lib/types.ts` — `UploadLog`, `UploadLogCategory`, `UPLOAD_LOG_CATEGORIES` 추가
- `lib/supabase.ts` — `listUploadLogs`/`createUploadLog`/`deleteUploadLog`/`updateSampleRequest` 추가
- `lib/derived.ts` / `lib/derived.test.ts` — `summarizeUploadLogs` 추가
- `components/sample-request-form-dialog.tsx` — 등록/수정 겸용으로 확장
- `components/sample-request-detail-dialog.tsx` — "수정" 버튼 추가
- `components/sample-request-board.tsx` — 수정 다이얼로그 상태 관리 추가
- `app/page.tsx` — `UploadLogWidget`을 `MemberProgressBars` 다음(맨 아래)에 배치

## 테스트 / 검증

- `lib/derived.test.ts`에 `summarizeUploadLogs` 케이스 추가 (주/월 경계 포함)
- 구현 후 `npm run dev`로 로컬 구동해 브라우저에서:
  - 버튼 클릭 시 오늘 카운트가 즉시 올라가고 새로고침해도 유지되는지
  - 되돌리기(−)로 최근 기록이 지워지는지, 0건일 때 비활성화되는지
  - 주간/월간 보기 표가 실제 데이터와 맞는지
  - 샘플 요청 "수정" 버튼으로 값이 채워진 채 열리고, 수정 후 카드에 반영되는지
