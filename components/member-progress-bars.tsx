"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEMBERS, type Task } from "@/lib/types";
import { averageProgress } from "@/lib/derived";

type Props = { tasks: Task[] };

export function MemberProgressBars({ tasks }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>팀원별 평균 진행률</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {MEMBERS.map((member, i) => {
          const percent = averageProgress(tasks, member);
          return (
            <div key={member} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{member}</span>
                <span className="text-muted-foreground">{percent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ type: "spring", stiffness: 80, damping: 20, delay: i * 0.08 }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
