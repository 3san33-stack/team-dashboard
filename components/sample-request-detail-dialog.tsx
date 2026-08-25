"use client";

import { ExternalLink } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import type { SampleRequest } from "@/lib/types";

type Props = {
  request: SampleRequest;
  trigger: React.ReactElement;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export function SampleRequestDetailDialog({ request, trigger }: Props) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Row label="요청자" value={request.requester} />
          <Row label="제직 담당자" value={request.weaver} />
          <Row label="상태" value={request.status} />
          {request.desired_date && <Row label="희망 완료일" value={request.desired_date} />}
          <Row label="요청일" value={request.created_at.slice(0, 10)} />

          {request.spec_note && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">사양 / 메모</p>
              <p className="whitespace-pre-wrap rounded-md border p-2 text-sm">
                {request.spec_note}
              </p>
            </div>
          )}

          {request.reference_link && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">참고 일러스트 파일 위치 링크</p>
              {request.reference_link.startsWith("http") ? (
                <a
                  href={request.reference_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm break-all text-primary underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" /> {request.reference_link}
                </a>
              ) : (
                <p className="text-sm break-all">{request.reference_link}</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
