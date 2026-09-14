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

  const [progressText, setProgressText] = useState(String(task?.progress ?? 0));
  const [saving, setSaving] = useState(false);
  const progress = progressText.trim() === "" ? 0 : Number(progressText);
  const validProgress = Number.isFinite(progress) && progress >= 0 && progress <= 100;

  async function handleSubmit() {
    if (saving || !validProgress) return;
    setSaving(true);
    try {
      await onSubmit({ ...form, progress });
      setOpen(false);
      // Uncontrolled "add" dialogs are never unmounted between opens, so reset
      // the form back to defaults after a successful add to avoid carrying the
      // previous submission's values into the next one.
      if (!task) { setForm(buildDefaultForm(member)); setProgressText("0"); }
    } catch {
      // onSubmit already surfaces the error to the user (see app/page.tsx);
      // keep the dialog open with the user's input so they can retry.
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[800px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "업무 수정" : "업무 추가"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <section className="min-w-0 space-y-4" aria-label="업무 내용">
            <h3 className="text-sm font-semibold text-muted-foreground">업무 내용</h3>
            <div className="space-y-1.5">
              <Label>프로젝트</Label>
              <Input
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>업무구분</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => v && setForm({ ...form, category: v as TaskInput["category"] })}
                >
                  <SelectTrigger className="w-full" aria-label="업무구분"><SelectValue /></SelectTrigger>
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
                  <SelectTrigger className="w-full" aria-label="우선순위"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
          <section className="min-w-0 space-y-4 md:border-l md:pl-6" aria-label="일정 및 진행">
            <h3 className="text-sm font-semibold text-muted-foreground">일정 · 진행</h3>
            <div className="space-y-1.5">
              <Label>마감일</Label>
              <Input
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>상태</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => v && setForm({ ...form, status: v as TaskInput["status"] })}
                >
                  <SelectTrigger className="w-full" aria-label="상태"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>진행률 (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={progressText}
                  onChange={(e) => setProgressText(e.target.value)}
                  aria-label="진행률 (%)"
                  aria-invalid={!validProgress}
                />
                {!validProgress && (
                  <p role="alert" className="text-sm text-red-600">0~100 사이의 숫자를 입력하세요.</p>
                )}
              </div>
            </div>
          </section>
          <div className="md:col-span-2">
            <div className="space-y-1.5">
              <Label>팀장코멘트</Label>
              <Textarea
                value={form.comment ?? ""}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>취소</Button>
          <Button disabled={saving || !validProgress} onClick={handleSubmit}>{saving ? "저장 중…" : "저장"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
