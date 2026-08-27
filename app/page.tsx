"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { MemberSelect } from "@/components/member-select";
import { SummaryCards } from "@/components/summary-cards";
import { MemberProgressBars } from "@/components/member-progress-bars";
import { TaskTable } from "@/components/task-table";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { ContributionReport } from "@/components/contribution-report";
import { CategoryDistribution } from "@/components/category-distribution";
import { TaskCalendar } from "@/components/task-calendar";
import { PersonalTodo } from "@/components/personal-todo";
import { ThemeToggle } from "@/components/theme-toggle";
import { PushNotificationToggle } from "@/components/push-notification-toggle";
import { UpcomingDeadlines } from "@/components/upcoming-deadlines";
import { SampleRequestBoard } from "@/components/sample-request-board";
import { UploadLogWidget } from "@/components/upload-log-widget";
import { ExcelImportButton } from "@/components/excel-import-button";
import { SideRail } from "@/components/side-rail";
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

  function switchMember() {
    localStorage.removeItem(MEMBER_STORAGE_KEY);
    setMember(null);
    setTasks([]);
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
    <div className="mx-auto flex min-h-screen w-full max-w-[1200px] justify-center gap-6 bg-background p-3 sm:p-4 md:p-6 2xl:max-w-[1480px]">
      <div className="w-full min-w-0 max-w-[1200px] space-y-6">
      {/* Night-sky panel — same navy family as the member-select scene,
          so the dashboard opens with a piece of the same world. */}
      <div className="space-y-6 rounded-3xl bg-gradient-to-br from-[#0b1220] via-[#101b33] to-[#1a2947] p-4 shadow-lg sm:p-6">
        <div className="flex items-center gap-3">
          {/* Official logo is dark-on-transparent; brightness-0 invert renders it white on navy. */}
          <img
            src="/songwol-logo.png"
            alt="송월"
            className="h-5 w-auto brightness-0 invert sm:h-6"
          />
          <span aria-hidden className="h-5 w-px bg-white/25" />
          <span className="text-sm font-medium tracking-wide text-white/80">R&D 다이어리</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            {member}님, 안녕하세요
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {/* 마감임박 벨 + 부서장님 보고는 넓은 화면에선 사이드레일이 대신하므로 숨김 */}
            <div className="2xl:hidden">
              <UpcomingDeadlines tasks={tasks} />
            </div>
            <PushNotificationToggle member={member} />
            <ThemeToggle />
            <Link href="/report" className="2xl:hidden">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="inline-block rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium whitespace-nowrap text-white backdrop-blur-sm"
              >
                부서장님 보고
              </motion.span>
            </Link>
            <motion.button
              type="button"
              onClick={switchMember}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium whitespace-nowrap text-white backdrop-blur-sm"
            >
              {member}님 · 전환
            </motion.button>
            <ExcelImportButton tasks={tasks} onImported={refresh} />
            <TaskFormDialog
              member={member}
              trigger={
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold whitespace-nowrap text-[#101b33] sm:px-5"
                >
                  업무 추가
                </motion.button>
              }
              onSubmit={handleCreate}
            />
          </div>
        </div>

        <SummaryCards total={total} inProgress={inProgress} completed={completed} overdue={overdue} />
      </div>

      <main className="w-full space-y-8 px-1 sm:px-2 md:px-4">
        {actionError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {actionError}
          </p>
        )}

        <SampleRequestBoard member={member} />

        <TaskTable tasks={tasks} member={member} onEdit={setEditingTask} onDelete={handleDelete} />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <motion.div whileHover={{ y: -4 }}>
            <PersonalTodo member={member} />
          </motion.div>
          <motion.div whileHover={{ y: -4 }}>
            <TaskCalendar tasks={tasks} member={member} />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <motion.div whileHover={{ y: -4 }}>
            <CategoryDistribution tasks={tasks} />
          </motion.div>
          <motion.div whileHover={{ y: -4 }}>
            <ContributionReport tasks={tasks} />
          </motion.div>
          <motion.div whileHover={{ y: -4 }}>
            <MemberProgressBars tasks={tasks} />
          </motion.div>
        </div>

        <UploadLogWidget />

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
      </div>
      <SideRail tasks={tasks} />
    </div>
  );
}
