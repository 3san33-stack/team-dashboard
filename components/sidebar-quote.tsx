"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const QUOTES = [
  { eyebrow: "BETTER, TOGETHER.", lines: ["서로의 아이디어가", "새로운 감촉이 됩니다."] },
  { eyebrow: "SMALL STEPS.", lines: ["오늘의 기록 한 줄이", "내일의 기준이 됩니다."] },
  { eyebrow: "KEEP WEAVING.", lines: ["꾸준함이 모여", "송월의 다음을 짜갑니다."] },
  { eyebrow: "SHARE THE CRAFT.", lines: ["혼자보다 함께일 때", "더 멀리 갑니다."] },
] as const;

const ROTATE_MS = 4500;

// Sidebar footer note, cycling through a few short lines on a slide/fade
// transition. prefers-reduced-motion users get the instant swap (studio.css's
// global reduced-motion rule already disables the transition).
export function SidebarQuote() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % QUOTES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);
  const quote = QUOTES[i];
  return (
    <div className="studio-sidebar-note">
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <span className="studio-quote-eyebrow">{quote.eyebrow}</span>
          <p>
            {quote.lines[0]}
            <br />
            {quote.lines[1]}
          </p>
        </motion.div>
      </AnimatePresence>
      <div className="studio-quote-bar" />
    </div>
  );
}
