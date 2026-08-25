"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SampleRequest } from "@/lib/types";

type Props = {
  request: SampleRequest;
  trigger: React.ReactElement;
  onDelete: (id: string) => void;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export function SampleRequestDetailDialog({ request, trigger, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const link = request.reference_link;
  const isHttpLink = !!link && link.startsWith("http");
  const showImagePreview = isHttpLink && !imageFailed;

  function handleDelete() {
    if (!confirm(`"${request.title}" 요청을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    onDelete(request.id);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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

          {link && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">참고 일러스트</p>
              {showImagePreview && (
                // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable source; next/image's domain allowlist doesn't fit a free-text link field
                <img
                  src={link}
                  alt={`${request.title} 참고 이미지`}
                  onError={() => setImageFailed(true)}
                  className="max-h-96 w-full rounded-md border object-contain"
                />
              )}
              {isHttpLink ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm break-all text-primary underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" /> {link}
                </a>
              ) : (
                <p className="text-sm break-all">{link}</p>
              )}
            </div>
          )}

          <Button variant="destructive" className="w-full" onClick={handleDelete}>
            요청 삭제
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
