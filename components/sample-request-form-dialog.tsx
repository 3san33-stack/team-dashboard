"use client";

import { useRef, useState } from "react";
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
import { uploadSampleRequestImage } from "@/lib/image-upload";
import { MEMBERS, WEAVERS, type Member, type SampleRequestInput } from "@/lib/types";

type Props = {
  trigger: React.ReactElement;
  defaultRequester: Member;
  onSubmit: (input: SampleRequestInput) => Promise<void>;
};

function buildDefaultForm(defaultRequester: Member): SampleRequestInput {
  return {
    requester: defaultRequester,
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = form.requester && form.weaver && form.title.trim().length > 0 && !uploading;

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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadSampleRequestImage(file);
      setForm((f) => ({ ...f, reference_link: url }));
    } catch {
      setUploadError("이미지 업로드에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setUploading(false);
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
            <Label>참고 일러스트</Label>
            <div className="flex gap-2">
              <Input
                value={form.reference_link ?? ""}
                onChange={(e) => setForm({ ...form, reference_link: e.target.value })}
                placeholder="이미지를 업로드하거나 링크를 붙여넣으세요"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? "업로드 중..." : "이미지 업로드"}
              </Button>
            </div>
            {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
            {form.reference_link && form.reference_link.startsWith("http") && (
              // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable source
              <img
                src={form.reference_link}
                alt="참고 이미지 미리보기"
                className="h-24 w-24 rounded-md border object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
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
