# team-dashboard — 세션 인계 요약

다음 대화로 넘어갈 때 이 파일을 참고하면 프로젝트 전체 맥락을 빠르게 복원할 수 있습니다.

## 프로젝트 개요

- **목적**: 디자인R&D 팀(5명: 이은혜, 김혜진, 양세현, 구민석, 안도현)이 엑셀
  파일(`디자인R&D_업무관리_개인시트.xlsx`)로 각자 관리하던 업무를 실시간 공유
  웹 대시보드로 전환.
- **로그인**: 비밀번호 없음, 이름 선택만(localStorage에 저장). 내부 소규모
  팀용이라는 특성을 반영한 의도적 저보안 트레이드오프.
- **DB 보안**: Supabase anon key + 완전 공개 RLS 정책(read/write 제한 없음).
  같은 이유로 의도된 선택.

## 기술 스택

Next.js 16(App Router, Turbopack) · TypeScript · Tailwind v4 · shadcn/ui
(내부적으로 Radix가 아니라 `@base-ui/react` 사용) · motion/react · bklit-ui
차트 컴포넌트 일부 · Supabase(`@supabase/supabase-js`) · vitest(`lib/*.ts`
순수 함수만 테스트하는 컨벤션, 컴포넌트/페이지는 테스트 없음).

## 핵심 파일

- `lib/types.ts` — `Member`, `Task`, `TaskInput`, `PersonalTodoItem`
- `lib/derived.ts` — 순수 파생 함수 모음(TDD, `lib/derived.test.ts` 30개 통과):
  `isOverdue`, `averageProgress`, `statusColor`, `priorityColor`,
  `monthCategoryContribution`(start_date 없으면 due_date로 폴백),
  `teamCategoryDistribution`, `taskMatchesQuery`, `toLocalDateKey`,
  `isRedDay`, `startOfMonthGrid`, `upcomingDeadlines`, `taskStatusEmoji`,
  `dayStatusEmojis`, `memberSummary`
- `lib/supabase.ts` — Task CRUD + PersonalTodo CRUD
- `lib/push.ts` — Web Push 구독 헬퍼(VAPID)
- `lib/export-csv.ts` — 업무 테이블 CSV 내보내기

### 컴포넌트

- `components/member-select.tsx` — 좌우 분할 로그인 화면. 배경은
  `public/member-select-bg.mp4`(소나무+달, 잎 흔들림 실사 영상, 오디오
  제거·faststart 처리) + `bg.jpg` 폴백. 그레인 오버레이, blur(md), 커서
  추적 발광효과는 제거된 상태.
- `components/summary-cards.tsx`, `member-progress-bars.tsx`,
  `task-table.tsx`(담당자 필터 기본값 = 로그인 사용자), `task-form-dialog.tsx`,
  `contribution-report.tsx`, `task-calendar.tsx`(이모지 상태뱃지, 주말·양력
  공휴일 빨간날짜, "크게 보기" 버튼) + `full-calendar-dialog.tsx`(전체화면
  캘린더, 날짜별 업무 텍스트, 담당자 필터)
- `components/personal-todo.tsx` — Supabase `personal_todos` 테이블 사용
  (기기 간 동기화, 원래 localStorage였다가 이관함)
- `components/theme-toggle.tsx` — 라이트 기본, 다크는 토글로 전환·저장
- `components/push-notification-toggle.tsx` — 헤더 종 아이콘, Web Push 구독
- `components/department-report.tsx` — `/report` 페이지, 엑셀의 "부서장님
  보고" 시트 재현(팀원별 현황 + 담당자별 제품개발 기여율 월별표, 연도 이동)

### 페이지 / API

- `app/page.tsx` — 메인 대시보드. 상단 남색 그라디언트 패널(로고+헤더+
  요약카드), 3열 그리드(팀원진행률/개인할일/마감임박), 업무테이블,
  업무구분분포+캘린더 2열
- `app/report/page.tsx` — 부서장님 보고
- `app/api/cron/daily-digest/route.ts` — 평일 09:00 KST(Vercel Cron)에
  `memberSummary()` 기반 요약을 구독자에게 Web Push 발송. `CRON_SECRET`
  Bearer 인증.

## 배포 상태

- **Vercel**: `guseok98-6059s-projects/team-dashboard`,
  프로덕션 URL **https://team-dashboard-amber.vercel.app**
- **GitHub**: **https://github.com/3san33-stack/team-dashboard**
  (master 브랜치, Vercel과 연동되어 push 시 자동 재배포)
- **환경변수**(로컬 `.env.local` + Vercel 양쪽 등록됨):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
  `CRON_SECRET`
- **Supabase 테이블**: `tasks`(원본), `push_subscriptions`,
  `personal_todos` — 후자 둘은 `supabase/*.sql`에 마이그레이션 스크립트
  있고 사용자가 SQL Editor에서 수동 실행 완료(테이블 존재 확인함).
- **PWA**: `public/manifest.json` + `icon-192.png`/`icon-512.png`(로고
  원형 심볼을 남색 배경과 합성). iOS는 Safari에서만 "홈 화면에 추가" 가능
  (Chrome 불가, 안드로이드는 Chrome 가능).

## 디자인 참고 자료(실제 사이트 아님, 이미지/스펙 참고만)

- **Talvex** — 카드형 위젯 그리드 레이아웃
- **Aurora Sign Up** — 로그인 화면 좌우 분할 배치
- **Aurora Weather** — 리퀴드 글래스 카드 스타일

## 검토했지만 미채택

- **카카오톡 알림톡** — 유료(정식)이거나 절차 부담(무료/개인 로그인) 있어
  배제. 대신 **Web Push** 채택(완전 무료).

## 알려진 한계 / 남은 선택지

- 캘린더 빨간날은 **양력 고정 공휴일만** 반영(설날·추석 등 음력 공휴일 제외)
- Supabase 데이터 자동 백업 없음 — 필요시 업무테이블 "엑셀로 내보내기"로
  수동 백업 권장
- Supabase 무료 프로젝트는 ~1주 미사용 시 자동 일시정지(데이터 유실은 아님)
- Vercel Cron은 무료 요금제 기준 **하루 1회 실행 한도** — 알림 시간을
  개인별로 다르게 하려면 이 제약을 넘어야 해서 보류 중

## 세션 규칙/선호 (기억해둘 것)

- **"무료 아니면 절대 진행하지 않는다"** — 새 기능 제안 시 항상 비용부터 확인
- 큰 디자인 변경 전에는 옵션을 짧게 제시하고 사용자 선택을 받은 뒤 진행
- git 커밋 계정: `guseok98 <guseok98@gmail.com>` (로컬 설정됨)
- 코드 수정 후에는 브라우저로 직접 동작 확인 후 커밋(테스트 스킵 안 함)

## 이번 세션 마지막에 만든 것

프로젝트 전체를 "AI를 어떻게 활용했는가" 관점으로 정리한 Claude 아티팩트 2개
(비공개, 프로젝트 코드와는 별개):

1. **보고서**: https://claude.ai/code/artifact/2f66a1f0-9f92-4153-be40-877ca4e98ed1
2. **애니메이션 설명 영상(픽토그램)**: https://claude.ai/code/artifact/a6f264fb-fb1e-4c4a-8258-482b3ce23853

이 두 링크는 team-dashboard 코드와 무관한 별도 산출물이며, 다음 세션에서
계속 다듬으려면 URL로 다시 불러와 수정 가능합니다.
