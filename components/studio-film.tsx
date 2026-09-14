"use client";
import {useEffect,useRef,useState} from 'react';
import {Pause,Play} from 'lucide-react';

const DEFAULT_SOURCES=['/member-select-bg.mp4'];

// `sources.length===1` (default, used by the login screen) keeps the exact
// original behavior: one video, infinite native loop, no JS involved in
// looping. Passing 2+ sources switches to "play through, then advance" so
// the clips alternate — only the active source is ever loaded (no
// upfront preload of the others), keeping bandwidth cost the same as one
// video regardless of how many are in the list.
export function StudioFilm({className='',sources=DEFAULT_SOURCES}:{className?:string;sources?:string[]}){
 const ref=useRef<HTMLVideoElement>(null);const [paused,setPaused]=useState(true);const [index,setIndex]=useState(0);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');let p=media.matches;try{p=p||localStorage.getItem('team-dashboard:film')==='paused'}catch{}setPaused(p);const handler=()=>{if(media.matches)setPaused(true)};media.addEventListener('change',handler);return()=>media.removeEventListener('change',handler)},[]);
 useEffect(()=>{const video=ref.current;if(!video)return;if(paused)video.pause();else void video.play().catch(()=>setPaused(true))},[paused,index]);
 useEffect(()=>{const video=ref.current;if(!video)return;const observer=new IntersectionObserver(([entry])=>{if(!entry.isIntersecting)video.pause();else if(!paused)void video.play().catch(()=>{})},{threshold:.1});observer.observe(video);return()=>observer.disconnect()},[paused,index]);
 const advance=()=>{if(sources.length>1)setIndex(i=>(i+1)%sources.length)};
 return <div className={`studio-film ${className}`}><video key={sources[index]} ref={ref} muted loop={sources.length<=1} onEnded={advance} playsInline preload="metadata" poster="/member-select-bg.jpg" aria-hidden><source src={sources[index]} type="video/mp4"/></video><button className="studio-film-toggle" onClick={()=>{setPaused(!paused);try{localStorage.setItem('team-dashboard:film',paused?'playing':'paused')}catch{}}} aria-label={paused?'배경 영상 재생':'배경 영상 일시정지'}>{paused?<Play size={14}/>:<Pause size={14}/>}<span>{paused?'재생':'일시정지'}</span></button></div>
}
