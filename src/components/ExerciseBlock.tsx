import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { parseWeightInput, weightInputValue, type WeightUnit } from '@/lib/units';
import { Card, IconButton, Row, Txt } from './ui';
import { makeStyles, useTheme } from '@/hooks/useTheme';

export type EditableSet = { id: string; weightKg: number | null; reps: number | null; completed?: boolean };
export type EditableExercise = { id: string; name: string; notes: string; restSeconds: number; sets: EditableSet[] };

type Props = {
  exercise: EditableExercise;
  index: number;
  unit: WeightUnit;
  /** When provided, sets get a completion checkbox (active workout mode). */
  onToggleSet?: (setId: string) => void;
  onChangeSet: (setId: string, patch: Partial<Pick<EditableSet, 'weightKg' | 'reps'>>) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onRemove: () => void;
  onChangeNotes: (notes: string) => void;
  onChangeRest: (seconds: number) => void;
};

const REST_STEPS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];

export function ExerciseBlock({
  exercise, index, unit, onToggleSet, onChangeSet, onAddSet, onRemoveSet, onRemove, onChangeNotes, onChangeRest,
}: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const cycleRest = (dir: 1 | -1) => {
    const i = REST_STEPS.findIndex((s) => s >= exercise.restSeconds);
    const cur = i === -1 ? REST_STEPS.length - 1 : i;
    const next = Math.min(REST_STEPS.length - 1, Math.max(0, cur + dir));
    onChangeRest(REST_STEPS[next]!);
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ flex: 1 }}>
          <View style={styles.badge}><Txt variant="small" style={{ color: colors.text }}>{index + 1}</Txt></View>
          <Txt variant="h3" style={{ flex: 1 }} numberOfLines={2}>{exercise.name}</Txt>
        </Row>
        <IconButton name="trash-outline" color={colors.muted} size={20} onPress={onRemove} />
      </Row>

      <TextInput
        placeholder="Add notes for this exercise…"
        placeholderTextColor={colors.faint}
        value={exercise.notes}
        onChangeText={onChangeNotes}
        style={styles.notes}
        multiline
      />

      <Row style={{ gap: spacing.xs }}>
        <Ionicons name="timer-outline" size={16} color={colors.muted} />
        <Txt variant="muted">Rest timer:</Txt>
        <Pressable onPress={() => cycleRest(-1)} hitSlop={8}><Ionicons name="remove-circle-outline" size={20} color={colors.accent} /></Pressable>
        <Txt style={{ minWidth: 44, textAlign: 'center' }}>{exercise.restSeconds === 0 ? 'Off' : `${exercise.restSeconds}s`}</Txt>
        <Pressable onPress={() => cycleRest(1)} hitSlop={8}><Ionicons name="add-circle-outline" size={20} color={colors.accent} /></Pressable>
      </Row>

      <View style={{ gap: spacing.xs }}>
        <Row style={styles.headerRow}>
          <Txt variant="label" style={styles.colSet}>Set</Txt>
          <Txt variant="label" style={styles.colInput}>{unit}</Txt>
          <Txt variant="label" style={styles.colInput}>Reps</Txt>
          <View style={styles.colAction} />
        </Row>
        {exercise.sets.map((s, i) => (
          <SetRow
            key={s.id}
            set={s}
            index={i}
            unit={unit}
            onToggle={onToggleSet ? () => onToggleSet(s.id) : undefined}
            onChange={(patch) => onChangeSet(s.id, patch)}
            onRemove={() => onRemoveSet(s.id)}
          />
        ))}
      </View>

      <Pressable onPress={onAddSet} style={({ pressed }) => [styles.addSet, pressed && { opacity: 0.6 }]}>
        <Ionicons name="add" size={18} color={colors.text} />
        <Txt style={{ fontWeight: '600' }}>Add Set</Txt>
      </Pressable>
    </Card>
  );
}

function SetRow({
  set, index, unit, onToggle, onChange, onRemove,
}: {
  set: EditableSet;
  index: number;
  unit: WeightUnit;
  onToggle?: () => void;
  onChange: (patch: Partial<Pick<EditableSet, 'weightKg' | 'reps'>>) => void;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  // Keep raw text while typing so "12." or "" does not get reformatted mid-edit.
  const [weightText, setWeightText] = useState(() => weightInputValue(set.weightKg, unit));
  const [repsText, setRepsText] = useState(() => (set.reps == null ? '' : String(set.reps)));
  const done = !!set.completed;

  return (
    <Row style={[styles.setRow, done && styles.setRowDone]}>
      <Txt style={[styles.colSet, { fontWeight: '700', color: colors.muted }]}>{index + 1}</Txt>
      <TextInput
        style={[styles.cell, styles.colInput]}
        keyboardType="decimal-pad"
        inputMode="decimal"
        placeholder="0"
        placeholderTextColor={colors.faint}
        value={weightText}
        onChangeText={(t) => { setWeightText(t); onChange({ weightKg: parseWeightInput(t, unit) }); }}
        selectTextOnFocus
      />
      <TextInput
        style={[styles.cell, styles.colInput]}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="0"
        placeholderTextColor={colors.faint}
        value={repsText}
        onChangeText={(t) => {
          const digits = t.replace(/[^0-9]/g, '');
          setRepsText(digits);
          onChange({ reps: digits ? Number(digits) : null });
        }}
        selectTextOnFocus
      />
      <Row style={[styles.colAction, { justifyContent: 'flex-end', gap: 2 }]}>
        {onToggle ? (
          <Pressable onPress={onToggle} hitSlop={6} style={[styles.check, done && styles.checkDone]}>
            <Ionicons name="checkmark" size={18} color={done ? colors.successText : colors.muted} />
          </Pressable>
        ) : null}
        <IconButton name="close" size={18} color={colors.faint} onPress={onRemove} />
      </Row>
    </Row>
  );
}

const useStyles = makeStyles((colors) => ({
  badge: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  notes: { color: colors.text, fontSize: 14, paddingVertical: 4 },
  headerRow: { paddingHorizontal: spacing.xs },
  colSet: { width: 32, textAlign: 'center' },
  colInput: { flex: 1, textAlign: 'center' },
  colAction: { width: 72 },
  setRow: { paddingVertical: 4, paddingHorizontal: spacing.xs, borderRadius: radius.sm },
  setRowDone: { backgroundColor: colors.successTint },
  cell: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  check: {
    width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  checkDone: { backgroundColor: colors.success, borderColor: colors.success },
  addSet: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surfaceAlt,
  },
}));
