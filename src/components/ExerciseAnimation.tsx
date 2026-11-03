import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { radius, spacing } from '@/constants/theme';
import { exerciseMedia, type ExerciseMedia } from '@/data/exerciseMedia';
import { makeStyles } from '@/hooks/useTheme';
import { t } from '@/i18n';
import { animateTo, enterFade, enterPop } from './motion';
import { Button, Txt } from './ui';

/** How long each of the two photos stays on screen before switching (ms). */
const FRAME_MS = 1000;

type Props = {
  name: string;
  size: number;
  /** Tap to open a large preview. Leave off inside rows that are already pressable. */
  expandable?: boolean;
};

/** Shows an exercise's photos; two photos alternate like a short animation. Renders nothing for exercises without photos. */
export function ExerciseAnimation({ name, size, expandable = false }: Props) {
  const media = exerciseMedia(name);
  const [open, setOpen] = useState(false);
  if (!media) return null;

  const frames = <Frames images={media.frames} size={size} />;
  if (!expandable) return frames;
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('Show how to do {name}', { name })}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        {frames}
      </Pressable>
      <ExercisePreview name={name} media={media} visible={open} onClose={() => setOpen(false)} />
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

function ExercisePreview({ name, media, visible, onClose }: { name: string; media: ExerciseMedia; visible: boolean; onClose: () => void }) {
  const styles = useStyles();
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={enterFade} style={styles.backdrop}>
        <Pressable style={styles.fill} onPress={onClose} accessibilityLabel={t('Close')} />
        <Animated.View entering={enterPop} style={styles.box}>
          <Txt variant="h3" numberOfLines={2}>{name}</Txt>
          <Frames images={media.frames} size={280} />
          <Txt variant="small" style={{ textAlign: 'center' }}>{t('Photos: {credit}', { credit: media.credit })}</Txt>
          <Button title={t('Close')} variant="secondary" onPress={onClose} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  frame: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#fff' },
  top: { position: 'absolute', top: 0, left: 0 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  box: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, maxWidth: 340, width: '100%',
  },
}));
