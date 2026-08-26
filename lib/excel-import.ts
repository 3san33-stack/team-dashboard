import * as XLSX from "xlsx";
import {
  CATEGORIES, MEMBERS, PRIORITIES, STATUSES,
  type Category, type Member, type Priority, type Status, type TaskInput,
} from "./types";

function toDateOrNull(value: unknown): string | null {
  if (!(value instanceof Date)) return null;
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toPriority(value: unknown): Priority {
  return (PRIORITIES as readonly unknown[]).includes(value) ? (value as Priority) : "P3-보통";
}

function toStatus(value: unknown): Status {
  return (STATUSES as readonly unknown[]).includes(value) ? (value as Status) : "예정";
}

// Excel stores multi-line cell text with \r\n; normalize to \n so the same
// project name matches consistently regardless of which tool last wrote a
// given task row (a \r\n vs \n mismatch alone was enough to make the
// import's dedupe key treat one real task as two).
function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

function toTextOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === 0 || value === "") return null;
  return normalizeLineEndings(String(value));
}

export function mapImportRow(
  row: Record<string, unknown>
): { input: TaskInput } | { skipReason: string } {
  const member = row["담당자"];
  if (!(MEMBERS as readonly unknown[]).includes(member)) {
    return { skipReason: `알 수 없는 담당자: ${String(member)}` };
  }

  const category = row["업무구분"];
  if (!(CATEGORIES as readonly unknown[]).includes(category)) {
    return { skipReason: `알 수 없는 업무구분: ${String(category)}` };
  }

  const project = row["프로젝트"];
  if (typeof project !== "string" || project.trim() === "") {
    return { skipReason: "프로젝트 이름이 없습니다" };
  }
  const normalizedProject = normalizeLineEndings(project);

  const progressRaw = row["진행률"];
  const progress = typeof progressRaw === "number" ? Math.round(progressRaw * 100) : 0;

  return {
    input: {
      member: member as Member,
      project: normalizedProject,
      category: category as Category,
      detail: toTextOrNull(row["세부업무"]),
      priority: toPriority(row["우선순위"]),
      start_date: toDateOrNull(row["시작일"]),
      due_date: toDateOrNull(row["마감일"]),
      progress,
      status: toStatus(row["상태"]),
      comment: toTextOrNull(row["팀장코멘트"]),
    },
  };
}

const REQUIRED_HEADERS = [
  "담당자", "프로젝트", "업무구분", "세부업무", "우선순위",
  "시작일", "마감일", "진행률", "상태", "팀장코멘트",
] as const;

export type ParsedImportRow = { input: TaskInput; rowNumber: number };
export type ImportParseResult = {
  rows: ParsedImportRow[];
  skipped: { rowNumber: number; reason: string }[];
};

export async function parseTaskImportFile(file: File): Promise<ImportParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets["통합DB"];
  if (!sheet) throw new Error("통합DB 시트를 찾을 수 없습니다");

  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  const [header, ...dataRows] = grid;
  if (!header) throw new Error("통합DB 시트에 헤더 행이 없습니다");

  for (const required of REQUIRED_HEADERS) {
    if (!header.includes(required)) {
      throw new Error(`통합DB 시트에 "${required}" 열이 없습니다`);
    }
  }

  const rows: ParsedImportRow[] = [];
  const skipped: ImportParseResult["skipped"] = [];

  dataRows.forEach((dataRow, i) => {
    const rowNumber = i + 2; // header is row 1
    const record: Record<string, unknown> = {};
    header.forEach((h, colIdx) => {
      record[h as string] = dataRow[colIdx];
    });
    const memberCell = record["담당자"];
    const projectCell = record["프로젝트"];
    const memberBlank = memberCell == null || memberCell === "";
    const projectBlank = projectCell == null || projectCell === "";
    if (memberBlank && projectBlank) return; // blank row (including formula-filled "" cells)

    const result = mapImportRow(record);
    if ("skipReason" in result) {
      skipped.push({ rowNumber, reason: result.skipReason });
    } else {
      rows.push({ input: result.input, rowNumber });
    }
  });

  return { rows, skipped };
}
