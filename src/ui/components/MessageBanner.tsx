import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, theme } from '../theme';
import type { MessageType } from '@/game/types';

interface Props { text: string; type: MessageType; }

const LABEL: Record<MessageType, string> = { info: 'Note', success: 'Result', warning: 'Caution', danger: 'Hazard' };

/** The running commentary, set as a margin note with a coloured rule. */
export function MessageBanner({ text, type }: Props) {
  const c = theme[type];
  return (
    <View style={[styles.box, { backgroundColor: c.bg, borderLeftColor: c.border }]}>
      <Text style={[styles.label, { color: c.border }]}>{LABEL[type]}</Text>
      <Text style={[styles.text, { color: c.fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderLeftWidth: 3, paddingVertical: 8, paddingHorizontal: 12, minHeight: 46, justifyContent: 'center' },
  label: { fontFamily: fonts.serif, fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 2 },
  text: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 13, lineHeight: 18 },
});
