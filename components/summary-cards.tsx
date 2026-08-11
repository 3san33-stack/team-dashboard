"use client";

import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { CountUpNumber } from "@/components/count-up-number";

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
