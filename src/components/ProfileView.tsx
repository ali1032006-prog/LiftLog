import { router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, maxContentWidth, spacing } from '@/constants/theme';
import { useFollowMutation, useProfile, useUserWorkouts } from '@/hooks/queries';
import { useAuth } from '@/hooks/useAuth';
import { WorkoutCard } from './WorkoutCard';
import { Avatar, Button, EmptyState, ErrorText, Loading, Row, Stat, Txt } from './ui';

/** Instagram-style profile: header with counts + the user's workouts. Used by the Account tab and other users' pages. */
export function ProfileView({ userId, headerExtra }: { userId: string; headerExtra?: React.ReactNode }) {
  const { session, unit } = useAuth();
  const isMe = session?.user.id === userId;
  const profile = useProfile(userId);
  const workouts = useUserWorkouts(userId);
  const follow = useFollowMutation(session?.user.id);
  const insets = useSafeAreaInsets();

  const items = workouts.data?.pages.flat() ?? [];
  const refresh = useCallback(() => {
    void profile.refetch();
    void workouts.refetch();
  }, [profile, workouts]);

  if (profile.isLoading) return <Loading />;
  if (profile.error || !profile.data) {
    return (
      <View style={{ padding: spacing.xl }}>
        <ErrorText>{profile.error?.message ?? 'Profile not found'}</ErrorText>
      </View>
    );
  }
  const p = profile.data;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xxl }]}
      data={items}
      keyExtractor={(c) => c.workout_id ?? ''}
      refreshControl={<RefreshControl refreshing={workouts.isRefetching} onRefresh={refresh} tintColor={colors.muted} />}
      onEndReached={() => workouts.hasNextPage && !workouts.isFetchingNextPage && workouts.fetchNextPage()}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <View style={styles.header}>
          <Row style={{ gap: spacing.lg }}>
            <Avatar name={p.display_name || p.username} url={p.avatar_url} size={80} />
            <Row style={{ flex: 1, justifyContent: 'space-around' }}>
              <Stat value={p.workout_count} label="Workouts" />
              <Pressable onPress={() => router.push(`/user/${userId}/followers`)}>
                <Stat value={p.follower_count} label="Followers" />
              </Pressable>
              <Pressable onPress={() => router.push(`/user/${userId}/following`)}>
                <Stat value={p.following_count} label="Following" />
              </Pressable>
            </Row>
          </Row>
          <View>
            <Txt variant="h2">{p.display_name || p.username}</Txt>
            <Txt variant="muted">@{p.username}</Txt>
            {p.bio ? <Txt style={{ marginTop: spacing.xs }}>{p.bio}</Txt> : null}
          </View>
          {isMe ? (
            <Button variant="secondary" title="Edit profile" icon="create-outline" onPress={() => router.push('/settings')} />
          ) : (
            <Button
              title={p.is_following ? 'Following' : 'Follow'}
              variant={p.is_following ? 'secondary' : 'primary'}
              loading={follow.isPending}
              onPress={() => follow.mutate({ userId, follow: !p.is_following })}
            />
          )}
          {follow.error ? <ErrorText>{follow.error.message}</ErrorText> : null}
          {headerExtra}
          <Txt variant="label" style={{ marginTop: spacing.sm }}>Workouts</Txt>
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ marginBottom: spacing.md }}>
          <WorkoutCard card={item} unit={unit} showUser={false} onPress={() => router.push(`/workout/${item.workout_id}`)} />
        </View>
      )}
      ListEmptyComponent={
        workouts.isLoading ? (
          <Loading />
        ) : (
          <EmptyState
            icon="barbell-outline"
            title={isMe ? 'No workouts yet' : 'No workouts yet'}
            subtitle={isMe ? 'Start one from the Workout tab and it will show up here.' : undefined}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', paddingHorizontal: spacing.lg },
  header: { gap: spacing.md, paddingVertical: spacing.lg },
});
