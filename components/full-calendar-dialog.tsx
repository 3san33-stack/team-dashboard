"use client";

import { useMemo, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MEMBERS, type Task } from "@/lib/types";
import {
  isRedDay, priorityColor, startOfMonthGrid, statusColor, toLocalDateKey,
} from "@/lib/derived";

type Props = { tasks: Task[] };

export function FullCalendarDialog({ tasks }: Props) {
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
    setSelectedDay(null);
  }

  function goToday() {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDay(now);
  }

  const selectedDayTasks = selectedDay ? tasksOn(selectedDay) : [];
  const todayKey = toLocalDateKey(new Date());

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Maximize2 className="h-3.5 w-3.5" />
            크게 보기
          </Button>
        }
      />
      <DialogContent className="h-[88vh] w-[95vw] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-4 sm:max-w-[1400px]">
        <DialogHeader className="flex-row flex-wrap items-center gap-3 space-y-0 pr-10">
          <DialogTitle className="text-lg">
            {cursor.year}년 {cursor.month + 1}월 업무 캘린더
          </DialogTitle>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select value={memberFilter} onValueChange={(v) => v && setMemberFilter(v)}>
              <SelectTrigger className="w-32"><SelectValue placeholder="담당자" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체보기</SelectItem>
                {MEMBERS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>이전</Button>
            <Button variant="outline" size="sm" onClick={goToday}>오늘</Button>
            <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>다음</Button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-4 lg:flex-row">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                <div key={d} className={`pb-1 ${i === 0 || i === 6 ? "text-red-500" : ""}`}>
                  {d}
                </div>
              ))}
            </div>
            <div className="grid min-h-0 flex-1 grid-rows-6 gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid min-h-0 grid-cols-7 gap-1">
                  {week.map((day) => {
                    const inMonth = day.getMonth() === cursor.month;
                    const dayKey = toLocalDateKey(day);
                    const dayTasks = tasksOn(day);
                    const isSelected = selectedDay && toLocalDateKey(selectedDay) === dayKey;
                    return (
                      <button
                        type="button"
                        key={dayKey}
                        onClick={() => setSelectedDay(day)}
                        aria-label={`${day.getMonth() + 1}월 ${day.getDate()}일${
                          dayTasks.length > 0 ? `, 업무 ${dayTasks.length}건` : ""
                        }`}
                        className={`flex min-h-0 flex-col overflow-hidden rounded-md border p-1 text-left text-xs transition-colors hover:bg-accent ${
                          inMonth ? "bg-card" : "bg-transparent opacity-40"
                        } ${isSelected ? "ring-2 ring-primary" : ""}`}
                      >
                        <span
                          className={`leading-tight ${
                            dayKey === todayKey
                              ? "font-bold text-primary"
                              : isRedDay(day)
                                ? "font-medium text-red-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        <div className="mt-0.5 min-h-0 space-y-0.5 overflow-hidden">
                          {dayTasks.slice(0, 3).map((t) => (
                            <div key={t.id} className="flex items-center gap-1">
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusColor(t.status)}`}
                              />
                              <span className="truncate text-[11px] leading-tight">
                                {t.project || t.detail || "(제목 없음)"}
                              </span>
                            </div>
                          ))}
                          {dayTasks.length > 3 && (
                            <div className="text-[10px] text-muted-foreground">
                              +{dayTasks.length - 3}건 더
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex max-h-56 min-h-0 flex-col rounded-lg border lg:max-h-none lg:w-80">
            <div className="border-b px-3 py-2 text-sm font-medium">
              {selectedDay
                ? `${selectedDay.getMonth() + 1}월 ${selectedDay.getDate()}일 업무 (${selectedDayTasks.length}건)`
                : "날짜를 선택하세요"}
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {selectedDay && selectedDayTasks.length === 0 && (
                <p className="text-sm text-muted-foreground">해당 날짜에 마감인 업무가 없습니다.</p>
              )}
              {selectedDayTasks.map((t) => (
                <div key={t.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{t.project}</span>
                    <Badge className={statusColor(t.status)}>{t.status}</Badge>
                  </div>
                  {t.detail && (
                    <p className="mt-1 text-xs text-muted-foreground">{t.detail}</p>
                  )}
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
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
