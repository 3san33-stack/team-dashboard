"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MEMBERS, WEAVERS, type SampleRequestInput } from "@/lib/types";

type Props = {
  trigger: React.ReactElement;
  defaultRequester: string;
  onSubmit: (input: SampleRequestInput) => Promise<void>;
};

function buildDefaultForm(defaultRequester: string): SampleRequestInput {
  return {
    requester: defaultRequester as SampleRequestInput["requester"],
    weaver: WEAVERS[0],
    title: "",
    spec_note: "",
    reference_link: "",
    desired_date: null,
    status: "요청됨",
  };
}

export function SampleRequestFormDialog({ trigger, defaultRequester, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SampleRequestInput>(buildDefaultForm(defaultRequester));

  const canSubmit = form.requester && form.weaver && form.title.trim().length > 0;

  async function handleSubmit() {
    try {
      await onSubmit(form);
      setOpen(false);
      setForm(buildDefaultForm(defaultRequester));
    } catch {
      // onSubmit already surfaces the error to the user; keep the dialog
      // open with the user's input so they can retry.
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>샘플 제직 요청</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>요청자</Label>
            <Select
              value={form.requester}
              onValueChange={(v) => v && setForm({ ...form, requester: v as SampleRequestInput["requester"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEMBERS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>제직 담당자</Label>
            <Select
              value={form.weaver}
              onValueChange={(v) => v && setForm({ ...form, weaver: v as SampleRequestInput["weaver"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WEAVERS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>건명</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="예: 봄 신상 타월 샘플"
            />
          </div>
          <div className="space-y-1.5">
            <Label>사양 / 메모</Label>
            <Textarea
              value={form.spec_note ?? ""}
              onChange={(e) => setForm({ ...form, spec_note: e.target.value })}
              placeholder="원사, 조직, 수량 등"
            />
          </div>
          <div className="space-y-1.5">
            <Label>참고 일러스트 파일 위치 링크</Label>
            <Input
              value={form.reference_link ?? ""}
              onChange={(e) => setForm({ ...form, reference_link: e.target.value })}
              placeholder="공유 폴더 경로 또는 URL"
            />
          </div>
          <div className="space-y-1.5">
            <Label>희망 완료일</Label>
            <Input
              type="date"
              value={form.desired_date ?? ""}
              onChange={(e) => setForm({ ...form, desired_date: e.target.value || null })}
            />
          </div>
          <Button className="mt-2 w-full" disabled={!canSubmit} onClick={handleSubmit}>
            요청하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
