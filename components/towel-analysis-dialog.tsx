"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TowelAnalysisFormDialog } from "@/components/towel-analysis-form-dialog";
import {
  listTowelAnalyses, createTowelAnalysis, updateTowelAnalysis, deleteTowelAnalysis,
} from "@/lib/supabase";
import { deleteSampleRequestImage } from "@/lib/image-upload";
import type { TowelAnalysis, TowelAnalysisInput } from "@/lib/types";

type Props = { trigger: React.ReactElement };

const COLS = [
  "날짜", "사진", "타월명", "규격", "중량", "파일사종", "경사사종", "위사사종",
  "EPI", "PPI", "염색", "생지규격", "생지중량", "생지EPI", "생지PPI", "비고",
] as const;

function cell(a: TowelAnalysis): (string | null)[] {
  return [
    a.analyzed_on, null /* image handled separately */, a.towel_name, a.spec, a.weight,
    a.pile_yarn, a.ground_yarn, a.weft_yarn, a.warp_density, a.weft_density, a.dyeing,
    a.greige_spec, a.greige_weight, a.greige_warp_density, a.greige_weft_density, a.notes,
  ];
}

export function TowelAnalysisDialog({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<TowelAnalysis[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TowelAnalysis | null>(null);

  async function refresh() {
    try {
      setRows(await listTowelAnalyses());
      setError(null);
    } catch {
      setError("타월 사종분석 기록을 불러오지 못했습니다.");
    } finally {
      setLoaded(true);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !loaded) refresh();
  }

  async function handleCreate(input: TowelAnalysisInput) {
    try {
      await createTowelAnalysis(input);
      await refresh();
    } catch {
      setError("저장하지 못했습니다. 다시 시도해 주세요.");
      throw new Error("create failed");
    }
  }

  async function handleUpdate(id: string, input: TowelAnalysisInput) {
    try {
      await updateTowelAnalysis(id, input);
      await refresh();
      setEditing(null);
    } catch {
      setError("수정하지 못했습니다. 다시 시도해 주세요.");
      throw new Error("update failed");
    }
  }

  async function handleDelete(a: TowelAnalysis) {
    if (!confirm(`"${a.towel_name}" 기록을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    try {
      await deleteTowelAnalysis(a.id);
      if (a.image_url) deleteSampleRequestImage(a.image_url);
      await refresh();
    } catch {
      setError("삭제하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="h-[90vh] w-[96vw] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-4 sm:max-w-[1500px]">
        <DialogHeader className="flex-row flex-wrap items-center gap-3 space-y-0 pr-10">
          <DialogTitle className="text-lg">
            타월 사종분석 {loaded && <span className="text-sm text-muted-foreground">({rows.length}건)</span>}
          </DialogTitle>
          <div className="ml-auto">
            <TowelAnalysisFormDialog
              trigger={<Button size="sm">+ 새 분석 등록</Button>}
              onSubmit={handleCreate}
            />
          </div>
        </DialogHeader>

        <div className="min-h-0 overflow-auto rounded-lg border">
          {error ? (
            <p className="p-4 text-sm text-destructive">{error}</p>
          ) : !loaded ? (
            <p className="p-4 text-sm text-muted-foreground">불러오는 중...</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">아직 기록이 없습니다. “+ 새 분석 등록”으로 추가하세요.</p>
          ) : (
            <Table className="min-w-[1400px] text-xs">
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  {COLS.map((c) => <TableHead key={c} className="whitespace-nowrap">{c}</TableHead>)}
                  <TableHead className="whitespace-nowrap">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id} className="align-top">
                    {cell(a).map((v, i) =>
                      i === 1 ? (
                        <TableCell key="img">
                          {a.image_url?.startsWith("http") ? (
                            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, unpredictable source
                            <img src={a.image_url} alt={a.towel_name}
                              className="h-12 w-12 rounded border object-cover"
                              onError={(e) => { e.currentTarget.style.display = "none"; }} />
                          ) : null}
                        </TableCell>
                      ) : (
                        <TableCell
                          key={i}
                          className={`whitespace-pre-line ${i === 2 ? "min-w-32 font-medium" : "text-muted-foreground"}`}
                        >
                          {v ?? ""}
                        </TableCell>
                      )
                    )}
                    <TableCell className="whitespace-nowrap">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(a)}
                          className="rounded border px-1.5 py-0.5 hover:bg-muted"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(a)}
                          className="rounded border px-1.5 py-0.5 text-destructive hover:bg-muted"
                        >
                          삭제
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>

      {editing && (
        <TowelAnalysisFormDialog
          key={editing.id}
          analysis={editing}
          open
          onOpenChange={(o) => !o && setEditing(null)}
          onSubmit={(input) => handleUpdate(editing.id, input)}
        />
      )}
    </Dialog>
  );
}
