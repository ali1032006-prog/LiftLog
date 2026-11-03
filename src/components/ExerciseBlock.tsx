import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { parseWeightInput, weightInputValue, type WeightUnit } from '@/lib/units';
import { PressableScale, SegmentedControl } from './motion';
import { RestTimePicker } from './RestTimePicker';
import { ExerciseAnimation } from './ExerciseAnimation';
import { Card, IconButton, Row, Txt } from './ui';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { t } from '@/i18n';

export type EditableSet = { id: string; weightKg: number | null; reps: number | null; completed?: boolean };
export type EditableExercise = { id: string; name: string; notes: string; restSeconds: number; unit: WeightUnit; sets: EditableSet[] };

type Props = {
  exercise: EditableExercise;
  index: number;
  /** When provided, sets get a completion checkbox (active workout mode). */
  onToggleSet?: (setId: string) => void;
  onChangeSet: (setId: string, patch: Partial<Pick<EditableSet, 'weightKg' | 'reps'>>) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onRemove: () => void;
  onChangeNotes: (notes: string) => void;
  onChangeRest: (seconds: number) => void;
  onChangeUnit: (unit: WeightUnit) => void;
};

export function ExerciseBlock({
  exercise, index, onToggleSet, onChangeSet, onAddSet, onRemoveSet, onRemove, onChangeNotes, onChangeRest, onChangeUnit,
}: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const unit = exercise.unit;

  return (
    <Card style={{ gap: spacing.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ flex: 1 }}>
          <View style={styles.badge}><Txt variant="small" style={{ color: colors.text }}>{index + 1}</Txt></View>
          <ExerciseAnimation name={exercise.name} size={48} expandable editable />
          <Txt variant="h3" style={{ flex: 1 }} numberOfLines={2}>{exercise.name}</Txt>
        </Row>
        <IconButton name="trash-outline" color={colors.muted} size={20} onPress={onRemove} accessibilityLabel={t('Remove exercise')} />
      </Row>

      <TextInput
        placeholder={t('Add notes for this exercise…')}
        placeholderTextColor={colors.faint}
        value={exercise.notes}
        onChangeText={onChangeNotes}
        style={styles.notes}
        multiline
      />

      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <RestTimePicker value={exercise.restSeconds} onChange={onChangeRest} />
        <SegmentedControl
          small
          options={[{ value: 'kg', label: t('kg') }, { value: 'lb', label: t('lb') }]}
          value={unit}
          onChange={(u) => onChangeUnit(u as WeightUnit)}
        />
      </Row>

      <View style={{ gap: spacing.xs }}>
        <Row style={styles.headerRow}>
          <Txt variant="label" style={styles.colSet}>{t('Set')}</Txt>
          <Txt variant="label" style={styles.colInput}>{t(unit)}</Txt>
          <Txt variant="label" style={styles.colInput}>{t('Reps')}</Txt>
          <View style={styles.colAction} />
        </Row>
        {exercise.sets.map((s, i) => (
          <SetRow
            key={`${s.id}-${unit}`}
            set={s}
            index={i}
            unit={unit}
            onToggle={onToggleSet ? () => onToggleSet(s.id) : undefined}
            onChange={(patch) => onChangeSet(s.id, patch)}
            onRemove={() => onRemoveSet(s.id)}
          />
        ))}
      </View>

      <PressableScale onPress={onAddSet} style={styles.addSet} accessibilityRole="button">
        <Ionicons name="add" size={18} color={colors.text} />
        <Txt style={{ fontWeight: '600' }}>{t('Add Set')}</Txt>
      </PressableScale>
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
        onChangeText={(v) => { setWeightText(v); onChange({ weightKg: parseWeightInput(v, unit) }); }}
        selectTextOnFocus
      />
      <TextInput
        style={[styles.cell, styles.colInput]}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="0"
        placeholderTextColor={colors.faint}
        value={repsText}
        onChangeText={(v) => {
          const digits = v.replace(/[^0-9]/g, '');
          setRepsText(digits);
          onChange({ reps: digits ? Number(digits) : null });
        }}
        selectTextOnFocus
      />
      <Row style={[styles.colAction, { justifyContent: 'flex-end', gap: 2 }]}>
        {onToggle ? (
          <PressableScale onPress={onToggle} hitSlop={6} pressedScale={0.85} style={[styles.check, done && styles.checkDone]} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={t('Set {n} done', { n: index + 1 })}>
            <Ionicons name="checkmark" size={18} color={done ? colors.successText : colors.muted} />
          </PressableScale>
        ) : null}
        <IconButton name="close" size={18} color={colors.faint} onPress={onRemove} accessibilityLabel={t('Remove set {n}', { n: index + 1 })} />
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
    paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt,
  },
}));
