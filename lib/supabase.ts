import { createClient } from "@supabase/supabase-js";
import type {
  Member, PersonalTodoItem, SampleRequest, SampleRequestInput, Task, TaskInput,
} from "./types";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Task[];
}

export async function createTask(input: TaskInput): Promise<Task> {
  const { data, error } = await supabase.from("tasks").insert(input).select().single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, input: Partial<TaskInput>): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function listPersonalTodos(member: Member): Promise<PersonalTodoItem[]> {
  const { data, error } = await supabase
    .from("personal_todos")
    .select("*")
    .eq("member", member)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as PersonalTodoItem[];
}

export async function createPersonalTodo(member: Member, text: string): Promise<PersonalTodoItem> {
  const { data, error } = await supabase
    .from("personal_todos")
    .insert({ member, text, done: false })
    .select()
    .single();
  if (error) throw error;
  return data as PersonalTodoItem;
}

export async function togglePersonalTodo(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.from("personal_todos").update({ done }).eq("id", id);
  if (error) throw error;
}

export async function deletePersonalTodo(id: string): Promise<void> {
  const { error } = await supabase.from("personal_todos").delete().eq("id", id);
  if (error) throw error;
}

export async function listSampleRequests(): Promise<SampleRequest[]> {
  const { data, error } = await supabase
    .from("sample_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as SampleRequest[];
}

export async function createSampleRequest(input: SampleRequestInput): Promise<SampleRequest> {
  const { data, error } = await supabase.from("sample_requests").insert(input).select().single();
  if (error) throw error;
  return data as SampleRequest;
}

export async function updateSampleRequestStatus(
  id: string,
  status: SampleRequest["status"]
): Promise<void> {
  const { error } = await supabase
    .from("sample_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
