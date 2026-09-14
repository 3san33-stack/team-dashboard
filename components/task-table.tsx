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
import { MEMBERS, STATUSES, type Member, type Status, type Task, type TaskInput } from "@/lib/types";
import { isOverdue, priorityColor, statusColor, taskMatchesQuery } from "@/lib/derived";
import { downloadTasksAsCsv } from "@/lib/export-csv";
import { ArrowUpRight, LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";

export type TaskPreset = { member?: string; status?: string; overdue?: boolean };

type Props = {
  tasks: Task[];
  member: Member;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onQuickUpdate: (id: string, patch: Partial<TaskInput>) => Promise<void>;
  preset?: TaskPreset;
};

// 진행률만 로컬 텍스트 상태로 분리 — task.progress를 직접 제어하면 blur 전에
// 서버 새로고침이 와서 타이핑 중인 값을 덮어써버림 (0 지우고 새로 입력할 때
// 특히 티남). 값이 바뀌면(다른 값 저장 후 새로고침 등) 로컬도 따라가되,
// 포커스 중엔 사용자가 타이핑한 걸 우선.
function InlineProgress({ task, onQuickUpdate }: { task: Task; onQuickUpdate: Props["onQuickUpdate"] }) {
  const [text, setText] = useState(String(task.progress));
  const [focused, setFocused] = useState(false);
  const shown = focused ? text : String(task.progress);
  const value = shown.trim() === "" ? 0 : Number(shown);
  const valid = Number.isFinite(value) && value >= 0 && value <= 100;

  function commit() {
    setFocused(false);
    if (valid && value !== task.progress) void onQuickUpdate(task.id, { progress: value });
  }

  return (
    <span className="studio-table-progress">
      <span><i style={{ width: `${task.progress}%` }} /></span>
      <input
        type="number"
        min={0}
        max={100}
        value={shown}
        aria-label={`${task.project} 진행률 수정`}
        aria-invalid={!valid}
        className="studio-inline-progress"
        onFocus={() => { setText(String(task.progress)); setFocused(true); }}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      />%
    </span>
  );
}

export function TaskTable({ tasks, member, onEdit, onDelete, onQuickUpdate, preset = {} }: Props) {
  const [memberFilter, setMemberFilter] = useState<string>(preset.member ?? member);
  const [statusFilter, setStatusFilter] = useState<string>(preset.status ?? "all");
  const [query, setQuery] = useState("");
  const [hideCompleted, setHideCompleted] = useState(preset.member !== "all");
  const [onlyOverdue, setOnlyOverdue] = useState(preset.overdue ?? false);
  const [mode, setMode] = useState<"list" | "cards">("list");

  // "완료 숨기기"는 상태 필터를 명시적으로 완료로 고른 경우엔 무시.
  const hidingCompleted = hideCompleted && statusFilter !== "완료";

  const filtered = tasks.filter(
    (t) =>
      (memberFilter === "all" || t.member === memberFilter) &&
      (statusFilter === "all" || (statusFilter === "보류·검토중 제외" ? t.status !== "보류" && t.status !== "검토중" : statusFilter === "보류 및 검토중" ? t.status === "보류" || t.status === "검토중" : t.status === statusFilter)) &&
      (!hidingCompleted || t.status !== "완료") &&
      (!onlyOverdue || isOverdue(t)) &&
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
    <div className="space-y-4 studio-task-table">
      <div className="studio-task-toolbar">
        <label className="studio-task-search"><Search size={16} />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="프로젝트/세부업무 검색"
          className="w-48"
          aria-label="프로젝트 또는 세부업무 검색"
        />
        </label>
        <Select value={memberFilter} onValueChange={(v) => setMemberFilter(v ?? "all")}>
          <SelectTrigger className="w-40" aria-label="담당자 필터"><SelectValue>{memberFilter === "all" ? "전체 담당자" : memberFilter}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 담당자</SelectItem>
            {MEMBERS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-40" aria-label="상태 필터"><SelectValue>{statusFilter === "all" ? "전체 상태" : statusFilter}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="보류·검토중 제외">보류·검토중 제외</SelectItem>
            <SelectItem value="보류 및 검토중">보류 및 검토중</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="studio-table-views"><button aria-label="목록 보기" aria-pressed={mode === "list"} onClick={() => setMode("list")} className={mode === "list" ? "is-active" : ""}><List size={18}/></button><button aria-label="카드 보기" aria-pressed={mode === "cards"} onClick={() => setMode("cards")} className={mode === "cards" ? "is-active" : ""}><LayoutGrid size={17}/></button></div>
        <Button variant="outline" size="sm" onClick={() => downloadTasksAsCsv(filtered)}>엑셀로 내보내기</Button>
      </div>
      <div className="studio-task-options"><span><strong>{filtered.length}</strong>건의 업무</span><label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(e) => setHideCompleted(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          완료 숨기기
          {hiddenCount > 0 && <span className="text-xs">({hiddenCount}건)</span>}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground"><input type="checkbox" checked={onlyOverdue} onChange={e => setOnlyOverdue(e.target.checked)} className="accent-primary"/>지연 업무만</label>
        <button className="studio-link" onClick={() => { setMemberFilter("all"); setStatusFilter("all"); setQuery(""); setHideCompleted(false); setOnlyOverdue(false); }}><X size={13}/>필터 초기화</button>
      </div>
      {filtered.length === 0 ? <div className="studio-empty"><SlidersHorizontal size={28}/><h3>조건에 맞는 업무가 없습니다.</h3><p>검색어나 담당자·상태 필터를 바꿔보세요.</p></div> : mode === "cards" ? <div className="studio-task-cards">{filtered.map(task => <button key={task.id} className="studio-work-card" onClick={() => onEdit(task)}><div><span className="studio-category">{task.category}</span><ArrowUpRight size={16}/></div><h3>{task.project}</h3><p>{task.detail || "세부 업무가 등록되지 않았습니다."}</p><div className="studio-work-progress"><span style={{width:`${task.progress}%`}}/></div><div><span className="studio-task-status" data-status={task.status}>{task.status}</span><strong>{task.progress}%</strong></div><footer><span>{task.member}</span><span className={isOverdue(task) ? "text-destructive" : ""}>{task.due_date || "마감일 미정"}</span></footer></button>)}</div> : <Table>
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
              <TableCell><span className="studio-table-member"><span>{task.member[0]}</span>{task.member}</span></TableCell>
              <TableCell><button className="studio-project-link" onClick={() => onEdit(task)}>{task.project}</button></TableCell>
              <TableCell>{task.category}</TableCell>
              <TableCell>
                <Badge className={priorityColor(task.priority)}>{task.priority}</Badge>
              </TableCell>
              <TableCell className={isOverdue(task) ? "font-medium text-red-500" : ""}>
                <input
                  type="date"
                  value={task.due_date ?? ""}
                  aria-label={`${task.project} 마감일 수정`}
                  className="studio-inline-date"
                  onChange={(e) => void onQuickUpdate(task.id, { due_date: e.target.value || null })}
                />
              </TableCell>
              <TableCell><InlineProgress task={task} onQuickUpdate={onQuickUpdate} /></TableCell>
              <TableCell>
                <select
                  value={task.status}
                  aria-label={`${task.project} 상태 수정`}
                  className="studio-task-status studio-inline-status"
                  data-status={task.status}
                  onChange={(e) => void onQuickUpdate(task.id, { status: e.target.value as Status })}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
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
      </Table>}
    </div>
  );
}
