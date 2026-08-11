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
  { size: 240, top: "-8%", left: "8%", depth: 25, duration: 7 },
  { size: 170, top: "45%", left: "78%", depth: 40, duration: 5.5 },
  { size: 130, top: "10%", left: "58%", depth: 15, duration: 6.5 },
] as const;

function Blob({
  size,
  top,
  left,
  depth,
  duration,
  mx,
  my,
}: (typeof BLOBS)[number] & { mx: MotionValue<number>; my: MotionValue<number> }) {
  // Parallax offset (follows the cursor) is applied on the inner div via
  // motion values; the outer div drives a separate, independent floating
  // loop — kept on different elements so the two animations don't fight
  // over the same transform.
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);

  return (
    <motion.div
      className="absolute"
      style={{ top, left }}
      animate={{ y: [0, -16, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.div
        className="rounded-full bg-white/25 blur-2xl"
        style={{ width: size, height: size, x, y }}
      />
    </motion.div>
  );
}

type Props = { children: ReactNode; className?: string };

export function HeroBackground({ children, className }: Props) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 50, damping: 14 });
  const my = useSpring(rawY, { stiffness: 50, damping: 14 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    rawX.set((e.clientX - rect.left) / rect.width - 0.5);
    rawY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-400 to-amber-200 sm:rounded-3xl ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute inset-0">
        {BLOBS.map((b) => (
          <Blob key={b.top} {...b} mx={mx} my={my} />
        ))}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
