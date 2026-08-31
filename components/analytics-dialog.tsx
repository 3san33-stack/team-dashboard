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
      <DialogContent className="h-[90vh] w-[96vw] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-4 sm:max-w-[1400px]">
        <DialogHeader className="pr-10">
          <DialogTitle className="text-lg">팀 분석</DialogTitle>
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
