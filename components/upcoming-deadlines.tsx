"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { CheckIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { upcomingDeadlines } from "@/lib/derived";
import type { Task } from "@/lib/types";

type Props = { tasks: Task[] };

export function UpcomingDeadlines({ tasks }: Props) {
  const items = upcomingDeadlines(tasks);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>마감임박 업무</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">마감임박 업무가 없습니다</p>
        ) : (
          <>
            {items.map((task) => {
              const isChecked = checked.has(task.id);
              return (
                <div key={task.id} className="flex items-center gap-3 rounded-lg border p-2">
                  <button
                    type="button"
                    onClick={() => toggle(task.id)}
                    aria-pressed={isChecked}
                    aria-label={`${task.project} ${isChecked ? "확인 표시됨" : "확인 표시"} (완료 처리 아님, 업무 목록에서 처리하세요)`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/40"
                  >
                    <motion.span
                      initial={false}
                      animate={{ scale: isChecked ? 1 : 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <CheckIcon className="h-3 w-3" />
                    </motion.span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${
                        isChecked ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {task.project}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {task.member} · {task.due_date}
                    </p>
                  </div>
                </div>
              );
            })}
            <p className="pt-1 text-xs text-muted-foreground">
              완료 처리는 업무 목록에서 해주세요
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
