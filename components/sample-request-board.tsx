"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SampleRequestFormDialog } from "@/components/sample-request-form-dialog";
import { SampleRequestDetailDialog } from "@/components/sample-request-detail-dialog";
import { listSampleRequests, createSampleRequest, updateSampleRequestStatus } from "@/lib/supabase";
import { SAMPLE_REQUEST_STATUSES, type Member, type SampleRequest, type SampleRequestStatus } from "@/lib/types";

type Props = { member: Member };

const ARCHIVE_STATUS: SampleRequestStatus = "완료";

export function SampleRequestBoard({ member }: Props) {
  const [requests, setRequests] = useState<SampleRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    listSampleRequests()
      .then(setRequests)
      .catch(() => setError("샘플 요청 목록을 불러오지 못했습니다."))
      .finally(() => setLoaded(true));
  }, []);

  async function handleCreate(input: Parameters<typeof createSampleRequest>[0]) {
    try {
      const created = await createSampleRequest(input);
      setRequests((prev) => [created, ...prev]);
      setError(null);
    } catch {
      setError("요청을 저장하지 못했습니다. 다시 시도해 주세요.");
      throw new Error("create failed");
    }
  }

  async function handleStatusChange(id: string, status: SampleRequestStatus) {
    const target = requests.find((r) => r.id === id);
    if (!target) return;
    const prevStatus = target.status;
    setRequests((r) => r.map((req) => (req.id === id ? { ...req, status } : req)));
    try {
      await updateSampleRequestStatus(id, status);
      setError(null);
    } catch {
      setRequests((r) => r.map((req) => (req.id === id ? { ...req, status: prevStatus } : req)));
      setError("상태를 변경하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>샘플 제직 요청</CardTitle>
        <SampleRequestFormDialog
          defaultRequester={member}
          trigger={
            <button
              type="button"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              + 새 요청
            </button>
          }
          onSubmit={handleCreate}
        />
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        {!loaded ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SAMPLE_REQUEST_STATUSES.map((status) => {
              const cards = requests.filter((r) => r.status === status);
              const isArchiveColumn = status === ARCHIVE_STATUS;
              const collapsed = isArchiveColumn && !showArchive;

              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      {status} ({cards.length})
                    </h4>
                    {isArchiveColumn && cards.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowArchive((v) => !v)}
                        className="text-xs text-primary underline"
                      >
                        {showArchive ? "숨기기" : "보관함 보기"}
                      </button>
                    )}
                  </div>

                  {cards.length === 0 ? (
                    <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      없음
                    </p>
                  ) : collapsed ? (
                    <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      보관함에 {cards.length}건 있습니다
                    </p>
                  ) : (
                    <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                      {cards.map((req) => (
                        <div key={req.id} className="space-y-2 rounded-md border p-3">
                          <SampleRequestDetailDialog
                            request={req}
                            trigger={
                              <button type="button" className="block w-full text-left">
                                <p className="truncate text-sm font-medium">{req.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {req.requester} → {req.weaver}
                                </p>
                              </button>
                            }
                          />
                          <Select
                            value={req.status}
                            onValueChange={(v) => v && handleStatusChange(req.id, v as SampleRequestStatus)}
                          >
                            <SelectTrigger className="h-8 text-xs" aria-label={`${req.title} 상태 변경`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SAMPLE_REQUEST_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
