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

function buildDefaultForm(member: Member): TaskInput {
  return {
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
  };
}

export function TaskFormDialog({ member, task, trigger, open: openProp, onOpenChange, onSubmit }: Props) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const [form, setForm] = useState<TaskInput>(task ?? buildDefaultForm(member));

  async function handleSubmit() {
    try {
      await onSubmit(form);
      setOpen(false);
      // Uncontrolled "add" dialogs are never unmounted between opens, so reset
      // the form back to defaults after a successful add to avoid carrying the
      // previous submission's values into the next one.
      if (!task) setForm(buildDefaultForm(member));
    } catch {
      // onSubmit already surfaces the error to the user (see app/page.tsx);
      // keep the dialog open with the user's input so they can retry.
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "업무 수정" : "업무 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>프로젝트</Label>
            <Input
              value={form.project}
              onChange={(e) => setForm({ ...form, project: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <Label>마감일</Label>
            <Input
              type="date"
              value={form.due_date ?? ""}
              onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>진행률 (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.progress}
              onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <Label>팀장코멘트</Label>
            <Textarea
              value={form.comment ?? ""}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
            />
          </div>
          <Button className="mt-2 w-full" onClick={handleSubmit}>저장</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
