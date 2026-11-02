import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { maxContentWidth, spacing } from '@/constants/theme';
import { useFollowMutation } from '@/hooks/queries';
import { useAuth } from '@/hooks/useAuth';
import type { ProfileSummaryRow } from '@/lib/types';
import { UserRow } from './UserRow';
import { EmptyState, ErrorText, Loading } from './ui';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { t } from '@/i18n';

type Props = {
  users: ProfileSummaryRow[] | undefined;
  loading?: boolean;
  error?: Error | null;
  emptyTitle: string;
  emptySubtitle?: string;
  header?: React.ReactElement;
};

export function UserList({ users, loading, error, emptyTitle, emptySubtitle, header }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { session } = useAuth();
  const follow = useFollowMutation(session?.user.id);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
      data={users ?? []}
      keyExtractor={(u) => u.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <UserRow
          user={item}
          isMe={item.id === session?.user.id}
          pending={pendingId === item.id && follow.isPending}
          onPress={() => (item.id === session?.user.id ? router.push('/(tabs)/account') : router.push(`/user/${item.id}`))}
          onToggleFollow={(f) => {
            setPendingId(item.id);
            follow.mutate({ userId: item.id, follow: f });
          }}
        />
      )}
      ListEmptyComponent={
        loading ? <Loading /> : error ? <ErrorText>{t(error.message)}</ErrorText> : <EmptyState icon="people-outline" title={emptyTitle} subtitle={emptySubtitle} />
      }
    />
  );
}

const useStyles = makeStyles((colors) => ({
  list: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, flexGrow: 1 },
}));
