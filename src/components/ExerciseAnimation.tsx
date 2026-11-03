import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { radius, spacing } from '@/constants/theme';
import { exerciseMedia } from '@/data/exerciseMedia';
import { isLibraryExercise } from '@/data/exercises';
import { MAX_EXERCISE_PHOTOS, useAddExercisePhoto, useExercises, useRemoveExercisePhoto } from '@/hooks/queries';
import { useAuth } from '@/hooks/useAuth';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { t } from '@/i18n';
import { photoUrl, pickImage, uploadPhoto } from '@/lib/photos';
import { animateTo, enterFade, enterPop } from './motion';
import { Button, ErrorText, Row, Txt } from './ui';

/** How long each of the two photos stays on screen before switching (ms). */
const FRAME_MS = 1000;

type Props = {
  name: string;
  size: number;
  /** Tap to open a large preview. Leave off inside rows that are already pressable. */
  expandable?: boolean;
  /** Photo paths of someone's custom exercise, when showing another person's workout. */
  photoPaths?: string[] | null;
  /** Lets the signed-in user add or remove photos on their own custom exercise. */
  editable?: boolean;
};

type Shown = { frames: string[]; credit: string | null };

/**
 * Shows an exercise's photos; two photos alternate like a short animation. Built-in exercises use
 * the bundled demo photos; custom exercises use photos their creator added. Renders nothing when
 * there are no photos, except on your own custom exercise, where it offers to add one.
 */
export function ExerciseAnimation({ name, size, expandable = false, photoPaths, editable = false }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const { data: mine = [] } = useExercises();

  const library = exerciseMedia(name);
  const custom = !isLibraryExercise(name);
  const canEdit = editable && custom;
  const own = custom ? mine.find((e) => e.name.toLowerCase() === name.trim().toLowerCase()) : undefined;
  const paths = (canEdit ? own?.photo_paths : null) ?? photoPaths ?? own?.photo_paths ?? [];

  const shown: Shown | null = library
    ? { frames: library.frames, credit: library.credit }
    : paths.length > 0
      ? { frames: paths.map((p) => photoUrl('exercise-photos', p)), credit: null }
      : null;

  if (!shown && !canEdit) return null;

  const thumb = shown ? (
    <Frames images={shown.frames} size={size} />
  ) : (
    <View style={[styles.placeholder, { width: size, height: size }]}>
      <Ionicons name="camera-outline" size={Math.round(size * 0.42)} color={colors.muted} />
    </View>
  );
  if (!expandable && !canEdit) return thumb;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={shown ? t('Show how to do {name}', { name }) : t('Add a photo of {name}', { name })}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        {thumb}
      </Pressable>
      {open ? (
        <ExercisePreview
          name={name}
          shown={shown}
          editable={canEdit}
          exerciseId={own?.id}
          paths={paths}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function Frames({ images, size }: { images: string[]; size: number }) {
  const styles = useStyles();
  const second = useSharedValue(0);
  const animated = images.length > 1;

  useEffect(() => {
    if (!animated) return;
    let showSecond = false;
    const id = setInterval(() => {
      showSecond = !showSecond;
      second.value = animateTo(showSecond ? 1 : 0);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [second, animated]);

  const topStyle = useAnimatedStyle(() => ({ opacity: second.value }));
  const box = { width: size, height: size };

  return (
    <View style={[styles.frame, box]}>
      <Image source={images[0]} style={box} contentFit="cover" cachePolicy="memory-disk" transition={0} />
      {animated ? (
        <Animated.View style={[styles.top, box, topStyle]}>
          <Image source={images[1]} style={box} contentFit="cover" cachePolicy="memory-disk" transition={0} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function ExercisePreview({
  name, shown, editable, exerciseId, paths, onClose,
}: {
  name: string;
  shown: Shown | null;
  editable: boolean;
  exerciseId: string | undefined;
  paths: string[];
  onClose: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { session } = useAuth();
  const addPhoto = useAddExercisePhoto();
  const removePhoto = useRemoveExercisePhoto();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = uploading || addPhoto.isPending || removePhoto.isPending;

  const onAdd = async () => {
    const uid = session?.user.id;
    if (!uid) return;
    setError(null);
    try {
      const image = await pickImage({ square: true });
      if (!image) return;
      setUploading(true);
      const path = await uploadPhoto('exercise-photos', uid, image, 800);
      await addPhoto.mutateAsync({ name, path });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  const onRemove = async (path: string) => {
    if (!exerciseId) return;
    setError(null);
    try {
      await removePhoto.mutateAsync({ exerciseId, path, remaining: paths.filter((p) => p !== path) });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={enterFade} style={styles.backdrop}>
        <Pressable style={styles.fill} onPress={onClose} accessibilityLabel={t('Close')} />
        <Animated.View entering={enterPop} style={styles.box}>
          <Txt variant="h3" numberOfLines={2}>{name}</Txt>
          {shown ? (
            <Frames images={shown.frames} size={280} />
          ) : (
            <View style={[styles.placeholder, { width: 280, height: 200 }]}>
              <Ionicons name="images-outline" size={48} color={colors.muted} />
            </View>
          )}
          {shown?.credit ? <Txt variant="small" style={{ textAlign: 'center' }}>{t('Photos: {credit}', { credit: shown.credit })}</Txt> : null}

          {editable ? (
            <>
              <Txt variant="small" style={{ textAlign: 'center' }}>
                {t('Add up to {max} photos, like the start and end of the move. Anyone who sees your workouts can see them.', { max: MAX_EXERCISE_PHOTOS })}
              </Txt>
              {paths.length > 0 ? (
                <Row style={{ gap: spacing.sm }}>
                  {paths.map((p) => (
                    <View key={p}>
                      <Image source={photoUrl('exercise-photos', p)} style={styles.small} contentFit="cover" />
                      <Pressable
                        onPress={() => onRemove(p)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={t('Remove photo')}
                        hitSlop={6}
                        style={styles.removeBadge}
                      >
                        <Ionicons name="close" size={14} color="#fff" />
                      </Pressable>
                    </View>
                  ))}
                </Row>
              ) : null}
              {busy ? <ActivityIndicator color={colors.accent} /> : null}
              {error ? <ErrorText>{error}</ErrorText> : null}
              {paths.length < MAX_EXERCISE_PHOTOS ? (
                <Button title={t('Add photo')} icon="camera-outline" onPress={onAdd} disabled={busy} style={{ alignSelf: 'stretch' }} />
              ) : null}
            </>
          ) : null}

          <Button title={t('Close')} variant="secondary" onPress={onClose} style={{ alignSelf: 'stretch' }} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  frame: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#fff' },
  top: { position: 'absolute', top: 0, left: 0 },
  placeholder: {
    borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  small: { width: 64, height: 64, borderRadius: radius.sm },
  removeBadge: {
    position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
  },
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  box: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, maxWidth: 340, width: '100%',
  },
}));
