export type DiaryContent = { notes: string; days: string[] };
export const emptyDiary = (): DiaryContent => ({ notes: "", days: Array(7).fill("") });
export function diaryDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function diaryWeek(date: Date): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return diaryDateKey(monday);
}
export function diaryDay(week: string, offset: number): Date {
  const date = new Date(`${week}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return date;
}
export function validDiary(value: unknown): value is DiaryContent {
  const d = value as DiaryContent;
  return !!d && typeof d.notes === "string" && d.notes.length <= 10000 && Array.isArray(d.days) && d.days.length === 7 && d.days.every(s => typeof s === "string" && s.length <= 5000);
}
