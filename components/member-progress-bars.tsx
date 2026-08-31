"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEMBERS, STATUSES, type Task } from "@/lib/types";
import { memberStatusCounts, statusColor } from "@/lib/derived";

type Props = { tasks: Task[] };

export function MemberProgressBars({ tasks }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>팀원별 업무 현황</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {STATUSES.map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${statusColor(s)}`} />
              {s}
            </span>
          ))}
        </div>

        {MEMBERS.map((member, i) => {
          const counts = memberStatusCounts(tasks, member);
          const total = STATUSES.reduce((n, s) => n + counts[s], 0);
          const present = STATUSES.filter((s) => counts[s] > 0);
          return (
            <div key={member} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{member}</span>
                <span className="text-muted-foreground">{total}건</span>
              </div>
              <div
                role="img"
                aria-label={`${member}: ${present.map((s) => `${s} ${counts[s]}건`).join(", ") || "업무 없음"}`}
                className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
              >
                {present.map((s) => (
                  <motion.div
                    key={s}
                    className={`h-full ${statusColor(s)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(counts[s] / total) * 100}%` }}
                    transition={{ type: "spring", stiffness: 80, damping: 20, delay: i * 0.08 }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                {total === 0
                  ? <span>업무 없음</span>
                  : present.map((s) => <span key={s}>{s} {counts[s]}</span>)}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
