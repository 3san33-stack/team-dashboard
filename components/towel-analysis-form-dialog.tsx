"use client";

import { useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { uploadSampleRequestImage } from "@/lib/image-upload";
import type { TowelAnalysis, TowelAnalysisInput } from "@/lib/types";

type Props = {
  trigger?: React.ReactElement;
  analysis?: TowelAnalysis;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (input: TowelAnalysisInput) => Promise<void>;
};

const EMPTY: TowelAnalysisInput = {
  analyzed_on: null, towel_name: "", image_url: null, spec: null, weight: null,
  pile_yarn: null, ground_yarn: null, weft_yarn: null, warp_density: null,
  weft_density: null, dyeing: null, greige_spec: null, greige_weight: null,
  greige_warp_density: null, greige_weft_density: null, notes: null,
};

function toInput(a: TowelAnalysis): TowelAnalysisInput {
  return (Object.keys(EMPTY) as (keyof TowelAnalysisInput)[]).reduce((acc, k) => {
    acc[k] = a[k] as never;
    return acc;
  }, {} as TowelAnalysisInput);
}

export function TowelAnalysisFormDialog({
  trigger, analysis, open: openProp, onOpenChange, onSubmit,
}: Props) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const [form, setForm] = useState<TowelAnalysisInput>(analysis ? toInput(analysis) : EMPTY);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof TowelAnalysisInput>(k: K, v: TowelAnalysisInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const text = (k: keyof TowelAnalysisInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set(k, (e.target.value || null) as TowelAnalysisInput[typeof k]);

  const canSubmit = form.towel_name.trim().length > 0 && !uploading;

  async function handleSubmit() {
    try {
      await onSubmit(form);
      setOpen(false);
      if (!analysis) setForm(EMPTY);
    } catch {
      // onSubmit surfaces the error; keep dialog open with the input.
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      set("image_url", await uploadSampleRequestImage(file));
    } catch {
      setUploadError("이미지 업로드에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{analysis ? "타월 사종분석 수정" : "타월 사종분석 등록"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>분석일</Label>
              <Input type="date" value={form.analyzed_on ?? ""} onChange={text("analyzed_on")} />
            </div>
            <div className="space-y-1.5">
              <Label>타월명 *</Label>
              <Input value={form.towel_name} onChange={(e) => set("towel_name", e.target.value)} placeholder="예: 호텔용 40수" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>타월 사진</Label>
            <div className="flex gap-2">
              <Input value={form.image_url ?? ""} onChange={text("image_url")} placeholder="업로드하거나 이미지 링크" />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? "업로드 중..." : "업로드"}
              </Button>
            </div>
            {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
            {form.image_url?.startsWith("http") && (
              // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable source
              <img src={form.image_url} alt="타월 미리보기" className="h-24 w-24 rounded-md border object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }} />
            )}
          </div>

          <p className="pt-1 text-xs font-medium text-muted-foreground">완성품</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>규격 (cm)</Label><Input value={form.spec ?? ""} onChange={text("spec")} placeholder="40*80" /></div>
            <div className="space-y-1.5"><Label>중량 (g)</Label><Input value={form.weight ?? ""} onChange={text("weight")} placeholder="180" /></div>
            <div className="space-y-1.5"><Label>경사밀도 (EPI)</Label><Input value={form.warp_density ?? ""} onChange={text("warp_density")} /></div>
            <div className="space-y-1.5"><Label>위사밀도 (PPI)</Label><Input value={form.weft_density ?? ""} onChange={text("weft_density")} /></div>
          </div>

          <p className="pt-1 text-xs font-medium text-muted-foreground">사종 / 가공</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>파일사종 (Pile)</Label><Textarea rows={2} value={form.pile_yarn ?? ""} onChange={text("pile_yarn")} placeholder="40s/2" /></div>
            <div className="space-y-1.5"><Label>경사사종 (Ground)</Label><Textarea rows={2} value={form.ground_yarn ?? ""} onChange={text("ground_yarn")} placeholder="면 30s/2" /></div>
            <div className="space-y-1.5"><Label>위사사종 (Weft)</Label><Textarea rows={2} value={form.weft_yarn ?? ""} onChange={text("weft_yarn")} placeholder="면 20s/1" /></div>
            <div className="space-y-1.5"><Label>염색가공</Label><Input value={form.dyeing ?? ""} onChange={text("dyeing")} placeholder="선염 / 후염" /></div>
          </div>

          <p className="pt-1 text-xs font-medium text-muted-foreground">생지상태</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>규격 (cm)</Label><Input value={form.greige_spec ?? ""} onChange={text("greige_spec")} placeholder="42*88" /></div>
            <div className="space-y-1.5"><Label>중량 (g)</Label><Input value={form.greige_weight ?? ""} onChange={text("greige_weight")} /></div>
            <div className="space-y-1.5"><Label>경사밀도 (EPI)</Label><Input value={form.greige_warp_density ?? ""} onChange={text("greige_warp_density")} /></div>
            <div className="space-y-1.5"><Label>위사밀도 (PPI)</Label><Input value={form.greige_weft_density ?? ""} onChange={text("greige_weft_density")} /></div>
          </div>

          <div className="space-y-1.5">
            <Label>비고</Label>
            <Textarea value={form.notes ?? ""} onChange={text("notes")} placeholder="특이사항" />
          </div>

          <Button className="mt-2 w-full" disabled={!canSubmit} onClick={handleSubmit}>
            {analysis ? "수정하기" : "등록하기"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
