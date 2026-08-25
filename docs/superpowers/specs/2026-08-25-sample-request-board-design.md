# 샘플 제직 요청 칸반 — 설계 문서

## 배경 / 목적

디자이너(이은혜·김혜진·양세현·구민석·안도현 중 요청자)가 제직자(구민석·안도현)에게
샘플 제직을 요청하는 흐름을 대시보드 위젯으로 만든다. 지금까지는 이 흐름이 대시보드
밖(구두/메신저)에서 이뤄졌고, 업무표에 있는 "샘플제직" 카테고리는 요청자/제직담당자를
구분하지 못한다. 새 섹션은 기존 업무표와 완전히 분리된, 요청→처리 전용 워크플로우다.

## 범위

1. Supabase 신규 테이블 `sample_requests`
2. `components/sample-request-board.tsx` — 4열 칸반 위젯 (메인 대시보드에 배치)
3. `components/sample-request-form-dialog.tsx` — 새 요청 등록 다이얼로그
4. `lib/types.ts`, `lib/supabase.ts` 확장

기존 기술 스택만 사용한다 (Next.js, Supabase, shadcn/ui). 드래그 앤 드롭 라이브러리는
추가하지 않는다 — 상태 변경은 카드 안 드롭다운으로 처리한다. Web Push 알림 연동은
이번 범위에 포함하지 않는다 (요청 시 알림 없음, 화면에서만 확인).

## 1. 데이터 모델

### Supabase 테이블 `sample_requests`

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | uuid, PK | 기본키 |
| `requester` | text | 요청자 (`Member` 5명 중 1) |
| `weaver` | text | 제직 담당자 — `구민석` \| `안도현`만 허용 |
| `title` | text | 샘플명/건명 (필수) |
| `spec_note` | text, nullable | 사양/메모 (원사, 조직, 수량 등 자유 기재) |
| `reference_link` | text, nullable | 참고 일러스트 파일 위치 링크 (자유 텍스트) |
| `desired_date` | date, nullable | 희망 완료일 |
| `status` | text | `요청됨` \| `확인함` \| `제직중` \| `완료` (기본값 `요청됨`) |
| `created_at` | timestamptz | 기본값 `now()` |
| `updated_at` | timestamptz | 기본값 `now()`, 수정 시 갱신 |

RLS: 기존 `tasks`/`personal_todos`와 동일하게 완전 공개(읽기/쓰기 제한 없음).
`supabase/sample_requests.sql`에 마이그레이션 스크립트 작성, 사용자가 Supabase
SQL Editor에서 수동 실행.

### 타입 (`lib/types.ts`)

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

### CRUD (`lib/supabase.ts`)

기존 Task CRUD와 동일한 패턴으로 `fetchSampleRequests`, `createSampleRequest`,
`updateSampleRequestStatus(id, status)` 3개 함수 추가.

## 2. 컴포넌트

### `SampleRequestBoard` (`components/sample-request-board.tsx`)

메인 대시보드에 들어가는 위젯 하나. 상단에 제목 + "+ 새 요청" 버튼, 본문은
`요청됨 / 확인함 / 제직중 / 완료` 4열 칸반. 각 칸은 세로 스크롤 가능한 카드 목록.

카드에 표시하는 정보:
- 건명 (`title`)
- `요청자 → 제직담당자` (예: "김혜진 → 구민석")
- 희망 완료일 (있으면)
- 참고 일러스트 링크 — `http`로 시작하면 클릭 가능한 링크 아이콘, 아니면 텍스트만 표시
- 하단: 상태 변경 `Select` 드롭다운 (기존 `task-table.tsx`의 상태 필터와 동일한
  shadcn `Select` 컴포넌트 재사용). 값 변경 시 `updateSampleRequestStatus` 호출 후
  로컬 상태 갱신.

빈 칸(해당 상태의 카드 없음)에는 "없음" 같은 옅은 플레이스홀더 문구 표시.

### `SampleRequestFormDialog` (`components/sample-request-form-dialog.tsx`)

"+ 새 요청" 클릭 시 열리는 다이얼로그. 입력 항목:
- 요청자: `Select` (`MEMBERS` 5명)
- 제직 담당자: `Select` (`WEAVERS` — 구민석/안도현만)
- 건명: 텍스트 입력 (필수)
- 사양/메모: `Textarea` (선택)
- 참고 일러스트 링크: 텍스트 입력 (선택, URL 형식 검증 없음)
- 희망 완료일: 날짜 입력 (선택)

필수 항목(요청자/제직담당자/건명) 미입력 시 등록 버튼 비활성화. 등록 시
`status: "요청됨"`으로 생성.

### `app/page.tsx` 배치

기존 3열 그리드(멤버 진행률/개인할일/마감임박)와 업무테이블 사이에 `SampleRequestBoard`
섹션 하나를 전체 너비로 추가한다.

## 3. 검증 / 예외 처리

- 필수 입력 누락 시 등록 버튼 비활성화 (기존 `task-form-dialog` 패턴과 동일)
- 참고 링크는 자유 텍스트 — URL 형식 검증 없음, `http`로 시작할 때만 클릭 가능한
  링크로 렌더링하고 아니면 일반 텍스트로만 표시
- 제직 담당자 드롭다운은 애초에 구민석/안도현 2개 옵션만 제공해 잘못된 담당자 지정을
  구조적으로 방지
- 신규 테이블이므로 기존 `tasks` 데이터/화면에는 영향 없음

## 4. 테스트

- 이 기능은 대부분 CRUD + 화면 컴포넌트이므로 기존 컨벤션대로 컴포넌트 자체 테스트는
  작성하지 않는다
- 상태별 그룹핑처럼 순수 함수가 필요해지면(예: `groupByStatus`) `lib/derived.ts`에
  추가하고 `lib/derived.test.ts`에 케이스 작성
- 구현 후 `npm run dev`로 로컬 구동해 브라우저에서 직접 확인:
  - 새 요청 등록 → "요청됨" 칸에 카드 생성 확인
  - 카드 드롭다운으로 상태 변경 → 칸 이동 확인, 새로고침해도 유지되는지(Supabase 반영) 확인
  - 참고 링크 있는/없는 카드 모두 정상 렌더링 확인
  - 반응형(모바일 1열 스택) 확인

## 영향받는 파일

- `lib/types.ts` — `SampleRequest` 관련 타입 추가
- `lib/supabase.ts` — CRUD 함수 추가
- 신규: `components/sample-request-board.tsx`
- 신규: `components/sample-request-form-dialog.tsx`
- 신규: `supabase/sample_requests.sql`
- `app/page.tsx` — 위젯 배치 추가
