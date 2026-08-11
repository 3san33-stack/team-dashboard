"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MEMBERS, type Task } from "@/lib/types";
import { priorityColor } from "@/lib/derived";

type Props = { tasks: Task[] };

function startOfMonthGrid(year: number, month: number): Date {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

// `toISOString()` converts to UTC first, which shifts the date backward by a
// day for timezones ahead of UTC (e.g. KST) — build the key from local
// Y/M/D instead so it matches `due_date` strings as stored (local calendar dates).
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function TaskCalendar({ tasks }: Props) {
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() }; // month: 0-11
  });

  const filtered = tasks.filter(
    (t) => (memberFilter === "all" || t.member === memberFilter) && t.due_date
  );

  const weeks = useMemo(() => {
    const gridStart = startOfMonthGrid(cursor.year, cursor.month);
    const days: Date[] = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      return d;
    });
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7));
    return result;
  }, [cursor]);

  function tasksOn(day: Date) {
    const key = toLocalDateKey(day);
    return filtered.filter((t) => t.due_date === key);
  }

  function changeMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>
          {cursor.year}년 {cursor.month + 1}월 업무 캘린더
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={memberFilter} onValueChange={(v) => setMemberFilter(v ?? "all")}>
            <SelectTrigger className="w-32"><SelectValue placeholder="담당자" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체보기</SelectItem>
              {MEMBERS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>이전</Button>
          <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>다음</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="pb-1">{d}</div>
          ))}
        </div>
        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((day) => {
                const inMonth = day.getMonth() === cursor.month;
                const dayTasks = tasksOn(day);
                return (
                  <div
                    key={toLocalDateKey(day)}
                    className={`min-h-20 rounded-md border p-1 text-xs ${
                      inMonth ? "bg-card" : "bg-transparent opacity-40"
                    }`}
                  >
                    <div className="mb-1 text-muted-foreground">{day.getDate()}</div>
                    <div className="space-y-0.5">
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          className={`truncate rounded px-1 py-0.5 text-white ${priorityColor(t.priority)}`}
                          title={`${t.member} · ${t.project}`}
                        >
                          {t.member} · {t.project}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
