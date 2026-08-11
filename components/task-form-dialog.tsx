"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, PRIORITIES, STATUSES, type Member, type Task, type TaskInput } from "@/lib/types";

type Props = {
  member: Member;
  task?: Task;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (input: TaskInput) => Promise<void>;
};

export function TaskFormDialog({ member, task, trigger, open: openProp, onOpenChange, onSubmit }: Props) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const [form, setForm] = useState<TaskInput>(
    task ?? {
      member,
      project: "",
      category: "제품개발",
      detail: "",
      priority: "P3-보통",
      start_date: null,
      due_date: null,
      progress: 0,
      status: "예정",
      comment: "",
    }
  );

  async function handleSubmit() {
    await onSubmit(form);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "업무 수정" : "업무 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>프로젝트</Label>
            <Input
              value={form.project}
              onChange={(e) => setForm({ ...form, project: e.target.value })}
            />
          </div>
          <div>
            <Label>업무구분</Label>
            <Select
              value={form.category}
              onValueChange={(v) => v && setForm({ ...form, category: v as TaskInput["category"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>우선순위</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => v && setForm({ ...form, priority: v as TaskInput["priority"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>마감일</Label>
            <Input
              type="date"
              value={form.due_date ?? ""}
              onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
            />
          </div>
          <div>
            <Label>진행률 (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.progress}
              onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>상태</Label>
            <Select
              value={form.status}
              onValueChange={(v) => v && setForm({ ...form, status: v as TaskInput["status"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>팀장코멘트</Label>
            <Textarea
              value={form.comment ?? ""}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
            />
          </div>
          <Button className="w-full" onClick={handleSubmit}>저장</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
