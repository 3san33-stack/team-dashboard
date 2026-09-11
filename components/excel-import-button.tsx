"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { parseTaskImportFile, summarizeImport, taskMatchKey } from "@/lib/excel-import";
import { createTask, updateTask } from "@/lib/supabase";
import type { Task } from "@/lib/types";

type Props = {
  tasks: Task[];
  onImported: () => void;
};

export function ExcelImportButton({ tasks, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setBusy(true);
    setMessage(null);
    try {
      const { rows, skipped } = await parseTaskImportFile(file);

      const { toCreate, toUpdate } = summarizeImport(rows, tasks);
      const proceed = confirm(
        `엑셀 ${rows.length}건 확인됨 — 신규 ${toCreate}건 추가, 기존 ${toUpdate}건 갱신됩니다.` +
          (skipped.length > 0 ? `\n(${skipped.length}건은 형식 문제로 건너뜁니다)` : "") +
          `\n\n계속할까요?`
      );
      if (!proceed) {
        setBusy(false);
        return;
      }

      const existingByKey = new Map(
        tasks.map((t) => [taskMatchKey(t.member, t.project, t.category), t.id])
      );

      let created = 0;
      let updated = 0;
      let failed = 0;

      for (const row of rows) {
        const key = taskMatchKey(row.input.member, row.input.project, row.input.category);
        const existingId = existingByKey.get(key);
        try {
          if (existingId) {
            await updateTask(existingId, row.input);
            updated++;
          } else {
            const createdTask = await createTask(row.input);
            existingByKey.set(key, createdTask.id);
            created++;
          }
        } catch (err) {
          console.error(`엑셀 업로드 실패 (행 ${row.rowNumber}):`, err);
          failed++;
        }
      }

      const parts = [`${created}건 추가`, `${updated}건 갱신`];
      if (failed > 0) parts.push(`${failed}건 실패`);
      if (skipped.length > 0) parts.push(`${skipped.length}건 건너뜀`);
      setMessage(parts.join(", "));
      onImported();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "엑셀 파일을 읽지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleFileSelect}
      />
      <motion.button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium whitespace-nowrap text-white backdrop-blur-sm disabled:opacity-60"
      >
        {busy ? "가져오는 중..." : "엑셀 업로드"}
      </motion.button>
      {message && <p className="text-xs whitespace-nowrap text-white/70">{message}</p>}
    </div>
  );
}
