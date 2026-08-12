"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { ChevronRight, Circle } from "lucide-react";
import { MEMBERS, type Member } from "@/lib/types";

type Props = { onSelect: (member: Member) => void };

// Tileable film-grain texture (SVG feTurbulence) layered over the background
// video/photo at low opacity + overlay blend — masks the 720p source being
// upscaled to fill large viewports, reads as an intentional misty grain
// instead of visible softness.
const GRAIN_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

const heroContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function MemberSelect({ onSelect }: Props) {
  const reducedMotion = useReducedMotion();

  return (
    <main className="flex min-h-screen w-full bg-black p-2 lg:h-screen lg:overflow-hidden lg:p-4">
      <div className="relative hidden h-full w-[52%] flex-col items-center justify-end overflow-hidden rounded-3xl px-12 pb-32 shadow-2xl lg:flex">
        {reducedMotion === true ? (
          <div
            aria-hidden
            className="absolute inset-0 scale-105 bg-cover bg-center blur-md"
            style={{ backgroundImage: "url(/member-select-bg.jpg)" }}
          />
        ) : (
          <video
            aria-hidden
            autoPlay
            loop
            muted
            playsInline
            poster="/member-select-bg.jpg"
            className="absolute inset-0 h-full w-full scale-105 object-cover blur-md"
          >
            <source src="/member-select-bg.mp4" type="video/mp4" />
          </video>
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
          style={{ backgroundImage: `url("${GRAIN_SVG}")`, backgroundSize: "200px 200px" }}
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
        />

        <motion.div
          variants={heroContainer}
          initial="hidden"
          animate="show"
          className="relative z-10 w-full max-w-xs space-y-8"
        >
          <motion.div variants={heroItem} className="flex items-center gap-2">
            <Circle className="h-5 w-5 fill-white text-white" />
            <span className="text-xl font-semibold tracking-tight text-white">디자인R&D</span>
          </motion.div>
          <motion.div variants={heroItem}>
            <h1 className="text-4xl font-medium tracking-tight text-white">팀에 오신 걸 환영해요</h1>
            <p className="mt-4 px-1 text-sm leading-relaxed text-white/60">
              오른쪽에서 본인 이름을 선택하면 바로 대시보드로 이동합니다.
            </p>
          </motion.div>
        </motion.div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-12 sm:px-12 lg:overflow-hidden lg:px-16 xl:px-24">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-xl space-y-8"
        >
          <div>
            <h2 className="text-3xl font-medium tracking-tight text-white">누구신가요?</h2>
            <p className="mt-2 text-sm text-white/40">이름을 선택해 주세요.</p>
          </div>
          <div className="space-y-3">
            {MEMBERS.map((member, i) => (
              <MemberCard key={member} member={member} index={i} onSelect={onSelect} />
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  );
}

type MemberCardProps = { member: Member; index: number; onSelect: (member: Member) => void };

function MemberCard({ member, index, onSelect }: MemberCardProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.4 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(member)}
      className="group flex w-full items-center gap-4 rounded-xl border border-white/10 bg-[#1A1A1A] p-4 text-left text-white shadow-lg shadow-black/40 transition-colors hover:border-white/25 hover:bg-white/5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-base font-semibold">
        {member[0]}
      </span>
      <span className="flex-1 text-lg font-medium">{member}</span>
      <ChevronRight className="h-5 w-5 shrink-0 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-white/60" />
    </motion.button>
  );
}
