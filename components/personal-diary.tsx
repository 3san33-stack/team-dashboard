"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Member } from "@/lib/types";
import { diaryDateKey, diaryDay, diaryWeek, emptyDiary, validDiary, type DiaryContent } from "@/lib/diary";

type Row = { content: DiaryContent; revision: number; updated_at: string };
const weekday = ["월", "화", "수", "목", "금", "토", "일"];

export function PersonalDiary({ member }: { member: Member }) {
  const [week, setWeek] = useState(() => diaryWeek(new Date()));
  const [reload, setReload] = useState(0);
  const [content, setContent] = useState<DiaryContent>(emptyDiary);
  const [revision, setRevision] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [available, setAvailable] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const draftKey = `team-dashboard:diary:${member}:${week}`;

  useEffect(() => {
    let active = true;
    setLoaded(false); setAvailable(false); setError(""); setDirty(false); setContent(emptyDiary());
    async function load() {
      const { data, error: failure } = await supabase.from("personal_diary_weeks").select("content,revision,updated_at").eq("member", member).eq("week_start", week).maybeSingle();
      if (!active) return;
      const row = data as Row | null;
      let next = emptyDiary();
      let version: number | null = null;
      if (failure) {
        setError(failure.code === "PGRST205" || failure.code === "42P01" ? "다이어리 저장소 설정이 필요합니다. 메모는 이 브라우저에 임시 보관할 수 있습니다." : "저장된 기록을 불러오지 못했습니다. 연결을 확인하고 다시 불러와 주세요.");
      } else if (row && !validDiary(row.content)) {
        setError("저장된 기록의 형식을 확인해야 합니다. 기존 기록은 덮어쓰지 않습니다.");
      } else {
        next = row?.content ?? emptyDiary(); version = row?.revision ?? null;
        setAvailable(true);
        setStatus(row ? `마지막 저장 ${new Date(row.updated_at).toLocaleString("ko-KR")}` : "이번 주의 첫 기록을 남겨보세요.");
      }
      try {
        const draft = JSON.parse(localStorage.getItem(draftKey) || "null");
        if (draft && validDiary(draft.content)) {
          next = draft.content; setDirty(true);
          // Keep the original version so a recovered draft cannot overwrite a newer save.
          if (!failure && (draft.revision === null || Number.isInteger(draft.revision))) version = draft.revision;
          setStatus("저장하지 않은 임시 기록을 복원했습니다. 내용을 확인하고 저장하세요.");
        }
      } catch { setStatus("브라우저 임시 보관을 사용할 수 없습니다. 이동 전에 저장하세요."); }
      setContent(next); setRevision(version); setLoaded(true);
    }
    void load().catch(() => { if (active) { setLoaded(true); setError("기록을 불러오지 못했습니다. 다시 불러와 주세요."); } });
    return () => { active = false; };
  }, [member, week, draftKey, reload]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(next: DiaryContent) {
    setContent(next); setDirty(true);
    try {
      localStorage.setItem(draftKey, JSON.stringify({ content: next, revision }));
      setStatus("이 브라우저에 임시 보관됨 · 다른 기기에서 보려면 저장하세요.");
    } catch { setStatus("임시 보관에 실패했습니다. 화면을 이동하기 전에 저장하세요."); }
  }
  function move(next: string) {
    if (saving || (dirty && !window.confirm("저장하지 않은 기록이 있습니다. 다른 주로 이동할까요? 임시 보관된 기록은 돌아오면 복원됩니다."))) return;
    setLoaded(false); setWeek(next);
  }
  async function save() {
    if (!available || !loaded || saving || !validDiary(content)) return;
    setSaving(true); setError("");
    try {
      const now = new Date().toISOString();
      const query = revision === null
        ? supabase.from("personal_diary_weeks").insert({ member, week_start: week, content, revision: 1, updated_at: now })
        : supabase.from("personal_diary_weeks").update({ content, revision: revision + 1, updated_at: now }).eq("member", member).eq("week_start", week).eq("revision", revision);
      const { data, error: failure } = await query.select("revision,updated_at").maybeSingle();
      if (failure?.code === "23505" || (!failure && !data)) {
        setError("다른 창에서 먼저 저장한 기록이 있습니다. 작성 내용을 복사해 둔 뒤 ‘최신 기록 불러오기’를 눌러 합쳐 주세요.");
        return;
      }
      if (failure || !data) throw new Error("save");
      setRevision(data.revision); setDirty(false);
      setStatus(`저장 완료 · ${new Date(data.updated_at).toLocaleString("ko-KR")}`);
      try { localStorage.removeItem(draftKey); } catch {}
    } catch { setError("저장하지 못했습니다. 작성한 내용은 유지됩니다. 다시 시도해 주세요."); }
    finally { setSaving(false); }
  }
  function refresh() {
    if (dirty && !window.confirm("작성 중인 임시 기록을 버리고 서버의 최신 기록을 불러올까요? 필요한 내용은 먼저 복사해 주세요.")) return;
    try { localStorage.removeItem(draftKey); } catch { setError("임시 기록을 정리하지 못했습니다."); return; }
    setReload(n => n + 1);
  }
  const end = diaryDay(week, 6);
  return <div className="diary">
    <div className="diary-toolbar">
      <div><span className="studio-eyebrow">MY DIARY</span><h2><BookOpen size={21}/>{member}의 다이어리</h2><p>이름별 기록 공간입니다. 다른 이름을 선택하면 해당 기록을 볼 수 있습니다.</p></div>
      <div className="diary-actions"><button className="studio-btn" onClick={() => move(diaryWeek(new Date()))} disabled={saving}>이번 주</button><button className="studio-btn studio-btn-primary" disabled={!available || !loaded || saving || !dirty} onClick={() => void save()}><Save size={16}/>{saving ? "저장 중…" : "기록 저장"}</button></div>
    </div>
    <div className="diary-week-nav"><button aria-label="이전 주" onClick={() => move(diaryDateKey(diaryDay(week, -7)))} disabled={saving}><ChevronLeft size={20}/></button><strong>{week.replaceAll("-", ".")} — {diaryDateKey(end).replaceAll("-", ".")}</strong><button aria-label="다음 주" onClick={() => move(diaryDateKey(diaryDay(week, 7)))} disabled={saving}><ChevronRight size={20}/></button><label>날짜로 이동<input aria-label="다이어리 날짜로 이동" type="date" value={week} disabled={saving} onChange={e => { if (e.target.value) move(diaryWeek(new Date(`${e.target.value}T12:00:00`))); }}/></label></div>
    {error && <div className="studio-error" role="alert"><span>{error}</span><button disabled={saving} onClick={refresh}>최신 기록 불러오기</button></div>}
    <p className="diary-save-state" role="status" aria-live="polite">{loaded ? status : "다이어리를 펼치고 있습니다…"}</p>
    <div className="diary-book" aria-busy={!loaded}>
      <section className="diary-notes"><div className="diary-paper-heading"><span>{diaryDay(week, 0).getFullYear()}</span><strong>{diaryDay(week, 0).getMonth() + 1}월</strong><h3>이번 주 메모</h3><p>아이디어, 기억할 일, 짧은 생각을 자유롭게.</p></div><label className="sr-only" htmlFor="diary-notes">이번 주 자유 메모</label><textarea id="diary-notes" value={content.notes} maxLength={10000} disabled={!loaded || saving} onChange={e => change({ ...content, notes: e.target.value })} placeholder="잊기 전에 적어두세요."/><span className="diary-count">{content.notes.length.toLocaleString()} / 10,000</span></section>
      <section className="diary-days" aria-label="요일별 기록">{weekday.map((day, i) => { const date = diaryDay(week, i), today = diaryDateKey(date) === diaryDateKey(new Date()); return <div className={`diary-day ${today ? "is-today" : ""}`} key={day}><label htmlFor={`diary-day-${i}`}><span>{day}</span><strong>{date.getMonth() + 1}.{date.getDate()}</strong>{today && <small>오늘</small>}</label><textarea id={`diary-day-${i}`} aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일 ${day}요일 기록`} value={content.days[i]} maxLength={5000} disabled={!loaded || saving} onChange={e => change({ ...content, days: content.days.map((text, index) => index === i ? e.target.value : text) })} placeholder="오늘의 작은 기록"/></div>; })}</section>
    </div>
  </div>;
}
