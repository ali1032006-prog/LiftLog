import { router } from 'expo-router';
import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActiveWorkoutBanner } from '@/components/ActiveWorkoutBanner';
import { WorkoutCard } from '@/components/WorkoutCard';
import { Button, EmptyState, ErrorText, Loading } from '@/components/ui';
import { maxContentWidth, spacing } from '@/constants/theme';
import { useFeed } from '@/hooks/queries';
import { useAuth } from '@/hooks/useAuth';
import { makeStyles, useTheme } from '@/hooks/useTheme';

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { session } = useAuth();
  const feed = useFeed();
  const insets = useSafeAreaInsets();
  const items = feed.data?.pages.flat() ?? [];

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xxl }]}
      data={items}
      keyExtractor={(c) => c.workout_id ?? ''}
      refreshControl={<RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => { void feed.refetch(); }} tintColor={colors.muted} />}
      onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage()}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={<ActiveWorkoutBanner />}
      renderItem={({ item }) => (
        <View style={{ marginBottom: spacing.md }}>
          <WorkoutCard
            card={item}
            onPress={() => router.push(`/workout/${item.workout_id}`)}
            onPressUser={() =>
              item.user_id === session?.user.id ? router.push('/(tabs)/account') : router.push(`/user/${item.user_id}`)
            }
          />
        </View>
      )}
      ListEmptyComponent={
        feed.isLoading ? (
          <Loading />
        ) : feed.error ? (
          <View style={{ padding: spacing.lg }}><ErrorText>{feed.error.message}</ErrorText></View>
        ) : (
          <EmptyState
            icon="people-outline"
            title="Your feed is empty"
            subtitle="Log a workout or follow people to see their training here."
          >
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              <Button small title="Find people" icon="search" onPress={() => router.push('/search')} />
              <Button small variant="secondary" title="Start workout" onPress={() => router.push('/(tabs)/workout')} />
            </View>
          </EmptyState>
        )
      }
    />
  );
}

const useStyles = makeStyles((colors) => ({
  list: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexGrow: 1 },
}));
