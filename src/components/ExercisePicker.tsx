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
import Animated from 'react-native-reanimated';
import { enterSheet, PressableScale } from './motion';
import { ExerciseAnimation } from './ExerciseAnimation';
import { exerciseMedia } from '@/data/exerciseMedia';
import { Button, Input, Row, Txt } from './ui';
import { t, tn } from '@/i18n';

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
    <Modal visible={visible} animationType="none" transparent onRequestClose={close}>
      <Animated.View entering={enterSheet} style={[styles.sheet, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom }]}>
        <View style={styles.inner}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h2">{t('Add exercise')}</Txt>
            <Button small variant="ghost" title={t('Close')} onPress={close} />
          </Row>
          <Input
            autoFocus
            placeholder={t('Search exercises, e.g. incline dumbbell')}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="done"
          />

          <ChipRow
            allLabel={t('All categories')}
            options={CATEGORIES}
            value={category}
            onChange={setCategory}
          />
          <ChipRow
            allLabel={t('All equipment')}
            options={EQUIPMENT_LIST}
            value={equipment}
            onChange={setEquipment}
          />

          {query.trim() && !exactExists ? (
            <Pressable onPress={() => pick(query.trim())} style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}>
              <Ionicons name="add-circle" size={22} color={colors.accent} />
              <Txt style={{ color: colors.accent, fontWeight: '600', flex: 1 }}>{t('Create custom exercise “{name}”', { name: query.trim() })}</Txt>
            </Pressable>
          ) : null}

          <FlatList
            data={filtered}
            keyExtractor={(i) => i.key}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={30}
            ListHeaderComponent={
              <Txt variant="small" style={{ paddingVertical: spacing.xs }}>
                {tn(filtered.length, '{count} exercise', '{count} exercises')}
              </Txt>
            }
            renderItem={({ item }) => (
              <Pressable onPress={() => pick(item.name)} style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}>
                {!item.custom && exerciseMedia(item.name) ? (
                  <ExerciseAnimation name={item.name} size={44} />
                ) : (
                  <View style={styles.iconWrap}>
                    <Ionicons name={item.custom ? 'person-outline' : 'barbell-outline'} size={18} color={colors.muted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Txt>{item.name}</Txt>
                  <Txt variant="small">{item.custom ? t('Custom exercise') : `${t(item.muscle ?? '')} · ${t(item.equipment ?? '')}`}</Txt>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <Txt variant="muted" style={{ paddingVertical: spacing.lg, textAlign: 'center' }}>
                {t('No matches. Clear a filter, or type a name to create a custom exercise.')}
              </Txt>
            }
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

function ChipRow<T extends string>({
  allLabel,
  options,
  value,
  onChange,
}: {
  allLabel: string;
  options: T[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
      <PressableScale onPress={() => onChange(null)} style={[styles.chip, value === null && styles.chipActive]}>
        <Txt variant="small" style={{ color: value === null ? colors.accentText : colors.text, fontWeight: '600' }}>{allLabel}</Txt>
      </PressableScale>
      {options.map((o) => {
        const active = value === o;
        return (
          <PressableScale key={o} onPress={() => onChange(active ? null : o)} style={[styles.chip, active && styles.chipActive]}>
            <Txt variant="small" style={{ color: active ? colors.accentText : colors.text, fontWeight: '600' }}>{t(o)}</Txt>
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
    width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt,
  },
  // Keep the chip rows at full height when the list below is long.
  chipScroll: { flexGrow: 0, flexShrink: 0 },
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
