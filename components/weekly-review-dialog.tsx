"use client";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { statusColor, weeklyReview } from "@/lib/derived";
import type { Task } from "@/lib/types";

type Props = { tasks: Task[]; trigger: React.ReactElement };

function fmtRange(a: string, b: string) {
  const label = (k: string) => `${+k.slice(5, 7)}월 ${+k.slice(8, 10)}일`;
  return `${label(a)} ~ ${label(b)}`;
}

export function WeeklyReviewDialog({ tasks, trigger }: Props) {
  const { weekStartKey, weekEndKey, members } = weeklyReview(tasks);
  const byDue = (a: Task, b: Task) => (a.due_date ?? "").localeCompare(b.due_date ?? "");
  const overdue = members.flatMap((m) => m.overdue).sort(byDue);
  const dueThisWeek = members.flatMap((m) => m.dueThisWeek).sort(byDue);

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="h-[90vh] w-[96vw] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-4 sm:max-w-[1100px]">
        <DialogHeader className="pr-10">
          <DialogTitle className="text-lg">
            주간 팀 리뷰 · {fmtRange(weekStartKey, weekEndKey)}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 space-y-6 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>팀원</TableHead>
                <TableHead>이번 주 마감 (완료/전체)</TableHead>
                <TableHead>지연</TableHead>
                <TableHead>진행중</TableHead>
                <TableHead>다음 주 마감</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.member}>
                  <TableCell className="font-medium">{m.member}</TableCell>
                  <TableCell>{m.doneThisWeek.length} / {m.dueThisWeek.length}</TableCell>
                  <TableCell className={m.overdue.length ? "font-medium text-red-500" : "text-muted-foreground"}>
                    {m.overdue.length}
                  </TableCell>
                  <TableCell>{m.inProgress.length}</TableCell>
                  <TableCell className="text-muted-foreground">{m.dueNextWeek.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <TaskList title="지연 업무 (이월)" tasks={overdue} empty="지연된 업무가 없습니다." />
          <TaskList title="이번 주 마감 업무" tasks={dueThisWeek} empty="이번 주 마감 업무가 없습니다." />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskList({ title, tasks, empty }: { title: string; tasks: Task[]; empty: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">
        {title} <span className="text-muted-foreground">({tasks.length})</span>
      </p>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y rounded-lg border text-sm">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2">
              <span className="w-14 shrink-0 text-muted-foreground">{t.member}</span>
              <span className="min-w-0 flex-1 truncate">{t.project}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{t.due_date ?? "-"}</span>
              <span className="w-10 shrink-0 text-right text-xs">{t.progress}%</span>
              <Badge className={`${statusColor(t.status)} shrink-0`}>{t.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
