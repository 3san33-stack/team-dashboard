"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";

function CountUpNumber({ value }: { value: number }) {
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

type Props = { total: number; inProgress: number; completed: number; overdue: number };

export function SummaryCards({ total, inProgress, completed, overdue }: Props) {
  const items = [
    { label: "전체 업무", value: total },
    { label: "진행중", value: inProgress },
    { label: "완료", value: completed },
    { label: "지연", value: overdue },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          whileHover={{ y: -4 }}
        >
          <Card>
            <CardContent className="py-6">
              <div className="text-sm text-muted-foreground">{item.label}</div>
              <div className="text-3xl font-semibold">
                <CountUpNumber value={item.value} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
