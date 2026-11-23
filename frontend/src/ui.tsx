import type { ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
  type TextInputProps,
} from 'react-native';
import type { ActionState, QueryState } from './state';

export const colors = {
  page: '#F3F5F1', card: '#FFFFFF', ink: '#152723', muted: '#4D625B',
  brand: '#194D3B', accent: '#DCEED9', border: '#CFD9D0', danger: '#922D35',
};

export function Heading({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="header" style={styles.heading}>{children}</Text>;
}

export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>;
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function Button({ label, onPress, variant = 'secondary', disabled = false, selected }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [
        styles.button, variant === 'primary' && styles.primary, variant === 'danger' && styles.danger,
        selected && styles.selected, disabled && styles.disabled, pressed && styles.pressed,
      ]}
    >
      <Text style={[
        styles.buttonText, variant === 'primary' && styles.white, variant === 'danger' && styles.error,
      ]}>{selected ? '✓ ' + label : label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props} accessibilityLabel={label} placeholderTextColor={colors.muted}
        style={[styles.input, props.multiline && styles.multiline, props.style]}
      />
    </View>
  );
}

export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <Text accessibilityLiveRegion="polite" accessibilityRole={error ? 'alert' : undefined}
    style={[styles.notice, error && styles.errorNotice]}>{children}</Text>;
}

export function QueryStatus({ query, label = 'Reintentar consulta', disabled }: {
  query: QueryState; label?: string; disabled?: boolean;
}) {
  if (query.loading) return <View style={styles.row}><ActivityIndicator color={colors.brand} /><Body>Cargando…</Body></View>;
  if (!query.error) return null;
  return <>
    <Notice error>{query.error}</Notice>
    <Button label={label} disabled={disabled} onPress={() => { void query.refresh().catch(() => {}); }} />
  </>;
}

export function ActionStatus({ action }: { action: ActionState }) {
  return <>
    {action.busy && <Body muted>En curso…</Body>}
    {action.feedback && <Notice error={action.feedback.tone === 'error'}>{action.feedback.text}</Notice>}
    {action.needsCheck && <Button label="Consultar estado" disabled={action.busy} onPress={action.check} />}
  </>;
}

export const styles = StyleSheet.create({
  heading: { color: colors.ink, fontSize: 28, fontWeight: '800' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  body: { color: colors.ink, fontSize: 16, lineHeight: 23 },
  muted: { color: colors.muted },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  field: { gap: 5 },
  label: { fontSize: 15, fontWeight: '700', color: colors.ink },
  input: { minHeight: 48, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, fontSize: 16, color: colors.ink, backgroundColor: colors.card },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  button: { minHeight: 46, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  primary: { backgroundColor: colors.brand, borderColor: colors.brand },
  danger: { borderColor: '#DCA5AA', backgroundColor: '#FFF5F5' },
  selected: { backgroundColor: colors.accent, borderColor: colors.brand },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.75 },
  buttonText: { fontSize: 15, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  white: { color: '#FFFFFF' },
  error: { color: colors.danger },
  notice: { padding: 12, borderRadius: 9, backgroundColor: colors.accent, color: colors.ink, fontSize: 16 },
  errorNotice: { color: colors.danger, backgroundColor: '#FCE9EB' },
});
