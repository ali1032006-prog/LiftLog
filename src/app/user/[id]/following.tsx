import { useLocalSearchParams } from 'expo-router';
import { UserList } from '@/components/UserList';
import { useFollowing } from '@/hooks/queries';

export default function FollowingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useFollowing(id);
  return <UserList users={q.data} loading={q.isLoading} error={q.error} emptyTitle="Not following anyone yet" />;
}
