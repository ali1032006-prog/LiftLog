import { useLocalSearchParams } from 'expo-router';
import { UserList } from '@/components/UserList';
import { useFollowers } from '@/hooks/queries';

export default function FollowersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useFollowers(id);
  return <UserList users={q.data} loading={q.isLoading} error={q.error} emptyTitle="No followers yet" />;
}
