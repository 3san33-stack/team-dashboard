"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MEMBERS, type Task } from "@/lib/types";
import { priorityColor, statusColor, dayStatusEmojis, toLocalDateKey } from "@/lib/derived";

type Props = { tasks: Task[] };

function startOfMonthGrid(year: number, month: number): Date {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function TaskCalendar({ tasks }: Props) {
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() }; // month: 0-11
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

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

  const selectedDayTasks = selectedDay ? tasksOn(selectedDay) : [];

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
                  <button
                    type="button"
                    key={toLocalDateKey(day)}
                    onClick={() => setSelectedDay(day)}
                    aria-label={`${day.getDate()}일${dayTasks.length > 0 ? `, 업무 ${dayTasks.length}건` : ""}`}
                    className={`h-20 overflow-hidden rounded-md border p-1 text-left text-xs transition-colors hover:bg-accent ${
                      inMonth ? "bg-card" : "bg-transparent opacity-40"
                    }`}
                  >
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{day.getDate()}</span>
                      {dayTasks.length > 0 && (
                        <span aria-hidden="true" className="flex gap-0.5 text-[11px] leading-none">
                          {dayStatusEmojis(dayTasks).map((emoji, i) => (
                            <span key={i}>{emoji}</span>
                          ))}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDay &&
                `${selectedDay.getFullYear()}년 ${selectedDay.getMonth() + 1}월 ${selectedDay.getDate()}일 업무`}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {selectedDayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">해당 날짜에 마감인 업무가 없습니다.</p>
            ) : (
              selectedDayTasks.map((t) => (
                <div key={t.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{t.project}</span>
                    <Badge className={statusColor(t.status)}>{t.status}</Badge>
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {t.member} · {t.category}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className={priorityColor(t.priority)}>{t.priority}</Badge>
                    <span className="text-muted-foreground">진행률 {t.progress}%</span>
                  </div>
                  {t.comment && (
                    <p className="mt-2 text-xs text-muted-foreground">{t.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
