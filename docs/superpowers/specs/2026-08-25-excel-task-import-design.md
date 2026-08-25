# 엑셀 업무 가져오기(업로드) — 설계 문서

## 배경 / 목적

팀이 계속 써오던 원본 엑셀(`디자인R&D_업무관리_개인시트.xlsx`)의 "통합DB" 시트에는
담당자별 업무가 표 형태로 정리되어 있다. 지금까지는 이 파일을 사람이 직접 읽어서
대시보드 업무표에 수동으로 옮겼다(58건 1회성 이전 완료). 이 작업을 앱 안에서
버튼 한 번으로 할 수 있게 만든다 — 엑셀을 고칠 때마다 다시 업로드하면 대시보드가
따라잡는 흐름.

## 범위

1. `lib/excel-import.ts` — xlsx 파싱 + 업무 데이터 매핑 (순수 함수 위주)
2. `components/excel-import-button.tsx` — 업로드 버튼 + 진행/결과 UI
3. `app/page.tsx` — 버튼 배치("업무 추가" 옆)

새 의존성 `xlsx`(SheetJS) 추가 — 브라우저가 .xlsx를 기본으로 읽을 방법이 없어
불가피함. 서버 API 라우트는 만들지 않는다(파싱은 클라이언트에서 끝냄, 저장만
기존 Supabase 클라이언트로).

## 1. 엑셀 파싱 + 매핑 (`lib/excel-import.ts`)

### 대상 시트

파일에서 이름이 정확히 `"통합DB"`인 시트를 찾는다. 없으면
`Error("통합DB 시트를 찾을 수 없습니다")`를 던진다.

### 컬럼 매핑

헤더 행(첫 번째 행)에서 아래 이름으로 열을 찾는다 — 열 순서가 바뀌어도 이름으로
찾으므로 안전하다. 하나라도 없으면 에러.

| 엑셀 헤더 | TaskInput 필드 | 비고 |
|---|---|---|
| 담당자 | `member` | `MEMBERS` 중 하나가 아니면 그 행은 건너뛰고 결과의 `skipped`에 사유 기록 |
| 프로젝트 | `project` | |
| 업무구분 | `category` | `CATEGORIES` 중 하나가 아니면 위와 동일하게 skip |
| 세부업무 | `detail` | 비어있으면 `null` |
| 우선순위 | `priority` | 비어있거나 `0`이면 `"P3-보통"` 기본값 |
| 시작일 | `start_date` | 날짜가 아니면(시간만 있는 셀 등) `null` |
| 마감일 | `due_date` | 위와 동일 |
| 진행률 | `progress` | 엑셀은 0~1 소수 → `Math.round(v * 100)`으로 0~100 정수 변환 |
| 상태 | `status` | 비어있거나 `0`이면 `"예정"` 기본값. `STATUSES` 중 하나가 아니면 skip |
| 팀장코멘트 | `comment` | 비어있거나 `0`이면 `null` |

### 함수 시그니처

```ts
export type ParsedImportRow = { input: TaskInput; rowNumber: number };
export type ImportParseResult = {
  rows: ParsedImportRow[];
  skipped: { rowNumber: number; reason: string }[];
};

export async function parseTaskImportFile(file: File): Promise<ImportParseResult>;
```

`rowNumber`는 엑셀의 실제 행 번호(에러 메시지에 쓰기 위함, 1행=헤더이므로 데이터는
2부터 시작).

## 2. 중복 판단 + 저장 (`components/excel-import-button.tsx`)

- Props: `tasks: Task[]`(현재 로드된 업무 목록, 중복 판단용), `onImported: () => void`
  (완료 후 `app/page.tsx`의 `refresh()` 호출용)
- 버튼 클릭 → 숨겨진 `<input type="file" accept=".xlsx">` 클릭 트리거
- 파일 선택 시:
  1. `parseTaskImportFile(file)` 호출
  2. 실패하면(시트 없음 등) 에러 메시지 표시하고 종료
  3. 성공하면 각 파싱된 행에 대해 `담당자+프로젝트+업무구분`이 기존 `tasks`와
     일치하는 게 있는지 확인
     - 일치 → `updateTask(id, input)` (기존 업무의 진행률·상태·마감일 등을
       새 값으로 덮어씀)
     - 불일치 → `createTask(input)` (신규 추가)
  4. 모두 순차 처리 후(하나 실패해도 나머지 계속 진행, 실패는 카운트만) 결과 요약
     문구 표시: `"OO건 추가, OO건 갱신, OO건 실패, OO건 건너뜀"` 형태
  5. `onImported()` 호출해서 화면 새로고침

버튼은 처리 중 `disabled` + "가져오는 중..." 문구로 중복 클릭 방지.

## 3. `app/page.tsx` 배치

`TaskFormDialog`("업무 추가") 트리거 버튼 바로 옆에 `ExcelImportButton` 배치.
`tasks`와 `refresh`를 그대로 넘긴다(이미 있는 상태/함수, 새로 만들 것 없음).

## 오류 처리

- 파일이 .xlsx가 아니거나 손상됨 → SheetJS가 읽기 실패 → 에러 메시지 표시
- "통합DB" 시트 없음 / 필수 헤더 없음 → 명확한 에러 메시지, 아무것도 저장 안 함
  (부분 성공 없음 — 매핑 실패는 전부-혹은-전무, 저장 단계에서의 개별 실패만
  부분 허용)
- `member`/`category`/`status`가 앱이 아는 값이 아닌 행은 조용히 skip하고
  최종 요약에 건수로만 알림(어떤 행인지 상세 로그는 없음 — 필요해지면 나중에
  추가)

## 테스트

- `lib/excel-import.ts`의 매핑 로직(우선순위/상태 기본값 치환, 진행률 0~1→0~100
  변환, 시간만 있는 날짜 셀 처리)은 순수 함수로 분리해 `lib/excel-import.test.ts`에
  vitest 테스트 작성 — 실제 xlsx 워크북 객체를 최소 구성으로 만들어 검증
- 구현 후 실제 원본 엑셀 파일로 브라우저에서 직접 업로드해 결과 확인 (이미 58건이
  들어가 있으므로 "전부 갱신, 0건 추가"가 나와야 정상)
