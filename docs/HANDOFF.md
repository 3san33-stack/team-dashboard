# team-dashboard — 세션 인계 요약

다음 대화로 넘어갈 때 이 파일을 참고하면 프로젝트 전체 맥락을 빠르게 복원할 수 있습니다.
새 세션에서 "team-dashboard 프로젝트 이어서 작업할게, docs/HANDOFF.md 읽어줘"라고
하면 됩니다.

## 프로젝트 개요

- **목적**: 디자인R&D 팀(5명: 이은혜, 김혜진, 양세현, 구민석, 안도현)이 엑셀
  파일(`디자인R&D_업무관리_개인시트.xlsx`)로 각자 관리하던 업무를 실시간 공유
  웹 대시보드로 전환. 이제는 그 엑셀을 직접 업로드해서 대시보드에 동기화할 수도 있음.
- **로그인**: 비밀번호 없음, 이름 선택만(localStorage에 저장). 내부 소규모
  팀용이라는 특성을 반영한 의도적 저보안 트레이드오프.
- **DB 보안**: Supabase anon key + 완전 공개 RLS 정책(read/write 제한 없음).
  같은 이유로 의도된 선택.
- **제직 워크플로우**: 구민석·안도현이 제직 담당자(Weaver). 디자이너가 샘플
  제직을 요청하면(칸반 보드) 두 사람이 상태를 진행시키고, 별도로 하루 업로드
  건수(신규/수정/동일)를 기록.

## 기술 스택

Next.js 16(App Router, Turbopack) · TypeScript · Tailwind v4 · shadcn/ui
(내부적으로 Radix가 아니라 `@base-ui/react` 사용) · motion/react · bklit-ui
차트 컴포넌트 일부 · Supabase(`@supabase/supabase-js`, DB + Storage) ·
`@dnd-kit/core`(샘플 요청 카드 드래그 앤 드롭) · `xlsx`(SheetJS, 엑셀 업로드) ·
vitest(`lib/*.ts` 순수 함수만 테스트하는 컨벤션, 컴포넌트/페이지는 테스트 없음).

## 핵심 파일

- `lib/types.ts` — `Member`, `Task`, `TaskInput`, `PersonalTodoItem`,
  `Weaver`, `SampleRequest`/`SampleRequestInput`, `UploadLog`/`UploadLogCategory`
- `lib/derived.ts` — 순수 파생 함수 모음(TDD, `lib/derived.test.ts` 36개+
  통과): `isOverdue`, `averageProgress`, `statusColor`, `priorityColor`,
  `monthCategoryContribution`, `teamCategoryDistribution`, `taskMatchesQuery`,
  `toLocalDateKey`, `isRedDay`, `startOfMonthGrid`, `startOfWeek`,
  `upcomingDeadlines`, `taskStatusEmoji`, `dayStatusEmojis`, `memberSummary`,
  `summarizeUploadLogs`(주간/월간 집계), `uploadCountOnDay`,
  `uploadCountFor`(담당자·분류별 하루 건수)
- `lib/supabase.ts` — Task/PersonalTodo/SampleRequest/UploadLog 전체 CRUD
- `lib/push.ts` — Web Push 구독 헬퍼(VAPID)
- `lib/export-csv.ts` — 업무 테이블 + 업로드기록 CSV 내보내기
  (`downloadTasksAsCsv`, `downloadUploadLogsAsCsv`)
- `lib/image-upload.ts` — 샘플 요청 참고이미지 압축(캔버스, 최대 1600px·JPEG
  q0.8) 후 Supabase Storage 업로드/삭제
- `lib/excel-import.ts` — 엑셀 "통합DB" 시트 → `TaskInput[]` 변환
  (`mapImportRow` 순수 함수 + `parseTaskImportFile` xlsx 파싱)
- `lib/category-colors.ts` — 업무구분별 색상(파이차트/기여율 공용)

### 컴포넌트

- `components/member-select.tsx` — 좌우 분할 로그인 화면. 배경은
  `public/member-select-bg.mp4`(정방향+역방향을 이어붙인 부메랑 영상, ffmpeg로
  제작) + `bg.jpg` 폴백. **`member-select-bg-original.mp4`가 백업용으로
  아직 커밋 안 된 채 워킹트리에 남아있음 — 필요 없으면 삭제, 필요하면 커밋할 것.**
- `components/summary-cards.tsx`, `member-progress-bars.tsx`,
  `task-table.tsx`, `task-form-dialog.tsx`, `contribution-report.tsx`(팀원별
  기여율만), `category-distribution.tsx`(업무구분 분포 파이차트, 원래
  contribution-report에서 분리됨), `task-calendar.tsx` + `full-calendar-dialog.tsx`
