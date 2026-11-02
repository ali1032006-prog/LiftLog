import { useLocalSearchParams } from 'expo-router';
import { UserList } from '@/components/UserList';
import { useFollowing } from '@/hooks/queries';
import { t } from '@/i18n';

export default function FollowingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useFollowing(id);
  return <UserList users={q.data} loading={q.isLoading} error={q.error} emptyTitle={t('Not following anyone yet')} />;
}
