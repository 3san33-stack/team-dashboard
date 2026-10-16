import { expect, it } from "vitest";
import { syncTaskCompletion } from "./task-completion";
it("sets completion progress atomically", () => {
 expect(syncTaskCompletion({status: "완료", progress: 20})).toEqual({status:"완료",progress:100});
});
it("sets completed status for 100 percent", () => {
 expect(syncTaskCompletion({progress:100})).toEqual({status:"완료",progress:100});
});
it("leaves unrelated updates untouched", () => {
 expect(syncTaskCompletion({due_date:"2026-10-30"})).toEqual({due_date:"2026-10-30"});
 expect(syncTaskCompletion({progress:20})).toEqual({progress:20});
});
