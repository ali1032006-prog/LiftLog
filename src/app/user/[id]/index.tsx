import { Stack, useLocalSearchParams } from 'expo-router';
import { ProfileView } from '@/components/ProfileView';
import { useProfile } from '@/hooks/queries';

export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useProfile(id);
  return (
    <>
      <Stack.Screen options={{ title: data ? `@${data.username}` : '' }} />
      <ProfileView userId={id} />
    </>
  );
}
