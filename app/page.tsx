"use client";

import { useEffect, useState } from "react";
import { MemberSelect } from "@/components/member-select";
import { SummaryCards } from "@/components/summary-cards";
import { MemberProgressBars } from "@/components/member-progress-bars";
import { TaskTable } from "@/components/task-table";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { ContributionReport } from "@/components/contribution-report";
import { TaskCalendar } from "@/components/task-calendar";
import { Button } from "@/components/ui/button";
import { listTasks, createTask, updateTask, deleteTask } from "@/lib/supabase";
import { isOverdue } from "@/lib/derived";
import type { Member, Task, TaskInput } from "@/lib/types";

const MEMBER_STORAGE_KEY = "team-dashboard:member";

export default function DashboardPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(MEMBER_STORAGE_KEY) as Member | null;
    if (saved) setMember(saved);
  }, []);

  useEffect(() => {
    if (!member) return;
    setLoading(true);
    refresh();
  }, [member]);

  async function refresh() {
    try {
      setTasks(await listTasks());
      setError(null);
    } catch {
      setError("데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function selectMember(m: Member) {
    localStorage.setItem(MEMBER_STORAGE_KEY, m);
    setMember(m);
  }

  async function handleCreate(input: TaskInput) {
    try {
      await createTask(input);
      setActionError(null);
      await refresh();
    } catch {
      setActionError("업무를 저장하지 못했습니다. 다시 시도해 주세요.");
      // Re-throw so TaskFormDialog knows the submit failed and keeps the
      // dialog open with the user's input instead of closing as if it succeeded.
      throw new Error("create failed");
    }
  }

  async function handleUpdate(id: string, input: TaskInput) {
    try {
      await updateTask(id, input);
      setActionError(null);
      await refresh();
      setEditingTask(null);
    } catch {
      setActionError("업무를 수정하지 못했습니다. 다시 시도해 주세요.");
      throw new Error("update failed");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTask(id);
      setActionError(null);
      await refresh();
    } catch {
      setActionError("업무를 삭제하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  if (!member) return <MemberSelect onSelect={selectMember} />;

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p>{error}</p>
        <Button onClick={refresh}>다시 시도</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        불러오는 중...
      </div>
    );
  }

  const total = tasks.length;
  const inProgress = tasks.filter((t) => t.status === "진행중").length;
  const completed = tasks.filter((t) => t.status === "완료").length;
  const overdue = tasks.filter((t) => isOverdue(t)).length;

  return (
    <main className="min-h-screen w-full space-y-8 px-6 py-8 md:px-10 lg:px-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">디자인R&D 팀 업무 대시보드</h1>
        <TaskFormDialog
          member={member}
          trigger={<Button>업무 추가</Button>}
          onSubmit={handleCreate}
        />
      </div>

      {actionError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {actionError}
        </p>
      )}

      <SummaryCards total={total} inProgress={inProgress} completed={completed} overdue={overdue} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <MemberProgressBars tasks={tasks} />
        </div>
        <div className="lg:col-span-2">
          <TaskTable
            tasks={tasks}
            onEdit={setEditingTask}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <ContributionReport tasks={tasks} />
      <TaskCalendar tasks={tasks} />

      {editingTask && (
        <TaskFormDialog
          key={editingTask.id}
          member={editingTask.member}
          task={editingTask}
          open={true}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onSubmit={(input) => handleUpdate(editingTask.id, input)}
        />
      )}
    </main>
  );
}
