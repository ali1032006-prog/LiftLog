import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { photoUrl } from '@/lib/photos';
import { PressableScale } from './motion';
import { spacing, radius } from '@/constants/theme';
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
  const photos = (Array.isArray(card.photos) ? card.photos : []) as string[];
  return (
    <PressableScale onPress={onPress} pressedScale={0.98} accessibilityRole="button">
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

        {photos.length > 0 ? (
          <View>
            <Image source={{ uri: photoUrl('workout-photos', photos[0]!) }} style={styles.photo} contentFit="cover" transition={150} />
            {photos.length > 1 ? (
              <View style={styles.photoCount}>
                <Ionicons name="images-outline" size={12} color="#FFFFFF" />
                <Txt variant="small" style={{ color: '#FFFFFF', fontWeight: '700' }}>{photos.length}</Txt>
              </View>
            ) : null}
          </View>
        ) : null}

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
    </PressableScale>
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
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  photoCount: {
    position: 'absolute', right: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  exerciseList: { gap: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm },
}));
