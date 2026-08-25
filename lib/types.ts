export const MEMBERS = ["이은혜", "김혜진", "양세현", "구민석", "안도현"] as const;
export type Member = (typeof MEMBERS)[number];

export const CATEGORIES = [
  "제품개발", "타부서(팀)지원", "조직연구", "샘플제직", "생산지원", "기타업무", "OKR",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ["P1-긴급", "P2-높음", "P3-보통", "P4-낮음"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ["예정", "진행중", "검토중", "완료", "보류"] as const;
export type Status = (typeof STATUSES)[number];

export type Task = {
  id: string;
  member: Member;
  project: string;
  category: Category;
  detail: string | null;
  priority: Priority;
  start_date: string | null;
  due_date: string | null;
  progress: number;
  status: Status;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskInput = Omit<Task, "id" | "created_at" | "updated_at">;

export type PersonalTodoItem = {
  id: string;
  member: Member;
  text: string;
  done: boolean;
  created_at: string;
};

export const WEAVERS = ["구민석", "안도현"] as const;
export type Weaver = (typeof WEAVERS)[number];

export const SAMPLE_REQUEST_STATUSES = ["요청됨", "확인함", "제직중", "완료"] as const;
export type SampleRequestStatus = (typeof SAMPLE_REQUEST_STATUSES)[number];

export type SampleRequest = {
  id: string;
  requester: Member;
  weaver: Weaver;
  title: string;
  spec_note: string | null;
  reference_link: string | null;
  desired_date: string | null;
  status: SampleRequestStatus;
  created_at: string;
  updated_at: string;
};

export type SampleRequestInput = Omit<SampleRequest, "id" | "created_at" | "updated_at">;
