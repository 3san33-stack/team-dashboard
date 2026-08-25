"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Bell, CheckIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
    <Popover>
      <PopoverTrigger
        render={
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            aria-label={`마감임박 업무 알림, ${items.length}건`}
            title="마감임박 업무"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-sm"
          />
        }
      >
        <Bell className="h-4 w-4" />
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {items.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 text-foreground">
        <p className="text-sm font-medium">마감임박 업무</p>
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
      </PopoverContent>
    </Popover>
  );
}
