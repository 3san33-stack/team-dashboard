"use client";

import { useState, type MouseEvent } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { MEMBERS, type Member } from "@/lib/types";

type Props = { onSelect: (member: Member) => void };

export function MemberSelect({ onSelect }: Props) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const glowX = useSpring(rawX, { stiffness: 100, damping: 20, mass: 0.4 });
  const glowY = useSpring(rawY, { stiffness: 100, damping: 20, mass: 0.4 });
  const [hasMoved, setHasMoved] = useState(false);
  const reducedMotion = useReducedMotion();

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    rawX.set(e.clientX - rect.left);
    rawY.set(e.clientY - rect.top);
    if (!hasMoved) setHasMoved(true);
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-black"
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/member-select-bg.jpg)" }}
        animate={reducedMotion ? undefined : { rotate: [-1, 1, -1], scale: [1, 1.02, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {hasMoved && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute h-[360px] w-[360px] rounded-full bg-white/40 blur-3xl"
          style={{
            x: glowX,
            y: glowY,
            translateX: "-50%",
            translateY: "-50%",
            mixBlendMode: "screen",
          }}
        />
      )}

      <h1 className="relative z-10 text-2xl font-semibold text-white drop-shadow-lg">
        누구신가요?
      </h1>
      <div className="relative z-10 flex flex-wrap justify-center gap-4">
        {MEMBERS.map((member, i) => (
          <motion.div
            key={member}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -4 }}
          >
            <Card
              role="button"
              tabIndex={0}
              className="w-32 cursor-pointer border-white/40 bg-white/70 text-center backdrop-blur-md transition-shadow hover:shadow-lg"
              onClick={() => onSelect(member)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(member);
                }
              }}
            >
              <CardContent className="py-6 text-lg font-medium">{member}</CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
