import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, maxContentWidth, spacing } from '@/constants/theme';
import { useExercises } from '@/hooks/queries';
import { Button, Input, Row, Txt } from './ui';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (name: string) => void;
};

/** Search the user's own exercises or create a new one by name. */
export function ExercisePicker({ visible, onClose, onPick }: Props) {
  const [query, setQuery] = useState('');
  const { data: exercises = [], isLoading } = useExercises();
  const insets = useSafeAreaInsets();

  const q = query.trim();
  const filtered = useMemo(() => {
    if (!q) return exercises;
    const lower = q.toLowerCase();
    return exercises.filter((e) => e.name.toLowerCase().includes(lower));
  }, [exercises, q]);
  const exactExists = exercises.some((e) => e.name.toLowerCase() === q.toLowerCase());

  const pick = (name: string) => {
    onPick(name);
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={[styles.sheet, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom }]}>
        <View style={styles.inner}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h2">Add exercise</Txt>
            <Button small variant="ghost" title="Close" onPress={onClose} />
          </Row>
          <Input
            autoFocus
            placeholder="Search or type a new exercise…"
            value={query}
            onChangeText={setQuery}
            returnKeyType="done"
            onSubmitEditing={() => q && pick(q)}
          />
          {q && !exactExists ? (
            <Pressable onPress={() => pick(q)} style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}>
              <Ionicons name="add-circle" size={22} color={colors.accent} />
              <Txt style={{ color: colors.accent, fontWeight: '600' }}>Create “{q}”</Txt>
            </Pressable>
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(e) => e.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable onPress={() => pick(item.name)} style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}>
                <Ionicons name="barbell-outline" size={20} color={colors.muted} />
                <Txt>{item.name}</Txt>
              </Pressable>
            )}
            ListEmptyComponent={
              isLoading ? undefined : (
                <Txt variant="muted" style={{ paddingVertical: spacing.lg, textAlign: 'center' }}>
                  {exercises.length === 0
                    ? 'No exercises yet. Type a name above to create your first one.'
                    : 'No matches. Type a name to create a new exercise.'}
                </Txt>
              )
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, gap: spacing.md },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
