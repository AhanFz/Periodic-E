import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { fonts, theme } from '../theme';
import { tapFeedback } from '../haptics';

/** A printed rule; `double` gives the two-line rule used under chapter heads. */
export function Rule({ double, style }: { double?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <View style={styles.rule} />
      {double && <View style={[styles.rule, { marginTop: 2 }]} />}
    </View>
  );
}

/** Small-capitals running label: "TABLE 1", "§ PROPERTIES". */
export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.caps, style]}>{children}</Text>;
}

/** Italic figure/table caption. */
export function Caption({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.caption, style]}>{children}</Text>;
}

export type ButtonVariant = 'outline' | 'primary' | 'highlight' | 'danger' | 'muted';

export function PaperButton({ label, onPress, variant = 'outline', disabled, style, big, onLongPress }: {
  label: string; onPress: () => void; onLongPress?: () => void; variant?: ButtonVariant; disabled?: boolean; style?: StyleProp<ViewStyle>; big?: boolean;
}) {
  const v = disabled ? variants.disabled : variants[variant];
  // Every button ticks. Anything the press causes — a hit, a kill, damage taken — thumps after it.
  const held = useRef(false);
  const press = () => { if (held.current) { held.current = false; return; } tapFeedback(); onPress(); };
  return (
    <Pressable onPressIn={() => { held.current = false; }} onLongPress={onLongPress ? () => { held.current = true; onLongPress(); } : undefined} delayLongPress={350} accessibilityHint={onLongPress ? "Hold for an action preview" : undefined} onPress={press} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.btn, { backgroundColor: v.bg, borderColor: v.border, borderStyle: disabled ? 'dashed' : 'solid', opacity: pressed ? 0.7 : 1 }, style]}>
      <Text style={[styles.btnText, big && styles.btnBig, { color: v.fg }]}>{label}</Text>
    </Pressable>
  );
}

const variants: Record<ButtonVariant | 'disabled', { bg: string; fg: string; border: string }> = {
  outline: { bg: theme.panel, fg: theme.ink, border: theme.ink },
  primary: { bg: theme.accent, fg: '#fbf8ef', border: theme.accent },
  highlight: { bg: theme.gold, fg: theme.goldText, border: theme.ink },
  danger: { bg: theme.red, fg: '#fbf8ef', border: theme.red },
  muted: { bg: theme.panel2, fg: theme.textDim, border: theme.rule },
  disabled: { bg: theme.disabled, fg: theme.disabledText, border: theme.rule },
};

const styles = StyleSheet.create({
  rule: { height: 1, backgroundColor: theme.ink, opacity: 0.8 },
  caps: { fontFamily: fonts.serif, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: theme.textDim },
  caption: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 12, lineHeight: 17, color: theme.textDim },
  btn: { borderWidth: 1, borderRadius: 3, paddingVertical: 11, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  btnBig: { fontSize: 20 },
});
