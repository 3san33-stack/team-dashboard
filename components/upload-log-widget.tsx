"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { listUploadLogs, createUploadLog, deleteUploadLog } from "@/lib/supabase";
import {
  startOfMonthGrid, startOfWeek, summarizeUploadLogs, toLocalDateKey,
  uploadCountFor, uploadCountOnDay,
} from "@/lib/derived";
import { downloadUploadLogsAsCsv } from "@/lib/export-csv";
import { UploadLogDayDialog } from "@/components/upload-log-day-dialog";
import {
  UPLOAD_LOG_CATEGORIES, WEAVERS, type UploadLog, type UploadLogCategory, type Weaver,
} from "@/lib/types";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function buildMonthGrid(monthOf: Date): Date[] {
  const start = startOfMonthGrid(monthOf.getFullYear(), monthOf.getMonth());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function intensityClass(count: number): string {
  if (count === 0) return "bg-muted";
  if (count <= 2) return "bg-primary/25";
  if (count <= 5) return "bg-primary/50";
  if (count <= 9) return "bg-primary/75";
  return "bg-primary";
}

export function UploadLogWidget() {
  const [logs, setLogs] = useState<UploadLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [range, setRange] = useState<"week" | "month">("week");
  // Which month the expanded "월간" view is showing (1st of that month).
  const [viewDate, setViewDate] = useState(() => new Date());
  const tempIdRef = useRef(0);

  useEffect(() => {
    listUploadLogs()
      .then(setLogs)
      .catch(() => setError("업로드 기록을 불러오지 못했습니다."))
      .finally(() => setLoaded(true));
  }, []);

  async function handleLog(member: Weaver, category: UploadLogCategory, date: Date = new Date()) {
    const tempId = `temp-${tempIdRef.current++}`;
    const optimistic: UploadLog = { id: tempId, member, category, created_at: date.toISOString() };
    setLogs((prev) => [optimistic, ...prev]);
    try {
      const isToday = toLocalDateKey(date) === toLocalDateKey(new Date());
      const created = await createUploadLog(member, category, isToday ? undefined : date);
      setLogs((prev) => prev.map((l) => (l.id === tempId ? created : l)));
      setError(null);
    } catch {
      setLogs((prev) => prev.filter((l) => l.id !== tempId));
      setError("기록을 저장하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  async function handleUndo(member: Weaver, category: UploadLogCategory, date: Date = new Date()) {
    const dateKey = toLocalDateKey(date);
    const onDate = logs
      .filter(
        (l) =>
          l.member === member &&
          l.category === category &&
          toLocalDateKey(new Date(l.created_at)) === dateKey
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const latest = onDate[0];
    if (!latest) return;
    const prev = logs;
    setLogs((ls) => ls.filter((l) => l.id !== latest.id));
    try {
      await deleteUploadLog(latest.id);
      setError(null);
    } catch {
      setLogs(prev);
      setError("되돌리지 못했습니다. 다시 시도해 주세요.");
    }
  }

  const now = new Date();
  const summary = summarizeUploadLogs(logs, range, range === "month" ? viewDate : now);
  const isCurrentMonth =
    viewDate.getFullYear() === now.getFullYear() && viewDate.getMonth() === now.getMonth();
  const shiftMonth = (delta: number) =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  const weekStart = startOfWeek(now);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekCounts = weekDays.map((d) => uploadCountOnDay(logs, d));
  const maxWeekCount = Math.max(1, ...weekCounts);

  const monthDays = buildMonthGrid(now);
  // Expanded "월간" view follows viewDate so past months can be browsed.
  const viewMonthDays = buildMonthGrid(viewDate);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle>업로드 기록</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => downloadUploadLogsAsCsv(logs)}
            disabled={logs.length === 0}
            className="text-xs text-primary underline disabled:pointer-events-none disabled:text-muted-foreground disabled:no-underline"
          >
            엑셀로 내보내기
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-primary underline"
          >
            {expanded ? "숨기기" : "주간/월간 보기"}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loaded ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start gap-8">
              <div className="space-y-3">
                {WEAVERS.map((member) => (
                  <div key={member} className="flex flex-wrap items-center gap-2">
                    <span className="w-14 shrink-0 text-sm font-medium">{member}</span>
                    {UPLOAD_LOG_CATEGORIES.map((category) => {
                      const count = uploadCountFor(logs, now, member, category);
                      return (
                        <div key={category} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleLog(member, category)}
                            className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                          >
                            {category} {count}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUndo(member, category)}
                            disabled={count === 0}
                            aria-label={`${member} ${category} 되돌리기`}
                            className="rounded-md border px-1.5 py-1 text-xs text-muted-foreground disabled:opacity-30"
                          >
                            −
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-start gap-6">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">이번 주</p>
                  <div className="flex items-end gap-1.5">
                    {weekDays.map((d, i) => {
                      const count = weekCounts[i];
                      // Pixel height, not %: the column div below sizes to its
                      // content (flex items-end doesn't stretch it), so a
                      // percentage height here has no containing block to
                      // resolve against and silently renders as 0px.
                      const barPx = count > 0 ? Math.max(Math.round((count / maxWeekCount) * 48), 12) : 2;
                      return (
                        <div key={toLocalDateKey(d)} className="flex w-5 flex-col items-center gap-1">
                          <div
                            title={`${WEEKDAY_LABELS[i]} ${count}건`}
                            className="w-full rounded-t bg-primary/70"
                            style={{ height: `${barPx}px` }}
                          />
                          <span className="text-[10px] text-muted-foreground">{WEEKDAY_LABELS[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{now.getMonth() + 1}월</p>
                  <div className="grid grid-cols-7 gap-0.5">
                    {monthDays.map((d) => {
                      const count = uploadCountOnDay(logs, d);
                      const inMonth = d.getMonth() === now.getMonth();
                      return (
                        <div
                          key={toLocalDateKey(d)}
                          title={`${d.getMonth() + 1}/${d.getDate()} ${count}건`}
                          className={`h-3.5 w-3.5 rounded-sm border border-border ${intensityClass(count)} ${inMonth ? "" : "opacity-30"}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {expanded && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRange("week")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      range === "week" ? "bg-primary text-primary-foreground" : "border"
                    }`}
                  >
                    이번 주
                  </button>
                  <button
                    type="button"
                    onClick={() => setRange("month")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      range === "month" ? "bg-primary text-primary-foreground" : "border"
                    }`}
                  >
                    월간
                  </button>

                  {range === "month" && (
                    <div className="ml-2 flex items-center gap-1 text-sm">
                      <button
                        type="button"
                        onClick={() => shiftMonth(-1)}
                        aria-label="이전 달"
                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                      >
                        ◀
                      </button>
                      <span className="min-w-[6.5rem] text-center font-medium">
                        {viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월
                      </span>
                      <button
                        type="button"
                        onClick={() => shiftMonth(1)}
                        disabled={isCurrentMonth}
                        aria-label="다음 달"
                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-30"
                      >
                        ▶
                      </button>
                      {!isCurrentMonth && (
                        <button
                          type="button"
                          onClick={() => setViewDate(new Date())}
                          className="ml-1 text-xs text-primary underline"
                        >
                          이번 달
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">날짜를 클릭하면 그날 기록을 담당자·분류별로 보고 고칠 수 있어요.</p>

                {range === "week" ? (
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((d, i) => {
                      const count = uploadCountOnDay(logs, d);
                      return (
                        <UploadLogDayDialog
                          key={toLocalDateKey(d)}
                          date={d}
                          logs={logs}
                          onAdd={handleLog}
                          onUndo={handleUndo}
                          trigger={
                            <button
                              type="button"
                              className="w-full rounded-md border p-2 text-center hover:bg-muted"
                            >
                              <p className="text-[10px] text-muted-foreground">
                                {WEEKDAY_LABELS[i]} {d.getDate()}
                              </p>
                              <p className="text-lg font-semibold">{count}</p>
                            </button>
                          }
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {viewMonthDays.map((d) => {
                      const count = uploadCountOnDay(logs, d);
                      const inMonth = d.getMonth() === viewDate.getMonth();
                      return (
                        <UploadLogDayDialog
                          key={toLocalDateKey(d)}
                          date={d}
                          logs={logs}
                          onAdd={handleLog}
                          onUndo={handleUndo}
                          trigger={
                            <button
                              type="button"
                              className={`w-full rounded-md border p-1 text-center hover:bg-muted ${inMonth ? "" : "opacity-30"}`}
                            >
                              <p className="text-[10px] text-muted-foreground">{d.getDate()}</p>
                              <p className="text-sm font-semibold">{count}</p>
                            </button>
                          }
                        />
                      );
                    })}
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>담당자</TableHead>
                      {UPLOAD_LOG_CATEGORIES.map((c) => <TableHead key={c}>{c}</TableHead>)}
                      <TableHead>합계</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {WEAVERS.map((member) => {
                      const row = summary[member];
                      const total = UPLOAD_LOG_CATEGORIES.reduce((sum, c) => sum + row[c], 0);
                      return (
                        <TableRow key={member}>
                          <TableCell className="font-medium">{member}</TableCell>
                          {UPLOAD_LOG_CATEGORIES.map((c) => <TableCell key={c}>{row[c]}</TableCell>)}
                          <TableCell className="font-medium">{total}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
