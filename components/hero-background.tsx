"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import type { ReactNode } from "react";

const BLOBS = [
  { size: 260, top: "-10%", left: "5%", depth: 90, duration: 7 },
  { size: 190, top: "50%", left: "80%", depth: 130, duration: 5.5 },
  { size: 140, top: "8%", left: "55%", depth: 60, duration: 6.5 },
] as const;

function Blob({
  size,
  top,
  left,
  depth,
  duration,
  normX,
  normY,
}: (typeof BLOBS)[number] & { normX: MotionValue<number>; normY: MotionValue<number> }) {
  const x = useTransform(normX, (v) => v * depth);
  const y = useTransform(normY, (v) => v * depth);

  return (
    <motion.div
      className="absolute"
      style={{ top, left }}
      animate={{ y: [0, -16, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.div className="rounded-full bg-white/25 blur-2xl" style={{ width: size, height: size, x, y }} />
    </motion.div>
  );
}

type Props = { children: ReactNode; className?: string; imageUrl?: string; imageAlt?: string };

export function HeroBackground({ children, className, imageUrl, imageAlt }: Props) {
  // Raw pixel position of the cursor within the hero, used two ways:
  // 1) directly, for a glow that visibly follows the cursor 1:1 (springed for a trailing feel)
  // 2) normalized to -0.5..0.5, for the ambient blobs' parallax drift and the image tilt
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawNormX = useMotionValue(0);
  const rawNormY = useMotionValue(0);

  const glowX = useSpring(rawX, { stiffness: 120, damping: 20, mass: 0.3 });
  const glowY = useSpring(rawY, { stiffness: 120, damping: 20, mass: 0.3 });
  const normX = useSpring(rawNormX, { stiffness: 60, damping: 16 });
  const normY = useSpring(rawNormY, { stiffness: 60, damping: 16 });

  const rotateX = useTransform(normY, (v) => v * -20);
  const rotateY = useTransform(normX, (v) => v * 20);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    rawX.set(px);
    rawY.set(py);
    rawNormX.set(px / rect.width - 0.5);
    rawNormY.set(py / rect.height - 0.5);
  }

  function handleMouseLeave() {
    rawNormX.set(0);
    rawNormY.set(0);
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-400 to-amber-200 sm:rounded-3xl ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute inset-0">
        {/* Ambient blobs — always slowly floating, plus a parallax drift keyed to cursor position. */}
        {BLOBS.map((b) => (
          <Blob key={b.top} {...b} normX={normX} normY={normY} />
        ))}

        {/* Cursor glow — directly, visibly follows the mouse (springed trail). */}
        <motion.div
          className="h-[420px] w-[420px] rounded-full bg-white/20 blur-3xl"
          style={{ x: glowX, y: glowY, translateX: "-50%", translateY: "-50%" }}
        />
      </div>

      {imageUrl && (
        <motion.div
          className="absolute right-4 top-4 hidden h-40 w-40 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/40 sm:block sm:h-48 sm:w-48"
          style={{ rotateX, rotateY, transformPerspective: 800 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={imageAlt ?? ""} className="h-full w-full object-cover" />
        </motion.div>
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
}