- `components/personal-todo.tsx` — Supabase `personal_todos` 테이블 사용
- `components/theme-toggle.tsx` — 라이트 기본, 다크는 토글로 전환·저장
- `components/push-notification-toggle.tsx` — 헤더 종 아이콘, Web Push 구독
- `components/upcoming-deadlines.tsx` — **더 이상 카드가 아니라 헤더의 종
  아이콘 팝오버**(건수 배지 표시, 클릭하면 목록)
- `components/department-report.tsx` — `/report` 페이지, "부서장님 보고" 재현
- `components/sample-request-board.tsx` — 샘플 제직 요청 칸반(요청됨/확인함/
  제직중/완료). `@dnd-kit/core`로 카드 드래그 앤 드롭 상태변경, 완료 칸은
  기본 접힘("보관함 보기"), 각 칸 `max-h-96` 스크롤
- `components/sample-request-form-dialog.tsx` — 요청 등록/수정 겸용(이미지
  업로드 포함), `components/sample-request-detail-dialog.tsx` — 상세보기(이미지
  미리보기, 수정/삭제 버튼)
- `components/upload-log-widget.tsx` — 구민석/안도현 일일 업로드 건수(신규/
  수정/동일) 버튼+되돌리기, 이번주 막대그래프, 이번달 미니 캘린더(색상,
  테두리 있음 — 밝은 모니터 대비용), "주간/월간 보기"로 숫자 적힌 캘린더 확장
- `components/upload-log-day-dialog.tsx` — 캘린더 날짜 클릭 시 그날 담당자·
  분류별 건수 보기 + 과거 날짜도 +/− 로 수정 가능
- `components/excel-import-button.tsx` — 헤더의 "엑셀 업로드" 버튼. 통합DB
  시트를 읽어 담당자+프로젝트+업무구분 일치 시 갱신, 없으면 신규 추가
- `components/ui/popover.tsx` — shadcn CLI로 추가된 Popover(마감임박 알림에 사용)
- `components/side-rail.tsx` — **2xl(1536px+)에서만** 보이는 좌우 여백의 스티키
  사이드레일. 오늘 날짜·팀 현황(전체/진행중/완료/지연)·마감 임박/지연 목록·
  부서장님 보고 링크. 순수 파생 데이터만 사용(추가 Supabase 호출 없음).
  `app/page.tsx` 루트가 flex로 바뀜: 안쪽 `max-w-[1200px]` 컨텐츠 + `aside`,
  바깥은 `2xl:max-w-[1480px]`

### 페이지 / API

- `app/page.tsx` — 메인 대시보드. 헤더에 마감임박 알림 종·엑셀 업로드·업무
  추가 버튼. 순서: 샘플 제직 요청 → 업무테이블 → [개인할일|캘린더] →
  [업무구분분포|기여율|팀원평균진행률] → 업로드 기록 위젯. 전체 폭
  `max-w-[1200px] mx-auto`로 넓은 모니터에서 여백 확보.
- `app/report/page.tsx` — 부서장님 보고
- `app/api/cron/daily-digest/route.ts` — 평일 09:00 KST Web Push 발송

## 배포 상태

- **Vercel**: `guseok98-6059s-projects/team-dashboard`,
  프로덕션 URL **https://team-dashboard-amber.vercel.app**
- **GitHub**: **https://github.com/3san33-stack/team-dashboard**
  (master 브랜치, Vercel과 연동되어 push 시 자동 재배포. **워크플로우: 항상
  master에 직접 커밋 → 사용자에게 push 확인 후 push**)
- **환경변수**(로컬 `.env.local` + Vercel 양쪽 등록됨):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
  `CRON_SECRET`
- **Supabase 테이블** (전부 `supabase/*.sql` 마이그레이션 있고 실행 완료):
  `tasks`(68건, 엑셀 58건 포함), `push_subscriptions`, `personal_todos`,
  `sample_requests`, `upload_logs`
