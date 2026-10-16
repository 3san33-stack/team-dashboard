import type { TaskInput } from "./types";

export function syncTaskCompletion<T extends Partial<TaskInput>>(input: T): T {
  if (input.status === "완료" || input.progress === 100) {
    return { ...input, status: "완료", progress: 100 };
  }
  return input;
}
