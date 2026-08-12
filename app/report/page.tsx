"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MemberSelect } from "@/components/member-select";
import { DepartmentReport } from "@/components/department-report";
import { Button } from "@/components/ui/button";
import { listTasks } from "@/lib/supabase";
import type { Member, Task } from "@/lib/types";

const MEMBER_STORAGE_KEY = "team-dashboard:member";

export default function ReportPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(MEMBER_STORAGE_KEY) as Member | null;
    if (saved) setMember(saved);
  }, []);

  useEffect(() => {
    if (!member) return;
    setLoading(true);
    listTasks()
      .then((t) => {
        setTasks(t);
        setError(null);
      })
      .catch(() => setError("데이터를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [member]);

  function selectMember(m: Member) {
    localStorage.setItem(MEMBER_STORAGE_KEY, m);
    setMember(m);
  }

  if (!member) return <MemberSelect onSelect={selectMember} />;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        {error}
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

  return (
    <div className="min-h-screen w-full space-y-6 bg-background p-3 sm:p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">부서장님 보고</h1>
        <Link href="/">
          <Button variant="outline" size="sm">대시보드로</Button>
        </Link>
      </div>
      <DepartmentReport tasks={tasks} />
    </div>
  );
}
