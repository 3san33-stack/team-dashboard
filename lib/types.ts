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

export const UPLOAD_LOG_CATEGORIES = ["신규", "수정", "동일"] as const;
export type UploadLogCategory = (typeof UPLOAD_LOG_CATEGORIES)[number];

export type UploadLog = {
  id: string;
  member: Weaver;
  category: UploadLogCategory;
  created_at: string;
};

export const DYEINGS = ["선염", "후염"] as const;

// 타월 사종분석 한 건 (완성품 + 생지상태 규격). 밀도·중량은 "56T", "0" 같은
// 값도 들어와서 전부 text.
export type TowelAnalysis = {
  id: string;
  analyzed_on: string | null;
  towel_name: string;
  image_url: string | null;
  spec: string | null;
  weight: string | null;
  pile_yarn: string | null;
  ground_yarn: string | null;
  weft_yarn: string | null;
  warp_density: string | null;
  weft_density: string | null;
  dyeing: string | null;
  greige_spec: string | null;
  greige_weight: string | null;
  greige_warp_density: string | null;
  greige_weft_density: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TowelAnalysisInput = Omit<TowelAnalysis, "id" | "created_at" | "updated_at">;