- **Supabase Storage**: `sample-request-images` 버킷(공개, 샘플 요청 참고
  이미지). `supabase/sample_request_images_bucket.sql`로 버킷+정책 생성 —
  **버킷 생성 SQL은 storage.buckets/storage.objects insert/delete/**select**
  정책 3개 다 필요** (select 빠뜨리면 삭제가 내부적으로 조회 실패해서 안 됨,
  이번 세션에 실제로 겪은 이슈).
- **PWA**: `public/manifest.json` + 아이콘. iOS는 Safari에서만 설치 가능.

## 디자인 참고 자료(실제 사이트 아님, 이미지/스펙 참고만)

- **Talvex** — 카드형 위젯 그리드 레이아웃
- **Aurora Sign Up** — 로그인 화면 좌우 분할 배치
- **Aurora Weather** — 리퀴드 글래스 카드 스타일

## 검토했지만 미채택

- **카카오톡 알림톡** — 유료/절차 부담으로 배제, **Web Push** 채택(무료)
- **전체 기록 보기(월별 히스토리 표)** — 업로드 기록 위젯에 만들었다가
  캘린더 클릭으로 같은 정보를 더 잘 보여줄 수 있어서 제거함
  (`monthlyUploadHistory` 함수도 같이 삭제)

## 알려진 한계 / 남은 선택지

- 캘린더 빨간날은 **양력 고정 공휴일만** 반영
- Supabase 데이터 자동 백업 없음 — 업무테이블/업로드기록 각각 "엑셀로
  내보내기"로 수동 백업 가능
- Supabase 무료 프로젝트는 ~1주 미사용 시 자동 일시정지
- Vercel Cron 무료 요금제는 **하루 1회 실행 한도**
- 엑셀 업로드는 "통합DB" 시트 이름과 정확한 헤더명(담당자/프로젝트/업무구분/
  세부업무/우선순위/시작일/마감일/진행률/상태/팀장코멘트)에 의존 — 시트
  이름이나 헤더가 바뀌면 에러 메시지로 알려주지만 자동 대응은 안 함
- `public/member-select-bg-original.mp4`가 아직 커밋 안 된 채 남아있음(위 참고)
- **`tasks` 테이블에 마감일이 `1899-12-30`(엑셀 빈 날짜 serial 0)으로 들어간
  레거시 행 몇 개 있음** — 과거 수동 이전분. `upcomingDeadlines`에서
  `>= "2000-01-01"` 필터로 가려놨지만 캘린더/보고 화면엔 아직 노출됨.
  정리하려면 사용자가 SQL Editor에서:
  `UPDATE tasks SET due_date = NULL WHERE due_date < '2000-01-01';`

## 세션 규칙/선호 (기억해둘 것)

- **"무료 아니면 절대 진행하지 않는다"** — 새 기능 제안 시 항상 비용부터 확인
- 큰 디자인 변경 전에는 옵션을 짧게 제시하고 사용자 선택을 받은 뒤 진행
- git 커밋 계정: `guseok98 <guseok98@gmail.com>` (로컬 설정됨)
- 코드 수정 후에는 브라우저로 직접 동작 확인 후 커밋(테스트 스킵 안 함)
- **작업 흐름**: 큰 기능은 브레인스토밍(설계 문서 `docs/superpowers/specs/`)
  → 구현 계획(`docs/superpowers/plans/`) → 서브에이전트로 태스크별 구현+
  리뷰 → 커밋(마스터에 직접) → **push는 항상 사용자 확인 후**
- Supabase SQL 마이그레이션은 내가 직접 실행 못함(anon key만 있음) — 사용자가
  SQL Editor에서 직접 실행해야 함, 매번 "이 SQL만 실행해주세요"로 정확히
  전달할 것(이전에 사용자가 헷갈려서 엉뚱한 파일을 다시 실행한 적 있음)
- 화면 최대 너비는 사용자 취향에 맞춰 여러 번 좁혀짐(1600→1400→1300→1200px)
  — 더 조정 요청 오면 `app/page.tsx`의 `max-w-[1200px]` 값만 바꾸면 됨

## 이번 세션에 새로 만든 것 (요약)

1. **샘플 제직 요청 칸반** — 등록/수정/삭제, 이미지 첨부(압축 업로드),
   드래그 앤 드롭 상태변경, 완료 보관함
2. **업로드 기록 위젯** — 일일 신규/수정/동일 기록, 주간 막대그래프, 월간
   미니 캘린더, 날짜 클릭으로 과거 기록 조회/수정
3. **엑셀 업무 가져오기** — 원본 엑셀 재업로드로 대시보드 동기화(중복은
   담당자+프로젝트+업무구분 기준 갱신)
4. **레이아웃 정리** — 마감임박을 헤더 종 팝오버로, 위젯 순서 재배치,
   화면 최대 너비 제한
5. 원본 엑셀 "통합DB" 시트 58건을 1회 수동 이전 완료(이후 위 3번 기능으로
   재현 가능함을 확인)

## 이전 세션에서 만든 것 (참고용, 별도 산출물)

프로젝트 코드와 무관한 Claude 아티팩트:
1. **보고서**: https://claude.ai/code/artifact/2f66a1f0-9f92-4153-be40-877ca4e98ed1
2. **애니메이션 설명 영상**: https://claude.ai/code/artifact/a6f264fb-fb1e-4c4a-8258-482b3ce23853
3. **대시보드 제작 노트**: https://claude.ai/code/artifact/c22ac437-8d38-483c-84fb-119c770b2237
