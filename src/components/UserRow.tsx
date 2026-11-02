import { StyleSheet, View } from 'react-native';
import { PressableScale } from './motion';
import { spacing } from '@/constants/theme';
import type { ProfileSummaryRow } from '@/lib/types';
import { Avatar, Button, Row, Txt } from './ui';
import { makeStyles } from '@/hooks/useTheme';

type Props = {
  user: ProfileSummaryRow;
  isMe?: boolean;
  onPress?: () => void;
  onToggleFollow?: (follow: boolean) => void;
  pending?: boolean;
};

export function UserRow({ user, isMe, onPress, onToggleFollow, pending }: Props) {
  const styles = useStyles();
  return (
    <PressableScale onPress={onPress} pressedScale={0.98} style={styles.row}>
      <Row style={{ flex: 1 }}>
        <Avatar name={user.display_name || user.username} url={user.avatar_url} size={44} />
        <View style={{ flex: 1 }}>
          <Txt variant="h3" numberOfLines={1}>{user.display_name || user.username}</Txt>
          <Txt variant="small" numberOfLines={1}>
            @{user.username} · {user.follower_count} follower{user.follower_count === 1 ? '' : 's'}
          </Txt>
        </View>
      </Row>
      {!isMe && onToggleFollow ? (
        <Button
          small
          title={user.is_following ? 'Following' : 'Follow'}
          variant={user.is_following ? 'secondary' : 'primary'}
          loading={pending}
          onPress={() => onToggleFollow(!user.is_following)}
        />
      ) : null}
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
}));
