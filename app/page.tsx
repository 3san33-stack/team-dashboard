"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { MemberSelect } from "@/components/member-select";
import { SummaryCards } from "@/components/summary-cards";
import { MemberProgressBars } from "@/components/member-progress-bars";
import { TaskTable } from "@/components/task-table";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { ContributionReport } from "@/components/contribution-report";
import { TaskCalendar } from "@/components/task-calendar";
import { TaskTrendChart } from "@/components/task-trend-chart";
import { TaskActivityHeatmap } from "@/components/task-activity-heatmap";
import { HeroBackground } from "@/components/hero-background";
import { CountUpNumber } from "@/components/count-up-number";
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
    <div className="min-h-screen w-full space-y-6 bg-white p-3 sm:p-4 md:p-6">
      {/* Hero — mirrors forma-landing's page anatomy: glass navbar, big headline, floating card,
          plus a mouse-reactive blob background for extra motion. */}
      <HeroBackground
        className="p-4 sm:p-6 md:p-8"
        imageUrl="/hero-towel.jpg"
        imageAlt="송월타월 제품 디테일"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 rounded-2xl bg-white/60 px-4 py-2 shadow-sm backdrop-blur-md">
            <svg width="24" height="24" viewBox="0 0 256 256">
              <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z" fill="black" />
              <path d="M 256 128 L 128 128 L 0 0 L 128 0 Z" fill="black" />
            </svg>
            <span className="text-sm font-medium text-gray-800">디자인R&D</span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={switchMember}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              className="rounded-xl bg-white/60 px-4 py-2 text-sm font-medium text-gray-800 shadow-sm backdrop-blur-md"
            >
              {member}님 · 전환
            </motion.button>
            <TaskFormDialog
              member={member}
              trigger={
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white sm:px-5"
                >
                  업무 추가
                </motion.button>
              }
              onSubmit={handleCreate}
            />
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-6 sm:mt-24 lg:flex-row lg:items-end lg:justify-between">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="shrink-0 text-3xl font-medium leading-tight text-white drop-shadow-lg sm:text-4xl xl:max-w-xl xl:text-5xl"
          >
            {member}님, 안녕하세요
            <br />
            오늘도 함께{" "}
            <span
              style={{ fontFamily: "var(--font-serif-accent)", fontStyle: "italic" }}
            >
              성장
            </span>
            해봐요
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ y: -4 }}
            className="w-full shrink-0 overflow-hidden rounded-2xl bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-6 lg:w-[380px]"
          >
            <h2 className="text-lg font-semibold text-black sm:text-xl">
              오늘의 현황
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-gray-50 px-4 py-2.5">
                <div className="text-xs text-gray-500">전체 업무</div>
                <div className="text-xl font-semibold text-black">
                  <CountUpNumber value={total} />
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-2.5">
                <div className="text-xs text-gray-500">진행중</div>
                <div className="text-xl font-semibold text-black">
                  <CountUpNumber value={inProgress} />
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-2.5">
                <div className="text-xs text-gray-500">완료</div>
                <div className="text-xl font-semibold text-black">
                  <CountUpNumber value={completed} />
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-2.5">
                <div className="text-xs text-gray-500">지연</div>
                <div className="text-xl font-semibold text-black">
                  <CountUpNumber value={overdue} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </HeroBackground>

      <main className="w-full space-y-8 px-1 sm:px-2 md:px-4">
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TaskTrendChart tasks={tasks} />
          <TaskActivityHeatmap tasks={tasks} />
        </div>

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
    </div>
  );
}
