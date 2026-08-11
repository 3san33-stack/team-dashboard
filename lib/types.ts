export type Member = "이은혜" | "김혜진" | "양세현" | "구민석" | "안도현";
export const MEMBERS: Member[] = ["이은혜", "김혜진", "양세현", "구민석", "안도현"];

export type Category =
  | "제품개발" | "타부서(팀)지원" | "조직연구" | "샘플제직" | "생산지원" | "기타업무" | "OKR";
export const CATEGORIES: Category[] = [
  "제품개발", "타부서(팀)지원", "조직연구", "샘플제직", "생산지원", "기타업무", "OKR",
];

export type Priority = "P1-긴급" | "P2-높음" | "P3-보통" | "P4-낮음";
export const PRIORITIES: Priority[] = ["P1-긴급", "P2-높음", "P3-보통", "P4-낮음"];

export type Status = "예정" | "진행중" | "검토중" | "완료" | "보류";
export const STATUSES: Status[] = ["예정", "진행중", "검토중", "완료", "보류"];

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
