import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { photoUrl } from '@/lib/photos';
import { PressableScale } from './motion';
import { Txt } from './ui';
import { t } from '@/i18n';

type Props = {
  /** Paths inside the workout-photos bucket. */
  paths: string[];
  size?: number;
  onAdd?: () => void;
  onRemove?: (path: string) => void;
  uploading?: boolean;
};

/** Horizontal row of workout photos with an optional "Add photo" tile and remove buttons. */
export function PhotoStrip({ paths, size = 96, onAdd, onRemove, uploading }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  if (paths.length === 0 && !onAdd) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
      {paths.map((p) => (
        <View key={p} style={{ width: size, height: size }}>
          <Image source={{ uri: photoUrl('workout-photos', p) }} style={[styles.photo, { width: size, height: size }]} contentFit="cover" transition={150} />
          {onRemove ? (
            <PressableScale onPress={() => onRemove(p)} style={styles.remove} accessibilityRole="button" accessibilityLabel={t('Remove photo')} hitSlop={6}>
              <Ionicons name="close" size={14} color="#FFFFFF" />
            </PressableScale>
          ) : null}
        </View>
      ))}
      {uploading ? (
        <View style={[styles.tile, { width: size, height: size }]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}
      {onAdd && !uploading ? (
        <PressableScale onPress={onAdd} style={[styles.tile, { width: size, height: size }]} accessibilityRole="button" accessibilityLabel={t('Add photo')}>
          <Ionicons name="camera-outline" size={24} color={colors.accent} />
          <Txt variant="small" style={{ color: colors.accent, fontWeight: '600' }}>{t('Add photo')}</Txt>
        </PressableScale>
      ) : null}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  photo: { borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  tile: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
