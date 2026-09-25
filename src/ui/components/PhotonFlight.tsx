import React,{useEffect,useRef} from 'react';
import {Animated,View,Easing} from 'react-native';
export function PhotonFlight({from,to,onDone}:{from:{x:number;y:number};to:{x:number;y:number};onDone:()=>void}){
 const t=useRef(new Animated.Value(0)).current;
 useEffect(()=>{const a=Animated.timing(t,{toValue:1,duration:680,easing:Easing.inOut(Easing.cubic),useNativeDriver:true});a.start(({finished})=>{if(finished)onDone();});return()=>a.stop();},[t]);
 return <View pointerEvents="none" style={{position:'absolute',inset:0}}>{[0,1,2].map(i=><Animated.View key={i} style={{position:'absolute',left:from.x-4,top:from.y-4,width:8-i,height:8-i,borderRadius:8,backgroundColor:'#e6b328',borderColor:'#fff1a6',borderWidth:1,opacity:t.interpolate({inputRange:[0,.8,1],outputRange:[1,1,0]}),transform:[{translateX:t.interpolate({inputRange:[0,.5,1],outputRange:[i*3,(to.x-from.x)/2+20+i*5,to.x-from.x]})},{translateY:t.interpolate({inputRange:[0,1],outputRange:[i*5,to.y-from.y]})}]}}/>)}</View>;
}
