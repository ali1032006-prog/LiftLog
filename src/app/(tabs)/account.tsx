import { ProfileView } from '@/components/ProfileView';
import { Loading } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export default function AccountTab() {
  const { session } = useAuth();
  if (!session) return <Loading />;
  return <ProfileView userId={session.user.id} />;
}
