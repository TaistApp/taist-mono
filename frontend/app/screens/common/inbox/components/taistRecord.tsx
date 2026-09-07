import { Image } from 'expo-image';
import { Text, TouchableOpacity, View } from 'react-native';

import { getFormattedDateTime } from '../../../../utils/validations';
import { styles } from '../styles';

type Props = {
  testID?: string;
  /** Preview text — the most recent Taist notification, if there is one. */
  lastMessage?: string;
  /** Notification timestamp string; omitted when there are none yet. */
  lastMessageAt?: string;
  unreadCount: number;
  onPress: () => void;
};

/**
 * Taist's own thread, pinned to the top of the inbox. Notifications used to
 * live behind a separate bell icon in the header; they now arrive here as
 * messages from Taist so there is a single place to check.
 */
const TaistRecord = ({
  testID,
  lastMessage,
  lastMessageAt,
  unreadCount,
  onPress,
}: Props) => (
  <TouchableOpacity
    testID={testID}
    accessible={false}
    style={styles.container}
    onPress={onPress}>
    <View style={styles.taistAvatar}>
      <Image
        source={require('../../../../assets/images/app_icon.png')}
        style={styles.taistAvatarImage}
        contentFit="cover"
      />
    </View>

    <View style={{ flex: 1 }}>
      <View style={styles.rowBetween}>
        <Text style={styles.nameText} numberOfLines={1}>
          Taist
        </Text>
        {unreadCount > 0 && (
          <View testID="chatInbox.taistUnread" style={styles.unreadBage} />
        )}
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.msgText} numberOfLines={1}>
          {lastMessage ?? 'Order updates and news from Taist'}
        </Text>
      </View>
      {!!lastMessageAt && (
        <View style={styles.rowBetween}>
          <Text style={styles.timeText}>
            {getFormattedDateTime(lastMessageAt)}
          </Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);

export default TaistRecord;
