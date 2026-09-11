"use client";
import {ArrowUpRight,CheckCheck,Clock3,Layers3,LoaderCircle} from 'lucide-react';
import {CountUpNumber} from '@/components/count-up-number';
type Props={total:number;inProgress:number;completed:number;overdue:number;onSelect?:(status:string)=>void};
export function SummaryCards({total,inProgress,completed,overdue,onSelect}:Props){
 const items=[{label:'전체 업무',key:'전체',value:total,icon:Layers3,note:'팀에 등록된 모든 업무'},{label:'진행중',key:'진행중',value:inProgress,icon:LoaderCircle,note:'현재 진행 중인 작업'},{label:'완료',key:'완료',value:completed,icon:CheckCheck,note:total?`전체 업무의 ${Math.round(completed/total*100)}% 완료`:'등록된 업무가 없습니다'},{label:'지연',key:'지연',value:overdue,icon:Clock3,note:'마감일이 지난 미완료 업무'}];
 return <div className="studio-summary">{items.map(item=><button key={item.key} className={`studio-stat ${item.key==='지연'?'is-warning':''}`} onClick={()=>onSelect?.(item.key)} disabled={!onSelect}><div className="studio-stat-label">{item.label}<item.icon size={19}/></div><div className="studio-stat-number"><CountUpNumber value={item.value}/><span>건</span></div><div className="studio-stat-note"><span>{item.note}</span><ArrowUpRight size={15}/></div></button>)}</div>
}
