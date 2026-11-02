import { StyleSheet, View } from 'react-native';
import { PressableScale } from './motion';
import { spacing } from '@/constants/theme';
import type { ProfileSummaryRow } from '@/lib/types';
import { Avatar, Button, Row, Txt } from './ui';
import { makeStyles } from '@/hooks/useTheme';
import { t, tc, tn } from '@/i18n';

type Props = {
  user: ProfileSummaryRow;
  isMe?: boolean;
  onPress?: () => void;
  onToggleFollow?: (follow: boolean) => void;
  pending?: boolean;
};

/** Label for the Follow button once you follow someone ("Following" as a state, not the list title). */
export function followingButtonLabel(): string {
  return tc('button', 'Following');
}

export function UserRow({ user, isMe, onPress, onToggleFollow, pending }: Props) {
  const styles = useStyles();
  return (
    <PressableScale onPress={onPress} pressedScale={0.98} style={styles.row}>
      <Row style={{ flex: 1 }}>
        <Avatar name={user.display_name || user.username} url={user.avatar_url} size={44} />
        <View style={{ flex: 1 }}>
          <Txt variant="h3" numberOfLines={1}>{user.display_name || user.username}</Txt>
          <Txt variant="small" numberOfLines={1}>
            @{user.username} · {tn(user.follower_count, '{count} follower', '{count} followers')}
          </Txt>
        </View>
      </Row>
      {!isMe && onToggleFollow ? (
        <Button
          small
          title={user.is_following ? followingButtonLabel() : t('Follow')}
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
