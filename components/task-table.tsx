"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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

  const filtered = tasks.filter(
    (t) =>
      (memberFilter === "all" || t.member === memberFilter) &&
      (statusFilter === "all" || t.status === statusFilter) &&
      taskMatchesQuery(t, query)
  );

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
          <AnimatePresence>
            {filtered.map((task) => (
              <motion.tr
                key={task.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border-b"
              >
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
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}
