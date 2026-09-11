"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StudioShell } from "@/components/studio-shell";
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
    <StudioShell member={member} tasks={tasks} active="report"><div className="studio-report-content space-y-6">
      <div className="flex items-center justify-between">
        <div><span className="studio-eyebrow">DEPARTMENT REPORT</span><h1 className="mt-2 text-2xl font-semibold">팀의 성과를 함께 읽다.</h1><p className="mt-2 text-sm text-muted-foreground">업무 현황과 제품개발 기여율을 확인하세요.</p></div>
        <Link href="/">
          <Button variant="outline" size="sm">대시보드로</Button>
        </Link>
      </div>
      <DepartmentReport tasks={tasks} />
    </div></StudioShell>
  );
}
