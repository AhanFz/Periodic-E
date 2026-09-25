import React from 'react';
import { Animated, View, Text } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { useAmbientMotion } from '../motion';
import { fonts } from '../theme';
/** Hatch: blue orbital aperture. Hut: green reagent gate. Shapes remain distinct without colour. */
export function Portal({kind,size}:{kind:'hut'|'hatch';size:number}) {
  const pulse=useAmbientMotion(1800); const color=kind==='hut'?'#258f79':'#3869b1';
  return <View pointerEvents="none" style={{alignItems:'center'}}>
    <Animated.View style={{opacity:pulse.interpolate({inputRange:[0,1],outputRange:[0.65,1]}),transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[0.94,1.04]})}]}}>
      <Svg width={size*.68} height={size*.62} viewBox="0 0 100 90">
        <Ellipse cx="50" cy="78" rx="35" ry="7" fill={color} opacity={.16}/>
        {kind==='hatch'?<><Ellipse cx="50" cy="43" rx="32" ry="34" fill="#152943" stroke={color} strokeWidth="4"/><Ellipse cx="50" cy="43" rx="24" ry="27" fill="#244b74" stroke="#9cc9f5" strokeWidth="2"/><Path d="M38 28 L60 43 L38 58 M28 17 L22 24 M73 61 L79 68" fill="none" stroke="#d3ebff" strokeWidth="4"/><Circle cx="66" cy="23" r="3" fill="#ffffff"/></>:<><Path d="M20 75 L20 27 L35 10 L65 10 L80 27 L80 75 Z" fill="#133e39" stroke={color} strokeWidth="4"/><Path d="M30 71 L30 31 Q50 6 70 31 L70 71 Z" fill="#297967" stroke="#9febd0" strokeWidth="2"/><Path d="M44 33 L56 33 M47 33 L47 45 L37 60 Q50 70 63 60 L53 45 L53 33" fill="none" stroke="#d9ffea" strokeWidth="3"/><Circle cx="51" cy="56" r="3" fill="#b8ffd7"/></>}
      </Svg>
    </Animated.View>
    <Text style={{fontFamily:fonts.mono,fontSize:Math.max(8,size*.13),color,fontWeight:'700'}}>{kind==='hut'?'HUT':'HATCH'}</Text>
  </View>;
}
