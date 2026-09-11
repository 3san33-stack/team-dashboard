"use client";
import {useEffect,useRef,useState} from 'react';
import {Pause,Play} from 'lucide-react';
export function StudioFilm({className=''}:{className?:string}){
 const ref=useRef<HTMLVideoElement>(null);const [paused,setPaused]=useState(true);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');let p=media.matches;try{p=p||localStorage.getItem('team-dashboard:film')==='paused'}catch{}setPaused(p);const handler=()=>{if(media.matches)setPaused(true)};media.addEventListener('change',handler);return()=>media.removeEventListener('change',handler)},[]);
 useEffect(()=>{const video=ref.current;if(!video)return;if(paused)video.pause();else void video.play().catch(()=>setPaused(true))},[paused]);
 useEffect(()=>{const video=ref.current;if(!video)return;const observer=new IntersectionObserver(([entry])=>{if(!entry.isIntersecting)video.pause();else if(!paused)void video.play().catch(()=>{})},{threshold:.1});observer.observe(video);return()=>observer.disconnect()},[paused]);
 return <div className={`studio-film ${className}`}><video ref={ref} muted loop playsInline preload="metadata" poster="/member-select-bg.jpg" aria-hidden><source src="/member-select-bg.mp4" type="video/mp4"/></video><button className="studio-film-toggle" onClick={()=>{setPaused(!paused);try{localStorage.setItem('team-dashboard:film',paused?'playing':'paused')}catch{}}} aria-label={paused?'배경 영상 재생':'배경 영상 일시정지'}>{paused?<Play size={14}/>:<Pause size={14}/>}<span>{paused?'재생':'일시정지'}</span></button></div>
}
