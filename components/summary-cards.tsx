"use client";
import {ArrowUpRight,CalendarClock,CheckCheck,Clock3,Layers3,LoaderCircle,PauseCircle} from 'lucide-react';
import {CountUpNumber} from '@/components/count-up-number';
type Props={total:number;inProgress:number;completed:number;planned:number;onHold:number;overdue:number;onSelect?:(status:string)=>void};
// 전체 건수와 완료율은 보류 및 검토중을 제외한다.
// 지연은 상태와 무관하게 "마감 지남 + 미완료"를 따지는 별도 축이라 겹칠 수 있어 분리 배치한다.
export function SummaryCards({total,inProgress,completed,planned,onHold,overdue,onSelect}:Props){
 const statusItems=[{label:'전체 업무',key:'전체',value:total,icon:Layers3,note:'보류·검토중을 제외한 업무'},{label:'진행중',key:'진행중',value:inProgress,icon:LoaderCircle,note:'현재 진행 중인 작업'},{label:'완료',key:'완료',value:completed,icon:CheckCheck,note:total?`전체 업무의 ${Math.round(completed/total*100)}% 완료`:'등록된 업무가 없습니다'},{label:'예정',key:'예정',value:planned,icon:CalendarClock,note:'아직 시작하지 않은 업무'}];
 return <div className="studio-summary">
  <div className="studio-summary-status">{statusItems.map(item=><button key={item.key} className="studio-stat" onClick={()=>onSelect?.(item.key)} disabled={!onSelect}><div className="studio-stat-label">{item.label}<item.icon size={19}/></div><div className="studio-stat-number"><CountUpNumber value={item.value}/><span>건</span></div><div className="studio-stat-note"><span>{item.note}</span><ArrowUpRight size={15}/></div></button>)}</div>
  <div className="studio-summary-separate"><button className="studio-stat studio-stat-overdue" onClick={()=>onSelect?.('보류 및 검토중')} disabled={!onSelect}><div className="studio-stat-label">보류 및 검토중<PauseCircle size={19}/></div><div className="studio-stat-number"><CountUpNumber value={onHold}/><span>건</span></div><div className="studio-stat-note"><span>전체 건수·완료율에서 제외</span><ArrowUpRight size={15}/></div></button>
  <button className="studio-stat studio-stat-overdue is-warning" onClick={()=>onSelect?.('지연')} disabled={!onSelect}><div className="studio-stat-label">지연<Clock3 size={19}/></div><div className="studio-stat-number"><CountUpNumber value={overdue}/><span>건</span></div><div className="studio-stat-note"><span>상태와 별개로, 마감 지난 미완료 업무</span><ArrowUpRight size={15}/></div></button>
  </div>
 </div>
}
