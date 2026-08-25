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
  startOfMonthGrid, startOfWeek, summarizeUploadLogs, toLocalDateKey, uploadCountOnDay,
} from "@/lib/derived";
import {
  UPLOAD_LOG_CATEGORIES, WEAVERS, type UploadLog, type UploadLogCategory, type Weaver,
} from "@/lib/types";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

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
  const tempIdRef = useRef(0);

  useEffect(() => {
    listUploadLogs()
      .then(setLogs)
      .catch(() => setError("업로드 기록을 불러오지 못했습니다."))
      .finally(() => setLoaded(true));
  }, []);

  function todayCount(member: Weaver, category: UploadLogCategory): number {
    const todayKey = toLocalDateKey(new Date());
    return logs.filter(
      (l) =>
        l.member === member &&
        l.category === category &&
        toLocalDateKey(new Date(l.created_at)) === todayKey
    ).length;
  }

  async function handleLog(member: Weaver, category: UploadLogCategory) {
    const tempId = `temp-${tempIdRef.current++}`;
    const optimistic: UploadLog = { id: tempId, member, category, created_at: new Date().toISOString() };
    setLogs((prev) => [optimistic, ...prev]);
    try {
      const created = await createUploadLog(member, category);
      setLogs((prev) => prev.map((l) => (l.id === tempId ? created : l)));
      setError(null);
    } catch {
      setLogs((prev) => prev.filter((l) => l.id !== tempId));
      setError("기록을 저장하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  async function handleUndo(member: Weaver, category: UploadLogCategory) {
    const todayKey = toLocalDateKey(new Date());
    const todays = logs
      .filter(
        (l) =>
          l.member === member &&
          l.category === category &&
          toLocalDateKey(new Date(l.created_at)) === todayKey
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const latest = todays[0];
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

  const summary = summarizeUploadLogs(logs, range);

  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekCounts = weekDays.map((d) => uploadCountOnDay(logs, d));
  const maxWeekCount = Math.max(1, ...weekCounts);

  const monthGridStart = startOfMonthGrid(now.getFullYear(), now.getMonth());
  const monthDays = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(monthGridStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>업로드 기록</CardTitle>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-primary underline"
        >
          {expanded ? "숨기기" : "주간/월간 보기"}
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loaded ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                {WEAVERS.map((member) => (
                  <div key={member} className="flex flex-wrap items-center gap-2">
                    <span className="w-14 shrink-0 text-sm font-medium">{member}</span>
                    {UPLOAD_LOG_CATEGORIES.map((category) => {
                      const count = todayCount(member, category);
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

              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">이번 주</p>
                  <div className="flex h-16 items-end gap-1">
                    {weekDays.map((d, i) => {
                      const count = weekCounts[i];
                      const pct = Math.round((count / maxWeekCount) * 100);
                      return (
                        <div key={toLocalDateKey(d)} className="flex flex-1 flex-col items-center gap-1">
                          <div
                            title={`${WEEKDAY_LABELS[i]} ${count}건`}
                            className="min-h-[2px] w-full rounded-t bg-primary/70"
                            style={{ height: `${count > 0 ? Math.max(pct, 8) : 0}%` }}
                          />
                          <span className="text-[10px] text-muted-foreground">{WEEKDAY_LABELS[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{now.getMonth() + 1}월</p>
                  <div className="grid grid-cols-7 gap-1">
                    {monthDays.map((d) => {
                      const count = uploadCountOnDay(logs, d);
                      const inMonth = d.getMonth() === now.getMonth();
                      return (
                        <div
                          key={toLocalDateKey(d)}
                          title={`${d.getMonth() + 1}/${d.getDate()} ${count}건`}
                          className={`aspect-square rounded-sm ${intensityClass(count)} ${inMonth ? "" : "opacity-30"}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {expanded && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex gap-2">
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
                    이번 달
                  </button>
                </div>
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
