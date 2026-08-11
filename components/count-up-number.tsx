"use client";

import { useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

export function CountUpNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: 0.8 }); // seconds, not ms
  const display = useTransform(spring, (v) => Math.round(v).toString());
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    return display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
  }, [display]);

  return <span ref={ref}>0</span>;
}
