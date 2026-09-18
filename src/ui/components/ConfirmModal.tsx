import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { PaperButton, SectionLabel } from './Print';
import { fonts, theme } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Replaces the prototype's blocking confirm(); used for the hidden-Iodine warning. */
export function ConfirmModal({ visible, title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <SectionLabel style={{ color: theme.red }}>Caution</SectionLabel>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.row}>
            <PaperButton label={cancelLabel} variant="outline" style={{ flex: 1 }} onPress={onCancel} />
            <PaperButton label={confirmLabel} variant="danger" style={{ flex: 1 }} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,36,48,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: theme.paper, borderWidth: 1, borderLeftWidth: 4, borderColor: theme.ink, borderLeftColor: theme.red, padding: 20, width: '100%', maxWidth: 360 },
  title: { fontFamily: fonts.serif, fontSize: 18, fontWeight: '700', color: theme.ink, marginTop: 2, marginBottom: 6 },
  body: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 14, color: theme.textDim, lineHeight: 20, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 10 },
});
