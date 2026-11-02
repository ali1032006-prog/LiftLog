import { useState } from 'react';
import { View } from 'react-native';
import { UserList } from '@/components/UserList';
import { Input, Txt } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useSearchProfiles, useSuggestedProfiles } from '@/hooks/queries';

export default function SearchScreen() {
  const [q, setQ] = useState('');
  const searching = q.trim().length > 0;
  const results = useSearchProfiles(q);
  const suggested = useSuggestedProfiles();
  const list = searching ? results : suggested;

  return (
    <UserList
      users={list.data}
      loading={list.isLoading}
      error={list.error}
      emptyTitle={searching ? 'No one found' : 'No suggestions yet'}
      emptySubtitle={searching ? 'Try a different username.' : 'When more people join, they will show up here.'}
      header={
        <View style={{ paddingVertical: spacing.md, gap: spacing.md }}>
          <Input
            autoFocus
            placeholder="Search by username or name"
            value={q}
            onChangeText={setQ}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          <Txt variant="label">{searching ? 'Results' : 'Suggested for you'}</Txt>
        </View>
      }
    />
  );
}
