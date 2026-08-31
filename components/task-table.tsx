"use client";

import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MEMBERS, STATUSES, type Member, type Task } from "@/lib/types";
import { isOverdue, priorityColor, statusColor, taskMatchesQuery } from "@/lib/derived";
import { downloadTasksAsCsv } from "@/lib/export-csv";

type Props = {
  tasks: Task[];
  member: Member;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
};

export function TaskTable({ tasks, member, onEdit, onDelete }: Props) {
  const [memberFilter, setMemberFilter] = useState<string>(member);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [hideCompleted, setHideCompleted] = useState(true);

  // "완료 숨기기"는 상태 필터를 명시적으로 완료로 고른 경우엔 무시.
  const hidingCompleted = hideCompleted && statusFilter !== "완료";

  const filtered = tasks.filter(
    (t) =>
      (memberFilter === "all" || t.member === memberFilter) &&
      (statusFilter === "all" || t.status === statusFilter) &&
      (!hidingCompleted || t.status !== "완료") &&
      taskMatchesQuery(t, query)
  );

  const hiddenCount = hidingCompleted
    ? tasks.filter(
        (t) =>
          t.status === "완료" &&
          (memberFilter === "all" || t.member === memberFilter) &&
          taskMatchesQuery(t, query)
      ).length
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="프로젝트/세부업무 검색"
          className="w-48"
        />
        <Select value={memberFilter} onValueChange={(v) => setMemberFilter(v ?? "all")}>
          <SelectTrigger className="w-40"><SelectValue placeholder="담당자" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 담당자</SelectItem>
            {MEMBERS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-40"><SelectValue placeholder="상태" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(e) => setHideCompleted(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          완료 숨기기
          {hiddenCount > 0 && <span className="text-xs">({hiddenCount}건)</span>}
        </label>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => downloadTasksAsCsv(filtered)}
        >
          엑셀로 내보내기
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>담당자</TableHead>
            <TableHead>프로젝트</TableHead>
            <TableHead>업무구분</TableHead>
            <TableHead>우선순위</TableHead>
            <TableHead>마감일</TableHead>
            <TableHead>진행률</TableHead>
            <TableHead>상태</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((task) => (
            <TableRow key={task.id}>
              <TableCell>{task.member}</TableCell>
              <TableCell>{task.project}</TableCell>
              <TableCell>{task.category}</TableCell>
              <TableCell>
                <Badge className={priorityColor(task.priority)}>{task.priority}</Badge>
              </TableCell>
              <TableCell className={isOverdue(task) ? "font-medium text-red-500" : ""}>
                {task.due_date ?? "-"}
              </TableCell>
              <TableCell>{task.progress}%</TableCell>
              <TableCell>
                <Badge className={statusColor(task.status)}>{task.status}</Badge>
              </TableCell>
              <TableCell className="space-x-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>수정</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`"${task.project}" 업무를 삭제할까요?`)) onDelete(task.id);
                  }}
                >
                  삭제
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
