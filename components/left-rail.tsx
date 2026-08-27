"use client";

import { useEffect, useState } from "react";

// Section jump-nav for the long dashboard — genuinely additive (these links
// exist nowhere else) and persists while you scroll. ≥1700px only, left margin.
const SECTIONS = [
  { id: "samples", label: "샘플 제직 요청" },
  { id: "tasks", label: "업무 테이블" },
  { id: "planner", label: "할 일 · 캘린더" },
  { id: "analytics", label: "분포 · 기여율" },
  { id: "uploads", label: "업로드 기록" },
] as const;

export function LeftRail() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const shown = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (shown[0]) setActive(shown[0].target.id);
      },
      // Trigger band across the upper-middle of the viewport.
      { rootMargin: "-25% 0px -65% 0px" }
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <aside className="sticky top-[22vh] hidden h-fit w-56 shrink-0 flex-col gap-0.5 self-start justify-self-end rounded-2xl border border-border/50 bg-foreground/[0.02] p-2 min-[1700px]:flex">
      <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
        바로가기
      </p>
      {SECTIONS.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          onClick={() => setActive(s.id)}
          className={`rounded-lg px-2 py-1.5 text-xs transition-colors ${
            active === s.id
              ? "bg-foreground/[0.06] font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {s.label}
        </a>
      ))}
    </aside>
  );
}
