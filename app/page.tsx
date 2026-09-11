"use client";
import { useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import { ArrowUpRight, CalendarDays, CheckCheck, ChevronRight, Clock3, Download, Focus, Plus, RefreshCw, TrendingUp } from "lucide-react";
import { MemberSelect } from "@/components/member-select";
import { StudioShell, type StudioView } from "@/components/studio-shell";
import { StudioFilm } from "@/components/studio-film";
import { SummaryCards } from "@/components/summary-cards";
import { TaskTable, type TaskPreset } from "@/components/task-table";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { TaskCalendar } from "@/components/task-calendar";
import { PersonalTodo } from "@/components/personal-todo";
import { SampleRequestBoard } from "@/components/sample-request-board";
import { UploadLogWidget } from "@/components/upload-log-widget";
import { ExcelImportButton } from "@/components/excel-import-button";
import { AnalyticsDialog } from "@/components/analytics-dialog";
import { WeeklyReviewDialog } from "@/components/weekly-review-dialog";
import { listTasks, createTask, updateTask, deleteTask } from "@/lib/supabase";
import { isOverdue, upcomingDeadlines, averageProgress } from "@/lib/derived";
import { downloadTasksAsCsv } from "@/lib/export-csv";
import { MEMBERS, type Member, type Task, type TaskInput } from "@/lib/types";

const MEMBER_STORAGE_KEY="team-dashboard:member";
const titles:Record<StudioView,{title:string;description:string}>={
 overview:{title:"좋은 디자인은, 함께 만드는 것.",description:"팀의 오늘을 살펴보고, 다음 아이디어를 이어가세요."},
 tasks:{title:"업무의 흐름을 한눈에.",description:"담당자와 상태를 선택해 필요한 업무에 집중하세요."},
 samples:{title:"아이디어가 샘플이 되는 곳.",description:"요청부터 제직 완료까지, 팀의 작업을 함께 연결합니다."},
 planner:{title:"오늘의 할 일, 다음의 계획.",description:"개인 할 일과 업무 마감을 한곳에서 정리하세요."},
 uploads:{title:"차곡차곡 쌓이는 작업 기록.",description:"신규·수정·동일 업로드의 일별 흐름을 확인하세요."},
 report:{title:"팀의 성과를 함께 읽다.",description:"업무 진행 현황과 제품개발 기여율을 확인하세요."}
};
export default function DashboardPage(){
 const [member,setMember]=useState<Member|null>(null),[ready,setReady]=useState(false),[tasks,setTasks]=useState<Task[]>([]),[editingTask,setEditingTask]=useState<Task|null>(null),[error,setError]=useState<string|null>(null),[actionError,setActionError]=useState<string|null>(null),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[view,setView]=useState<StudioView>('overview'),[preset,setPreset]=useState<TaskPreset>({}),[tableVersion,setTableVersion]=useState(0),[lastUpdated,setLastUpdated]=useState<Date|null>(null);
 useEffect(()=>{try{const saved=localStorage.getItem(MEMBER_STORAGE_KEY);if(MEMBERS.includes(saved as Member))setMember(saved as Member)}catch{}const hash=window.location.hash.slice(1);if(['tasks','samples','planner','uploads'].includes(hash))setView(hash as StudioView);setReady(true)},[]);
 useEffect(()=>{if(!member)return;let active=true;setLoading(true);listTasks().then(data=>{if(active){setTasks(data);setError(null);setLastUpdated(new Date())}}).catch(()=>{if(active)setError('업무 데이터를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[member]);
 async function refresh(){setRefreshing(true);try{setTasks(await listTasks());setError(null);setLastUpdated(new Date())}catch{setError('업무 데이터를 새로 불러오지 못했습니다.')}finally{setLoading(false);setRefreshing(false)}}
 function selectMember(m:Member){try{localStorage.setItem(MEMBER_STORAGE_KEY,m)}catch{}setMember(m)}
 function switchMember(){try{localStorage.removeItem(MEMBER_STORAGE_KEY)}catch{}setMember(null);setTasks([]);setView('overview');setPreset({});setTableVersion(v=>v+1)}
 function navigate(next:StudioView){setView(next);window.history.replaceState(null,'',next==='overview'?'/':`/#${next}`);window.scrollTo({top:0,behavior:'instant'})}
 function focusTasks(next:TaskPreset){setPreset(next);setTableVersion(v=>v+1);navigate('tasks')}
 async function handleCreate(input:TaskInput){try{await createTask(input);setActionError(null);await refresh()}catch{setActionError('업무를 저장하지 못했습니다. 다시 시도해 주세요.');throw Error('create failed')}}
 async function handleUpdate(id:string,input:TaskInput){try{await updateTask(id,input);setActionError(null);await refresh();setEditingTask(null)}catch{setActionError('업무를 수정하지 못했습니다. 다시 시도해 주세요.');throw Error('update failed')}}
 async function handleDelete(id:string){try{await deleteTask(id);setActionError(null);await refresh()}catch{setActionError('업무를 삭제하지 못했습니다. 다시 시도해 주세요.')}}
 if(!ready)return <div className="studio-loading"><span className="studio-loading-mark">S</span><p>워크스페이스를 준비하고 있습니다</p></div>;
 if(!member)return <MemberSelect onSelect={selectMember}/>;
 const total=tasks.length,inProgress=tasks.filter(t=>t.status==='진행중').length,completed=tasks.filter(t=>t.status==='완료').length,planned=tasks.filter(t=>t.status==='예정').length,overdue=tasks.filter(t=>isOverdue(t)).length;
 const myTasks=tasks.filter(t=>t.member===member&&t.status!=='완료'),deadlines=upcomingDeadlines(tasks,4),completion=total?Math.round(completed/total*100):0,heading=titles[view];
 return <MotionConfig reducedMotion="user"><StudioShell member={member} tasks={tasks} active={view} onNavigate={navigate} onSwitchMember={switchMember}>
  <div className="studio-page-heading"><div><p className="studio-eyebrow">DESIGN & RESEARCH WORKSPACE</p><h1>{heading.title}</h1><p className="studio-subtitle">{member}님, {heading.description}</p></div><div className="studio-heading-actions"><button className="studio-btn" onClick={()=>downloadTasksAsCsv(tasks)} disabled={loading}><Download size={16}/><span>업무 내보내기</span></button><TaskFormDialog member={member} trigger={<button className="studio-btn studio-btn-primary"><Plus size={17}/>업무 추가</button>} onSubmit={handleCreate}/></div></div>
  <div className="studio-viewbar"><div className="studio-segment" aria-label="대시보드 보기"><button aria-pressed={view==='overview'} className={view==='overview'?'is-active':''} onClick={()=>navigate('overview')}>팀 오버뷰</button><button aria-pressed={view==='tasks'} className={view==='tasks'?'is-active':''} onClick={()=>focusTasks({member})}>내 업무</button><button aria-pressed={view==='planner'} className={view==='planner'?'is-active':''} onClick={()=>navigate('planner')}>일정 · 할 일</button></div><div className="studio-sync"><span>{lastUpdated?`${lastUpdated.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})} 업데이트`:'데이터 확인 중'}</span><button onClick={refresh} disabled={refreshing||loading} aria-label="업무 새로고침"><RefreshCw size={15} className={refreshing?'studio-spin':''}/></button></div></div>
  {actionError&&<p className="studio-error" role="alert">{actionError}</p>}{error&&<div className="studio-error" role="alert"><span>{error}</span><button onClick={refresh} disabled={refreshing}>다시 시도</button></div>}
  {loading?<div className="studio-skeleton" aria-label="업무 불러오는 중" role="status"><div/><div/><div/><div/><p>팀의 업무 현황을 불러오고 있습니다.</p></div>:<>
   <section hidden={view!=='overview'} className="studio-overview">
    <div className="studio-feature-grid"><div className="studio-welcome"><div className="studio-welcome-copy"><span className="studio-eyebrow">OUR NEXT CHAPTER</span><h2>오늘의 작은 아이디어,<br/><em>내일의 새로운 감촉.</em></h2><p>기획부터 연구, 샘플 제직까지.<br/>서로의 작업이 송월의 다음을 만듭니다.</p><button onClick={()=>navigate('samples')}>샘플 작업 살펴보기 <ArrowUpRight size={18}/></button></div><StudioFilm className="studio-welcome-film"/><span className="studio-welcome-stamp">SONGWOL DESIGN R&D</span></div><div className="studio-focus"><div className="studio-focus-head"><span className="studio-eyebrow">MY WORKSPACE</span><Focus size={19}/></div><p>{member}님의 진행할 업무</p><div className="studio-focus-count">{myTasks.length}<span>건</span></div><div className="studio-focus-meter"><span style={{width:`${averageProgress(tasks,member)}%`}}/></div><div className="studio-focus-meta"><span>내 전체 업무 평균 진행률</span><strong>{averageProgress(tasks,member)}%</strong></div><button onClick={()=>focusTasks({member})}>내 업무 이어가기 <ChevronRight size={17}/></button></div></div>
    <SummaryCards total={total} inProgress={inProgress} completed={completed} planned={planned} overdue={overdue} onSelect={status=>focusTasks({member:'all',...(status==='지연'?{overdue:true}:status==='전체'?{}:{status})})}/>
    <div className="studio-insight-grid"><section className="studio-panel"><div className="studio-panel-heading"><div><span className="studio-eyebrow">TEAM MOMENTUM</span><h2>함께 만드는 진척</h2></div><AnalyticsDialog tasks={tasks} trigger={<button className="studio-link">팀 분석 <ArrowUpRight size={16}/></button>}/></div><div className="studio-team-list">{MEMBERS.map((m,i)=>{const mine=tasks.filter(t=>t.member===m),done=mine.filter(t=>t.status==='완료').length,progress=averageProgress(tasks,m);return <button key={m} className="studio-team-row" onClick={()=>focusTasks({member:m})}><span className={`studio-person studio-person-${i}`}>{m[0]}</span><span className="studio-team-name">{m}<small>{mine.length}건 · 완료 {done}건</small></span><span className="studio-team-track"><span style={{width:progress+'%'}}/></span><strong>{progress}%</strong><ChevronRight size={15}/></button>})}</div><div className="studio-panel-foot"><CheckCheck size={16}/><span>팀 전체 완료율 <strong>{completion}%</strong></span><span>{completed} / {total}건 완료</span></div></section><section className="studio-panel studio-deadlines"><div className="studio-panel-heading"><div><span className="studio-eyebrow">NEEDS YOUR ATTENTION</span><h2>먼저 확인할 업무</h2></div><span className="studio-soft-icon"><Clock3 size={19}/></span></div>{deadlines.length?<div className="studio-deadline-list">{deadlines.map(task=><button key={task.id} onClick={()=>setEditingTask(task)}><span className={isOverdue(task)?'studio-due late':'studio-due'}>{isOverdue(task)?'지연':'마감'}</span><span><strong>{task.project}</strong><small>{task.member} · {task.due_date}</small></span><ArrowUpRight size={16}/></button>)}</div>:<div className="studio-calm"><CheckCheck size={32}/><p>예정된 마감이 없습니다.</p><span>다음 작업을 차분히 준비해보세요.</span></div>}<button className="studio-link studio-full-link" onClick={()=>focusTasks({member:'all',overdue:true})}>지연 업무 {overdue}건 확인 <ArrowUpRight size={15}/></button></section></div>
    <div className="studio-section-title"><div><span className="studio-eyebrow">KEEP THE IDEAS MOVING</span><h2>팀의 작업 공간</h2></div><span>필요한 작업으로 바로 이동하세요</span></div><div className="studio-quick-grid"><button onClick={()=>navigate('samples')} className="studio-quick-card studio-quick-samples"><span className="studio-quick-number">01 / SAMPLE LAB</span><h3>샘플 제직 요청</h3><p>아이디어를 실제 감촉으로</p><ArrowUpRight/><span className="studio-quick-tag">요청 · 확인 · 제직 · 완료</span></button><button onClick={()=>navigate('planner')} className="studio-quick-card"><CalendarDays size={27}/><h3>일정과 개인 할 일</h3><p>팀의 마감과 나의 계획</p><span className="studio-quick-tag">캘린더 열기 <ArrowUpRight size={15}/></span></button><WeeklyReviewDialog tasks={tasks} trigger={<button className="studio-quick-card"><TrendingUp size={27}/><h3>주간 팀 리뷰</h3><p>이번 주의 진행과 성과</p><span className="studio-quick-tag">리뷰 살펴보기 <ArrowUpRight size={15}/></span></button>}/></div>
   </section>
   <section hidden={view!=='tasks'} id="tasks" className="studio-panel studio-task-panel"><div className="studio-panel-heading"><div><span className="studio-eyebrow">PROJECTS & TASKS</span><h2>팀 업무 보드</h2></div><ExcelImportButton tasks={tasks} onImported={refresh}/></div><TaskTable key={`${member}-${tableVersion}`} tasks={tasks} member={member} preset={preset} onEdit={setEditingTask} onDelete={handleDelete}/></section>
   <section hidden={view!=='samples'} id="samples" className="studio-samples"><SampleRequestBoard member={member}/></section>
   <section hidden={view!=='planner'} id="planner" className="studio-planner"><PersonalTodo member={member}/><TaskCalendar tasks={tasks} member={member}/></section>
   <section hidden={view!=='uploads'} id="uploads"><UploadLogWidget/></section>
  </>}
  {editingTask&&<TaskFormDialog key={editingTask.id} member={editingTask.member} task={editingTask} open onOpenChange={open=>!open&&setEditingTask(null)} onSubmit={input=>handleUpdate(editingTask.id,input)}/>}
 </StudioShell></MotionConfig>
}
