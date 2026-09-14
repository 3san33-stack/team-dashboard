import { describe, expect, it } from "vitest";
import { diaryDateKey, diaryDay, diaryWeek, emptyDiary, validDiary } from "./diary";

describe("diary weeks", () => {
  it("keeps Sunday in the preceding Monday week across year boundaries", () => {
    expect(diaryWeek(new Date(2027, 0, 3, 1))).toBe("2026-12-28");
    expect(diaryWeek(new Date(2027, 0, 4, 0))).toBe("2027-01-04");
  });
  it("moves weeks and days across months and leap days", () => {
    expect(diaryDateKey(diaryDay("2024-02-26", 3))).toBe("2024-02-29");
    expect(diaryDateKey(diaryDay("2024-02-26", 7))).toBe("2024-03-04");
    expect(diaryDateKey(diaryDay("2024-03-04", -7))).toBe("2024-02-26");
  });
});
describe("diary content", () => {
  it("accepts multiline free text and creates independent blank weeks", () => {
    const first=emptyDiary(), second=emptyDiary(); first.days[0]="첫 메모\n다음 줄";
    expect(validDiary(first)).toBe(true); expect(second.days[0]).toBe("");
  });
  it("rejects corrupt saved content and oversized notes", () => {
    expect(validDiary(null)).toBe(false);
    expect(validDiary({notes:"",days:[""]})).toBe(false);
    expect(validDiary({...emptyDiary(),notes:"x".repeat(10001)})).toBe(false);
    expect(validDiary({...emptyDiary(),days:Array(7).fill(5)})).toBe(false);
  });
});
