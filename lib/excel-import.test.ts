import { describe, it, expect } from "vitest";
import { mapImportRow } from "./excel-import";

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
});
