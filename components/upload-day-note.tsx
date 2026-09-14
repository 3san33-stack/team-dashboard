"use client";

import { useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";

export function UploadDayNote({ date }: { date: string }) {
  const id = useId();
  const [text, setText] = useState("");
  const [version, setVersion] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("메모 불러오는 중…");
  const [retry, setRetry] = useState(0);
  const key = `team-dashboard:upload-note:${date}`;

  useEffect(() => {
    let active = true;
    setReady(false); setDirty(false); setText(""); setVersion(null);
    setMessage("메모 불러오는 중…");
    void (async () => {
      const { data, error } = await supabase.from("upload_day_notes").select("note,revision").eq("date", date).maybeSingle();
      if (!active) return;
      if (error) { setMessage(error.code === "PGRST205" || error.code === "42P01" ? "일별 메모 저장소 설정이 필요합니다." : "메모를 불러오지 못했습니다. 다시 불러와 주세요."); return; }
      let note = data?.note ?? "", revision = data?.revision ?? null;
      let recovered = false;
      try {
        const draft = JSON.parse(localStorage.getItem(key) || "null");
        if (draft && typeof draft.note === "string" && draft.note.length <= 500 && (draft.revision === null || Number.isInteger(draft.revision))) {
          note = draft.note; revision = draft.revision; recovered = true;
        }
      } catch {}
      setText(note); setVersion(revision); setReady(true); setDirty(recovered);
      setMessage(recovered ? "저장 전 메모를 복원했습니다. 확인 후 저장하세요." : "팀이 함께 보는 날짜별 메모 · 최대 500자");
    })().catch(() => { if (active) setMessage("메모를 불러오지 못했습니다. 다시 불러와 주세요."); });
    return () => { active = false; };
  }, [date, key, retry]);

  async function save() {
    if (!ready || saving || !dirty) return;
    setSaving(true);
    try {
      const value = { note: text, revision: (version ?? 0) + 1, updated_at: new Date().toISOString() };
      const query = version === null
        ? supabase.from("upload_day_notes").insert({ date, ...value })
        : supabase.from("upload_day_notes").update(value).eq("date", date).eq("revision", version);
      const { data, error } = await query.select("revision").maybeSingle();
      if (error?.code === "23505" || (!error && !data)) { setMessage("다른 화면에서 먼저 저장했습니다. 내용을 복사한 뒤 최신 메모를 불러와 주세요."); return; }
      if (error || !data) throw new Error("save");
      setVersion(data.revision); setDirty(false); setMessage("메모를 저장했습니다.");
      try { localStorage.removeItem(key); } catch {}
      window.dispatchEvent(new CustomEvent("upload-note-saved", { detail: date }));
    } catch { setMessage("저장에 실패했습니다. 작성한 내용은 유지됩니다. 다시 시도하세요."); }
    finally { setSaving(false); }
  }
  useEffect(() => {
    const saved = (e: Event) => { if ((e as CustomEvent).detail === date && !dirty && !saving) setRetry(n => n + 1); };
    window.addEventListener("upload-note-saved", saved);
    return () => window.removeEventListener("upload-note-saved", saved);
  }, [date, dirty, saving]);

  function refresh() {
    if (dirty && !window.confirm("작성 중인 메모를 버리고 최신 메모를 불러올까요? 필요한 내용은 먼저 복사해 주세요.")) return;
    try { localStorage.removeItem(key); } catch { setMessage("임시 메모를 정리하지 못했습니다."); return; }
    setRetry(n => n + 1);
  }
  return <div className="space-y-2 rounded-md border bg-muted/20 p-3">
    <div className="flex items-center justify-between gap-2"><label htmlFor={id} className="text-xs font-medium">{date.slice(5).replace("-", "/")} 일별 공용 메모</label><span className="text-[10px] text-muted-foreground">{text.length}/500</span></div>
    <textarea id={id} className="min-h-16 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-relaxed disabled:opacity-50" rows={2} maxLength={500} disabled={!ready || saving} value={text} placeholder="업로드 내용, 수정 사항, 전달할 내용을 짧게 남겨주세요." onChange={e => {
      setText(e.target.value); setDirty(true);
      try { localStorage.setItem(key, JSON.stringify({ note: e.target.value, revision: version })); setMessage("저장 전 메모 · 이 브라우저에 임시 보관됨"); }
      catch { setMessage("임시 보관에 실패했습니다. 창을 닫기 전에 저장하세요."); }
    }}/>
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="flex-1 text-[11px] text-muted-foreground" role="status" aria-live="polite">{message}</p><button type="button" className="text-xs underline disabled:opacity-40" disabled={saving} onClick={refresh}>최신 메모</button><button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-40" disabled={!ready || saving || !dirty} onClick={() => void save()}>{saving ? "저장 중…" : "메모 저장"}</button></div>
  </div>;
}
