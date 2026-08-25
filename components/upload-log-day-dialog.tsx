"use client";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { uploadCountFor } from "@/lib/derived";
import { UPLOAD_LOG_CATEGORIES, WEAVERS, type UploadLog, type UploadLogCategory, type Weaver } from "@/lib/types";

type Props = {
  date: Date;
  logs: UploadLog[];
  trigger: React.ReactElement;
  onAdd: (member: Weaver, category: UploadLogCategory, date: Date) => void;
  onUndo: (member: Weaver, category: UploadLogCategory, date: Date) => void;
};

export function UploadLogDayDialog({ date, logs, trigger, onAdd, onUndo }: Props) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{date.getMonth() + 1}월 {date.getDate()}일 기록</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {WEAVERS.map((member) => (
            <div key={member} className="space-y-2">
              <p className="text-sm font-medium">{member}</p>
              <div className="flex flex-wrap gap-2">
                {UPLOAD_LOG_CATEGORIES.map((category) => {
                  const count = uploadCountFor(logs, date, member, category);
                  return (
                    <div key={category} className="flex items-center gap-1 rounded-md border px-2 py-1">
                      <span className="text-xs">{category} {count}</span>
                      <button
                        type="button"
                        onClick={() => onUndo(member, category, date)}
                        disabled={count === 0}
                        aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일 ${member} ${category} 1건 빼기`}
                        className="rounded px-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdd(member, category, date)}
                        aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일 ${member} ${category} 1건 추가`}
                        className="rounded px-1 text-xs text-muted-foreground hover:bg-muted"
                      >
                        +
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
