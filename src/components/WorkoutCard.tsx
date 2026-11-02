import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { spacing } from '@/constants/theme';
import { formatDuration, timeAgo } from '@/lib/format';
import type { WorkoutCard as WorkoutCardType, WorkoutCardExercise } from '@/lib/types';
import { asUnit, formatVolume, formatWeight } from '@/lib/units';
import { Avatar, Card, Row, Txt } from './ui';
import { makeStyles, useTheme } from '@/hooks/useTheme';

type Props = {
  card: WorkoutCardType;
  showUser?: boolean;
  onPress?: () => void;
  onPressUser?: () => void;
};

const MAX_EXERCISES = 4;

export function WorkoutCard({ card, showUser = true, onPress, onPressUser }: Props) {
  const styles = useStyles();
  const exercises = (Array.isArray(card.exercises) ? card.exercises : []) as unknown as WorkoutCardExercise[];
  const extra = exercises.length - MAX_EXERCISES;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.8 }}>
      <Card>
        {showUser ? (
          <Pressable onPress={onPressUser} disabled={!onPressUser}>
            <Row>
              <Avatar name={card.display_name || card.username} url={card.avatar_url} size={36} />
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{card.display_name || card.username}</Txt>
                <Txt variant="small">@{card.username} · {timeAgo(card.started_at)}</Txt>
              </View>
            </Row>
          </Pressable>
        ) : (
          <Txt variant="small">{timeAgo(card.started_at)}</Txt>
        )}

        <Txt variant="h2">{card.title}</Txt>
        {card.notes ? <Txt variant="muted" numberOfLines={2}>{card.notes}</Txt> : null}

        <Row style={{ gap: spacing.lg }}>
          <Stat icon="time-outline" label={formatDuration(card.duration_seconds)} />
          <Stat icon="barbell-outline" label={formatVolume(card.total_volume_kg, asUnit(card.volume_unit))} />
          <Stat icon="checkmark-done-outline" label={`${card.set_count ?? 0} sets`} />
        </Row>

        {exercises.length > 0 ? (
          <View style={styles.exerciseList}>
            {exercises.slice(0, MAX_EXERCISES).map((e, i) => (
              <Row key={`${e.name}-${i}`} style={{ justifyContent: 'space-between' }}>
                <Txt numberOfLines={1} style={{ flex: 1 }}>
                  {e.set_count} × {e.name}
                </Txt>
                {e.best_weight_kg != null ? (
                  <Txt variant="muted">
                    {formatWeight(e.best_weight_kg, asUnit(e.weight_unit))}{e.best_reps != null ? ` × ${e.best_reps}` : ''}
                  </Txt>
                ) : null}
              </Row>
            ))}
            {extra > 0 ? <Txt variant="small">+{extra} more exercise{extra === 1 ? '' : 's'}</Txt> : null}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

function Stat({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  const { colors } = useTheme();
  return (
    <Row style={{ gap: 4 }}>
      <Ionicons name={icon} size={15} color={colors.muted} />
      <Txt variant="muted">{label}</Txt>
    </Row>
  );
}

const useStyles = makeStyles((colors) => ({
  exerciseList: { gap: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm },
}));
