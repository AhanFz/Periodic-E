import React,{useEffect,useRef} from 'react';
import {Animated,View} from 'react-native';
import type {Fx} from '@/game/types';
import {useGameStore} from '@/store/gameStore';
export function DamageFloat({fx,size}:{fx:Fx;size:number}) {
 const v=useRef(new Animated.Value(0)).current;const reduced=useGameStore(s=>s.reducedMotion);
 useEffect(()=>{const a=Animated.timing(v,{toValue:1,duration:650,useNativeDriver:true});if(!reduced)a.start();return()=>a.stop();},[v,reduced]);
 return <View pointerEvents="none" style={{position:'absolute',inset:0,zIndex:20,alignItems:'center',justifyContent:'center'}}>
 {!!fx.shield&&<Animated.View style={{position:'absolute',width:size*.8,height:size*.8,borderRadius:size,borderWidth:2,borderColor:'#5ab8e8',opacity:v.interpolate({inputRange:[0,1],outputRange:[1,0]}),transform:[{scale:v.interpolate({inputRange:[0,1],outputRange:[.6,1.3]})}]}}/>}
 <Animated.Text style={{color:fx.amount?'#a52434':'#247fa2',backgroundColor:'#fff9eadd',borderRadius:4,paddingHorizontal:4,fontWeight:'800',fontSize:Math.max(12,size*.23),opacity:v.interpolate({inputRange:[0,.65,1],outputRange:[1,1,0]}),transform:[{translateY:v.interpolate({inputRange:[0,1],outputRange:[-size*.1,-size*.6]})}]}}>{fx.amount?`−${fx.amount}`:''}{fx.shield?`${fx.amount?' · ':''}◇ ${fx.shield}`:''}</Animated.Text>
 </View>;
}
