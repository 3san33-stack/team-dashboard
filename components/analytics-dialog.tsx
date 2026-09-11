"use client";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { CategoryDistribution } from "@/components/category-distribution";
import { ContributionReport } from "@/components/contribution-report";
import { MemberProgressBars } from "@/components/member-progress-bars";
import type { Task } from "@/lib/types";

type Props = { tasks: Task[]; trigger: React.ReactElement };

export function AnalyticsDialog({ tasks, trigger }: Props) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="studio-analytics-dialog h-[90vh] w-[96vw] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-4 sm:max-w-[1400px]">
        <DialogHeader className="pr-10">
          <span className="studio-eyebrow">TEAM INSIGHTS</span><DialogTitle className="text-lg">팀의 흐름, 한눈에.</DialogTitle><p className="text-sm text-muted-foreground">업무 구성과 팀원별 진행 현황을 함께 살펴보세요.</p>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto">
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <CategoryDistribution tasks={tasks} />
            <ContributionReport tasks={tasks} />
            <MemberProgressBars tasks={tasks} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
