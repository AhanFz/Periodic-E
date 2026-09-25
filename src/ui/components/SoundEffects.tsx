import {useEffect,useRef} from 'react';
import {AppState} from 'react-native';
import {createAudioPlayer,setAudioModeAsync,type AudioPlayer} from 'expo-audio';
import {useGameStore} from '@/store/gameStore';
const sources={move:require('../../../assets/audio/move.wav'),impact:require('../../../assets/audio/impact.wav'),freeze:require('../../../assets/audio/freeze.wav'),evolve:require('../../../assets/audio/evolve.wav'),photon:require('../../../assets/audio/photon.wav')};
type Cue=keyof typeof sources;
export function SoundEffects(){
 const state=useGameStore();const players=useRef<Partial<Record<Cue,AudioPlayer>>>({});const generation=useRef(0);
 const last=useRef({x:0,y:0,element:'',hp:0,depth:0});
 useEffect(()=>{
  void setAudioModeAsync({playsInSilentMode:false,shouldPlayInBackground:false,interruptionMode:'mixWithOthers'}).catch(()=>{});
  const sub=AppState.addEventListener('change',s=>{if(s!=='active'){generation.current++;Object.values(players.current).forEach(p=>p?.pause());}});
  return()=>{generation.current++;sub.remove();Object.values(players.current).forEach(p=>p?.remove());};
 },[]);
 useEffect(()=>{
  if(!state.soundOn || state.paused || state.screen!=='game'){generation.current++;Object.values(players.current).forEach(p=>p?.pause());}
 },[state.soundOn,state.paused,state.screen]);
 useEffect(()=>{
  const g=state.frame?.game??state.game;if(!g)return;
  const prev=last.current;last.current={x:g.playerPos.x,y:g.playerPos.y,element:g.currentElement,hp:g.elementHealth,depth:g.depth};
  if(!state.soundOn||state.paused||state.screen!=='game')return;
  const fx=g.pendingEffects;
  const cue:Cue|undefined=prev.element && prev.element!==g.currentElement?'evolve':fx.some(f=>f.type==='frost')?'freeze':state.frame?.motion && state.frame.motion.kind!=='windup' || prev.element && g.elementHealth<prev.hp?'impact':fx.some(f=>f.type==='photon')?'photon':prev.element && prev.depth===g.depth&&(prev.x!==g.playerPos.x||prev.y!==g.playerPos.y)?'move':undefined;
  if(!cue)return;
  try{
   const p=players.current[cue]??(players.current[cue]=createAudioPlayer(sources[cue]));p.volume=.3;
   const token=generation.current;
   void p.seekTo(0).then(()=>{if(token===generation.current && useGameStore.getState().soundOn && AppState.currentState!=='background')p.play();}).catch(()=>{});
  }catch{/* Unsupported audio must never block gameplay. */}
 },[state.tick]);
 return null;
}
