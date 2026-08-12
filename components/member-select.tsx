"use client";

import { motion, useReducedMotion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { MEMBERS, type Member } from "@/lib/types";

type Props = { onSelect: (member: Member) => void };

// Tileable film-grain texture (SVG feTurbulence) layered over the background
// video/photo at low opacity + overlay blend — masks the 720p source being
// upscaled to fill large viewports, reads as an intentional misty grain
// instead of visible softness.
const GRAIN_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export function MemberSelect({ onSelect }: Props) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-black">
      {reducedMotion === true ? (
        <div
          aria-hidden
          className="absolute inset-0 scale-110 bg-cover bg-center blur-xl"
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
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
        >
          <source src="/member-select-bg.mp4" type="video/mp4" />
        </video>
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{ backgroundImage: `url("${GRAIN_SVG}")`, backgroundSize: "200px 200px" }}
      />

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
