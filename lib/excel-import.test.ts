import { describe, it, expect } from "vitest";
import { mapImportRow, taskMatchKey, summarizeImport } from "./excel-import";
import type { Task } from "./types";

function makeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    담당자: "구민석",
    프로젝트: "테스트 프로젝트",
    업무구분: "제품개발",
    세부업무: "세부 내용",
    우선순위: "P2-높음",
    시작일: new Date(2026, 7, 1), // 2026-08-01 (month is 0-indexed)
    마감일: new Date(2026, 7, 31), // 2026-08-31
    진행률: 0.5,
    상태: "진행중",
    팀장코멘트: "코멘트",
    ...overrides,
  };
}

describe("mapImportRow", () => {
  it("maps a fully-populated row to a TaskInput", () => {
    const result = mapImportRow(makeRow());
    expect(result).toEqual({
      input: {
        member: "구민석",
        project: "테스트 프로젝트",
        category: "제품개발",
        detail: "세부 내용",
        priority: "P2-높음",
        start_date: "2026-08-01",
        due_date: "2026-08-31",
        progress: 50,
        status: "진행중",
        comment: "코멘트",
      },
    });
  });

  it("skips a row with an unknown member", () => {
    const result = mapImportRow(makeRow({ 담당자: "알수없음" }));
    expect(result).toEqual({ skipReason: "알 수 없는 담당자: 알수없음" });
  });

  it("skips a row with an unknown category", () => {
    const result = mapImportRow(makeRow({ 업무구분: "없는분류" }));
    expect(result).toEqual({ skipReason: "알 수 없는 업무구분: 없는분류" });
  });

  it("skips a row with no project name", () => {
    const result = mapImportRow(makeRow({ 프로젝트: null }));
    expect(result).toEqual({ skipReason: "프로젝트 이름이 없습니다" });
  });

  it("defaults priority to P3-보통 when the cell is 0", () => {
    const result = mapImportRow(makeRow({ 우선순위: 0 }));
    expect("input" in result && result.input.priority).toBe("P3-보통");
  });

  it("defaults status to 예정 when the cell is 0", () => {
    const result = mapImportRow(makeRow({ 상태: 0 }));
    expect("input" in result && result.input.status).toBe("예정");
  });

  it("converts comment of 0 to null", () => {
    const result = mapImportRow(makeRow({ 팀장코멘트: 0 }));
    expect("input" in result && result.input.comment).toBeNull();
  });

  it("converts non-Date date cells (blank/time-only) to null", () => {
    const result = mapImportRow(makeRow({ 시작일: undefined, 마감일: null }));
    expect("input" in result && result.input.start_date).toBeNull();
    expect("input" in result && result.input.due_date).toBeNull();
  });

  it("rounds fractional progress to a 0-100 integer", () => {
    const result = mapImportRow(makeRow({ 진행률: 0.714286 }));
    expect("input" in result && result.input.progress).toBe(71);
  });

  it("defaults progress to 0 when the cell isn't a number", () => {
    const result = mapImportRow(makeRow({ 진행률: null }));
    expect("input" in result && result.input.progress).toBe(0);
  });

  it("normalizes \\r\\n to \\n in multi-line project/detail/comment text", () => {
    const result = mapImportRow(makeRow({
      프로젝트: "행거치프 손수건 디자인\r\n비나 샘플요청",
      세부업무: "1차\r\n2차",
      팀장코멘트: "코멘트1\r\n코멘트2",
    }));
    expect("input" in result && result.input.project).toBe("행거치프 손수건 디자인\n비나 샘플요청");
    expect("input" in result && result.input.detail).toBe("1차\n2차");
    expect("input" in result && result.input.comment).toBe("코멘트1\n코멘트2");
  });
});

describe("taskMatchKey", () => {
  it("treats extra/leading/trailing whitespace as the same task", () => {
    const a = taskMatchKey("구민석", "테스트 프로젝트", "제품개발");
    const b = taskMatchKey("구민석", "  테스트   프로젝트  ", "제품개발");
    expect(a).toBe(b);
  });

  it("treats different case as the same task", () => {
    const a = taskMatchKey("구민석", "CJ Project", "제품개발");
    const b = taskMatchKey("구민석", "cj project", "제품개발");
    expect(a).toBe(b);
  });

  it("still distinguishes genuinely different projects", () => {
    const a = taskMatchKey("구민석", "프로젝트 A", "제품개발");
    const b = taskMatchKey("구민석", "프로젝트 B", "제품개발");
    expect(a).not.toBe(b);
  });
});

describe("summarizeImport", () => {
  function makeTask(overrides: Partial<Task>): Task {
    return {
      id: "1", member: "구민석", project: "기존 업무", category: "제품개발",
      detail: null, priority: "P3-보통", start_date: null, due_date: null,
      progress: 0, status: "예정", comment: null,
      created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
      ...overrides,
    };
  }

  it("counts rows matching an existing task as updates, others as new", () => {
    const existing = [makeTask({ id: "1", project: "기존 업무" })];
    const rows = [
      { rowNumber: 2, input: { member: "구민석" as const, project: "  기존   업무  ", category: "제품개발" as const, detail: null, priority: "P3-보통" as const, start_date: null, due_date: null, progress: 0, status: "예정" as const, comment: null } },
      { rowNumber: 3, input: { member: "구민석" as const, project: "신규 업무", category: "제품개발" as const, detail: null, priority: "P3-보통" as const, start_date: null, due_date: null, progress: 0, status: "예정" as const, comment: null } },
    ];
    expect(summarizeImport(rows, existing)).toEqual({ toCreate: 1, toUpdate: 1 });
  });
});
