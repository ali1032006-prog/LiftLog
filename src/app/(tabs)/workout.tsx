import { router } from 'expo-router';
import { View } from 'react-native';
import { AnimatedItem } from '@/components/motion';
import { ActiveWorkoutBanner } from '@/components/ActiveWorkoutBanner';
import { Button, Card, EmptyState, ErrorText, Loading, Row, Screen, Txt } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useDeleteRoutine, usePremium, useRoutines } from '@/hooks/queries';
import { ActionMenu } from '@/components/Popover';
import { useDialog } from '@/components/Dialog';
import { routineToPrefill } from '@/lib/prefill';
import { FREE_ROUTINE_LIMIT, usePaywall } from '@/lib/premium';
import { useActiveWorkout, type Prefill } from '@/store/activeWorkout';
import { makeStyles } from '@/hooks/useTheme';
import { t } from '@/i18n';

export default function WorkoutTab() {
  const styles = useStyles();
  const routines = useRoutines();
  const active = useActiveWorkout((s) => s.workout);
  const start = useActiveWorkout((s) => s.start);
  const { confirm, dialog } = useDialog();
  const { isPremium } = usePremium();
  const openPaywall = usePaywall((s) => s.open);
  const count = routines.data?.length ?? 0;
  const atLimit = !isPremium && count >= FREE_ROUTINE_LIMIT;
  const deleteRoutine = useDeleteRoutine();

  const onDeleteRoutine = async (id: string, title: string) => {
    if (await confirm(t('Delete "{title}"?', { title }), t('This routine will be removed. Workouts you logged from it are kept.'), t('Delete'), true)) {
      deleteRoutine.mutate(id);
    }
  };

  const begin = async (prefill?: Prefill) => {
    if (active) {
      const ok = await confirm(t('Discard current workout?'), t('You already have a workout in progress. Starting a new one will discard it.'), t('Discard'), true);
      if (!ok) {
        router.push('/workout/active');
        return;
      }
    }
    start(prefill);
    router.push('/workout/active');
  };

  return (
    <Screen scroll contentStyle={{ paddingTop: spacing.md, gap: spacing.lg }}>
      {dialog}
      <ActiveWorkoutBanner />

      <View style={{ gap: spacing.sm }}>
        <Txt variant="label">{t('Quick start')}</Txt>
        <Button title={t('Start Empty Workout')} icon="add" onPress={() => begin()} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="label">
            {isPremium ? t('Routines ({count})', { count }) : t('Routines ({count}/{max})', { count, max: FREE_ROUTINE_LIMIT })}
          </Txt>
          <Button
            small
            variant="ghost"
            title={t('New routine')}
            icon={atLimit ? 'lock-closed' : 'add'}
            onPress={() => (atLimit ? openPaywall('routines') : router.push('/routine/new'))}
          />
        </Row>

        {atLimit ? (
          <Txt variant="small">
            {t('The free plan saves up to {max} routines. Delete one, or go Premium for unlimited routines.', { max: FREE_ROUTINE_LIMIT })}
          </Txt>
        ) : null}
        {routines.isLoading ? <Loading /> : null}
        {routines.error ? <ErrorText>{routines.error.message}</ErrorText> : null}
        {routines.data?.length === 0 ? (
          <EmptyState
            icon="list-outline"
            title={t('No routines yet')}
            subtitle={t("Save a routine to start the same workout again in one tap, or copy one from a friend's profile.")}
          />
        ) : null}

        {routines.data?.map((r, i) => (
          <AnimatedItem key={r.id} index={i}>
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="h3" style={{ flex: 1 }} numberOfLines={1}>{r.title}</Txt>
                <ActionMenu
                  accessibilityLabel={t('Options for {title}', { title: r.title })}
                  actions={[
                    { label: t('Edit'), icon: 'create-outline', onPress: () => router.push(`/routine/${r.id}`) },
                    { label: t('Delete'), icon: 'trash-outline', danger: true, onPress: () => onDeleteRoutine(r.id, r.title) },
                  ]}
                />
              </Row>
              <Txt variant="muted" numberOfLines={2}>
                {r.routine_exercises.length === 0
                  ? t('No exercises')
                  : r.routine_exercises.map((re) => `${re.routine_sets.length} × ${re.exercise.name}`).join(', ')}
              </Txt>
              <Button small title={t('Start Routine')} onPress={() => begin(routineToPrefill(r))} style={styles.startButton} />
            </Card>
          </AnimatedItem>
        ))}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  startButton: { alignSelf: 'flex-start', marginTop: spacing.xs },
}));
