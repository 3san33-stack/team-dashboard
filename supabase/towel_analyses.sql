-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- 타월 사종분석 로그: 분석한 타월(자사/경쟁사/레퍼런스)의 원사·밀도·중량·염색·
-- 생지상태를 한 건씩 기록. `타월사종분석.xlsx`를 웹으로 옮긴 것.
-- 다른 테이블과 같은 공개 접근 규약 (anon key, public RLS).

create table towel_analyses (
  id uuid primary key default gen_random_uuid(),
  analyzed_on date,
  towel_name text not null,
  image_url text,
  spec text,
  weight text,
  pile_yarn text,
  ground_yarn text,
  weft_yarn text,
  warp_density text,
  weft_density text,
  dyeing text,
  greige_spec text,
  greige_weight text,
  greige_warp_density text,
  greige_weft_density text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table towel_analyses enable row level security;
create policy "public read"   on towel_analyses for select using (true);
create policy "public insert" on towel_analyses for insert with check (true);
create policy "public update" on towel_analyses for update using (true);
create policy "public delete" on towel_analyses for delete using (true);

-- 엑셀 기존 23건 이전 (이미지 제외 — 앱에서 개별 업로드).
insert into towel_analyses
  (analyzed_on, towel_name, spec, weight, pile_yarn, ground_yarn, weft_yarn,
   warp_density, weft_density, dyeing, greige_spec, greige_weight,
   greige_warp_density, greige_weft_density, notes)
values
  (null, '롯데마트 신규NB제안용', '40.3*78.3', '151.5', '28/s/2', '30s/2', '20s/1', '37', '53', '후염', '46*81', '165', '33', '51', null),
  (null, '오늘좋은 호텔 세면 타월', '39*81.3', '198.5', '16s/2', '20s/2', '16s/1', '39', '52', '후염', '44*84', '216', '34', '50', null),
  (null, '호메코디 선염 핑크 핸드타월 3매', '36.6*35.1', '40.5', '20s/1 (분홍)
15s/1(흰색) 저연', '40s/2', '20s/1', '33', '52', '선염', '38*36', '42', '32', '50', '파일사 두가지 굵기 다름'),
  (null, '호메코디 선염 블루 핸드타월 3매', '34.3*35.5', '39.5', '20s/1 (분홍)
15s/1(흰색) 저연', '40s/2', '20s/1', '33', '52', '선염', '35*37', '41', '32', '50', null),
  (null, '후리와시 핸드타월', '34.3*35.2', '40', '30s/2', '40s/2', '위사 얇은 20s/1
위사 굵은 8s/1', '35', '55', '후염', '39*36', '43', '34', '53', '위사 굵기가 두가지로 보여지고
일반적인 3피크 형태가 아니것으로 보임'),
  (null, '슈퍼제로(아사노-)1', '35*79', '96.5', '20s/1 무연사
아사노', '30s/2', '20s/1', '36', '44', '선염', '36*81', '99', '35', '43', '슈퍼제로
아사노'),
  (null, '슈퍼제로(아사노)-2', '34*79', '95', '20s/1 무연사
아사노', '30s/2', '20s/1', '37', '44', '후염', '39*81', '103', '36', '43', null),
  (null, '항균 무연사 타월', '34*81', '88.5', '20s/1 무연사
아사노', '30s/2', '20s/1', '32', '42', '선염', '35*84', '91', '31', '41', null),
  (null, '속건 허브항균 타월', '36*36', '51', '15s/1', '30s/2', '15s/1', '33', '36', '후염', '41*37', '55', '32', '35', null),
  (null, '오가닉코튼 타월', '33.7*80.6', '115', '30s/2
20s/1', '20s/1', '20s/1', '42', '54', '선염', '35*83', '119', '41', '52', null),
  ('2026-04-15', 'TENS TOWELS', '76*150', '530', '16s/1', '16s/1', '16s/1', '33', '39', '후염', '86*155', '576', '32', '38', null),
  ('2026-04-15', 'Brooklinen', '76*160', '891', '13s/1', '30s/2', '16s/1', '36', '58', '후염', '86*165', '968', '35', '56', null),
  ('2026-04-21', '이자와 수건연구소 (짙은색)', '40.6*100.5', '201', '20s/1', '30s/2', '20s/1', '36', '50', '후염', '46*104', '218', '35', '49', null),
  ('2026-04-21', '이자와 수건연구소 (연한색)', '40*102', '127', '40s/1', '30s/2', '20s/1', '35', '54', '후염', '45*105', '138', '34', '52', null),
  ('2026-05-22', '와플 조직 타월 샘플', '32.5*32', '51', '40s/2', '40s/2', '30s/2', null, null, '선염', '34*33', '53', '0', '0', null),
  ('2026-06-29', 'MAXPOBOE LOVELIFE', '49.5*82', '199.5', '16s/1', '20s/2', '16s/1', '34', '50', '후염', '56*85', '217', '33', '49', null),
  ('2026-06-29', 'SOFT BOX 마이크로코튼', '38*91', '222.5', '20s/1 무연사', '20s/2', '16s/1', '36', '52', '후염', '43*94', '242', '35', '50', null),
  ('2026-06-29', 'METEOR HOME TEXTILE', '49.7*93', '225', '16s/1', '23s/2', '16s/1', '32', '42', '후염', '56*96', '245', '31', '41', null),
  ('2026-06-29', 'DO&CO TERRY TOWEL', '49*92', '219.5', '16s/1', '20s/2', '12s/1', '36', '52', '후염', '56*95', '239', '35', '50', null),
  ('2026-06-29', 'ARYA PLAIN TOWEL', '50.7*90', '228', '20s/1', '23s/2', '16s/1', '36', '46', '후염', '58*93', '248', '35', '45', null),
  ('2026-06-29', 'KARNA HOME 바스 타월', '70*143', '510.5', '16s/1(무연)', '23s/2', '20s/1', '35', '48', '후염', '80*147', '555', '34', '47', null),
  ('2026-07-07', '무신사스탠다드 스트라이프 선염 타월', '40*80.5', '201.5', '40s/2', '23s/2', '16s/1', '35', '62', '선염', '41*83', '208', '34', '60', null),
  ('2026-08-25', '메이필드호텔 한신타월
(송월비나에서도 제직함)', '40*80', '130', '30s/2', '20s/2', '2026-01-20', '36', '56T', '후염', '45*82', '141', '35', null, null);
