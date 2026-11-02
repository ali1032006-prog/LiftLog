import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { maxContentWidth, radius, spacing } from '@/constants/theme';
import { EQUIPMENT_LIST, LIBRARY_EXERCISES, type Equipment, type MuscleGroup } from '@/data/exercises';
import { useExercises } from '@/hooks/queries';
import { asUnit, type WeightUnit } from '@/lib/units';
import { usePreferences } from '@/store/preferences';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { PressableScale } from './motion';
import { Button, Input, Row, Txt } from './ui';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** unit: the weight unit you last used for this exercise (kg if never used). */
  onPick: (name: string, unit: WeightUnit) => void;
};

type Category = 'Legs' | 'Arms' | 'Chest' | 'Back' | 'Others';
const CATEGORIES: Category[] = ['Legs', 'Arms', 'Chest', 'Back', 'Others'];
const CATEGORY_OF: Record<MuscleGroup, Category> = {
  Quadriceps: 'Legs', Hamstrings: 'Legs', Glutes: 'Legs', Calves: 'Legs', Adductors: 'Legs', Abductors: 'Legs',
  Biceps: 'Arms', Triceps: 'Arms', Forearms: 'Arms',
  Chest: 'Chest',
  Back: 'Back', Traps: 'Back', 'Lower Back': 'Back',
  Shoulders: 'Others', Abs: 'Others', 'Full Body': 'Others', Neck: 'Others',
};

type PickerItem = { key: string; name: string; muscle?: MuscleGroup; equipment?: Equipment; custom: boolean };

const LIBRARY_ITEMS: PickerItem[] = LIBRARY_EXERCISES.map((e) => ({
  key: `lib:${e.name}`,
  name: e.name,
  muscle: e.muscle,
  equipment: e.equipment,
  custom: false,
}));
const LIBRARY_NAMES = new Set(LIBRARY_EXERCISES.map((e) => e.name.toLowerCase()));

/** Pick from the built-in exercise library or your own custom exercises, or create a new one. */
export function ExercisePicker({ visible, onClose, onPick }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const { data: mine = [] } = useExercises();

  const allItems = useMemo(() => {
    const custom: PickerItem[] = mine
      .filter((e) => !LIBRARY_NAMES.has(e.name.toLowerCase()))
      .map((e) => ({ key: `own:${e.id}`, name: e.name, custom: true }));
    return [...custom, ...LIBRARY_ITEMS];
  }, [mine]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const words = q.split(/\s+/).filter(Boolean);
    return allItems.filter((item) => {
      // Custom exercises have no muscle tag, so they live under Others.
      if (category && (item.muscle ? CATEGORY_OF[item.muscle] : 'Others') !== category) return false;
      if (equipment && item.equipment !== equipment) return false;
      if (words.length === 0) return true;
      const hay = `${item.name} ${item.muscle ?? ''} ${item.equipment ?? ''}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [allItems, q, category, equipment]);

  const exactExists = q.length > 0 && allItems.some((i) => i.name.toLowerCase() === q);

  const close = () => {
    setQuery('');
    setCategory(null);
    setEquipment(null);
    onClose();
  };

  const pick = (name: string) => {
    const own = mine.find((e) => e.name.toLowerCase() === name.toLowerCase());
    onPick(name, own ? asUnit(own.weight_unit) : usePreferences.getState().defaultUnit);
    close();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} presentationStyle="pageSheet">
      <View style={[styles.sheet, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom }]}>
        <View style={styles.inner}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h2">Add exercise</Txt>
            <Button small variant="ghost" title="Close" onPress={close} />
          </Row>
          <Input
            autoFocus
            placeholder="Search exercises, e.g. incline dumbbell"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="done"
          />

          <ChipRow
            label="Categories"
            options={CATEGORIES}
            value={category}
            onChange={setCategory}
          />
          <ChipRow
            label="Equipment"
            options={EQUIPMENT_LIST}
            value={equipment}
            onChange={setEquipment}
          />

          {query.trim() && !exactExists ? (
            <Pressable onPress={() => pick(query.trim())} style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}>
              <Ionicons name="add-circle" size={22} color={colors.accent} />
              <Txt style={{ color: colors.accent, fontWeight: '600', flex: 1 }}>Create custom exercise “{query.trim()}”</Txt>
            </Pressable>
          ) : null}

          <FlatList
            data={filtered}
            keyExtractor={(i) => i.key}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={30}
            ListHeaderComponent={
              <Txt variant="small" style={{ paddingVertical: spacing.xs }}>
                {filtered.length} exercise{filtered.length === 1 ? '' : 's'}
              </Txt>
            }
            renderItem={({ item }) => (
              <Pressable onPress={() => pick(item.name)} style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}>
                <View style={styles.iconWrap}>
                  <Ionicons name={item.custom ? 'person-outline' : 'barbell-outline'} size={18} color={colors.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt>{item.name}</Txt>
                  <Txt variant="small">{item.custom ? 'Custom exercise' : `${item.muscle} · ${item.equipment}`}</Txt>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <Txt variant="muted" style={{ paddingVertical: spacing.lg, textAlign: 'center' }}>
                No matches. Clear a filter, or type a name to create a custom exercise.
              </Txt>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: T[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
      <PressableScale onPress={() => onChange(null)} style={[styles.chip, value === null && styles.chipActive]}>
        <Txt variant="small" style={{ color: value === null ? colors.accentText : colors.text, fontWeight: '600' }}>All {label.toLowerCase()}</Txt>
      </PressableScale>
      {options.map((o) => {
        const active = value === o;
        return (
          <PressableScale key={o} onPress={() => onChange(active ? null : o)} style={[styles.chip, active && styles.chipActive]}>
            <Txt variant="small" style={{ color: active ? colors.accentText : colors.text, fontWeight: '600' }}>{o}</Txt>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  sheet: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt,
  },
  chips: { gap: spacing.xs, paddingVertical: 2 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
}));
