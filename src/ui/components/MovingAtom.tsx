import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Atom } from './Atom';
import { useGameStore } from '@/store/gameStore';
import type { AtomView } from '@/game/view';
import type { CombatMotion } from '@/game/types';

/** Stable actor identity lets the atom travel above the lattice instead of remounting per cell. */
export function MovingAtom({ actor, atom, x, y, size, motion }: {
  actor: string; atom: AtomView; x: number; y: number; size: number; motion?: CombatMotion;
}) {
  const reduced = useGameStore(s => s.reducedMotion);
  const position = useRef(new Animated.ValueXY({ x:0, y:0 })).current;
  const bloom=useRef(new Animated.Value(1)).current;
  const symbol=useRef(atom.symbol);
  useEffect(()=>{if(symbol.current===atom.symbol)return;symbol.current=atom.symbol;
    if(reduced){bloom.setValue(1);return;}
    const a=Animated.sequence([Animated.timing(bloom,{toValue:1.4,duration:180,useNativeDriver:true}),Animated.spring(bloom,{toValue:1,damping:10,stiffness:85,useNativeDriver:true})]);a.start();return()=>a.stop();
  },[atom.symbol,reduced,bloom]);
  const impact = useRef(new Animated.Value(0)).current;
  const previous = useRef({x,y,size});
  useLayoutEffect(() => {
    const from=previous.current;
    previous.current={x,y,size};
    position.stopAnimation();
    // Layout owns the true cell. Animation is only a temporary offset from it.
    // Mounts and board resizes snap rather than interpolating stale pixel coordinates.
    if(reduced || from.size!==size || (from.x===x && from.y===y)) {
      position.setValue({x:0,y:0}); return;
    }
    position.setValue({x:from.x-x,y:from.y-y});
    const slide=Animated.timing(position,{toValue:{x:0,y:0},duration:240,easing:Easing.inOut(Easing.cubic),useNativeDriver:false});
    slide.start(({finished})=>{if(finished)position.setValue({x:0,y:0});});
    return ()=>{slide.stop();position.setValue({x:0,y:0});};
  },[x,y,size,reduced,position]);
  const attacks = motion?.actor === actor;
  const receives = motion?.target === actor;
  useEffect(() => {
    impact.setValue(0);
    if (reduced || !motion || (!attacks && !receives)) return;
    const bounce = Animated.sequence([
      Animated.delay(receives ? 100 : 0),
      Animated.timing(impact, { toValue: 1, duration: receives ? 65 : 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(impact, { toValue: 0, duration: 190, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    bounce.start();
    return () => bounce.stop();
  }, [motion, reduced, attacks, receives, impact]);
  const distance = size * (attacks ? 0.48 : receives ? 0.10 : 0);
  // Keep authoritative positioning on a non-animated, non-flattened native view.
  // Drive only the inner travel offset in JS: native-driven stale offsets on iOS
  // could leave the atom on its previous tile after the board had already updated.
  return <View collapsable={false} pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: size, height: size }}>
    <Animated.View style={{width:size,height:size,transform:position.getTranslateTransform()}}>
    <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', transform: [
      { translateX: impact.interpolate({ inputRange: [0, 1], outputRange: [0, (motion?.dx ?? 0) * distance] }) },
      { translateY: impact.interpolate({ inputRange: [0, 1], outputRange: [0, (motion?.dy ?? 0) * distance] }) },
      { scale: impact.interpolate({ inputRange: [0, 1], outputRange: [1, receives ? 0.91 : motion?.kind==='windup' ? 1.22 : 1.04] }) },
    ] }}>
      <Animated.View style={{transform:[{scale:bloom}]}}><Atom atom={atom} size={size * 0.72} /></Animated.View>
    </Animated.View>
    </Animated.View>
  </View>;
}
