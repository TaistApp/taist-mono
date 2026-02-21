import {Text, TouchableOpacity, View} from 'react-native';
import {styles} from '../styles';
 import {getFormattedDateTime} from '../../../../utils/validations';
import {IMessage, IUser} from '../../../../types/index';
import {GetOrderString, getImageURL} from '../../../../utils/functions';
import StyledProfileImage from '../../../../components/styledProfileImage';

type Props = {
  testID?: string;
  lastMsg: IMessage;
  user?: IUser;
  self?: IUser;
  openChat: () => void;
};

const InboxRecord = ({testID, lastMsg, user, self, openChat}: Props) => {
  return (
    <TouchableOpacity testID={testID} accessible={false} style={styles.container} onPress={openChat}>
      <View>
        <StyledProfileImage url={getImageURL(user?.photo)} size={70} />
      </View>

      <View style={{flex: 1}}>
        <View style={styles.rowBetween}>
          <Text style={styles.nameText} numberOfLines={1}>
            {`${user?.first_name} `}
            <Text
              style={styles.orderText}
              numberOfLines={1}>{`(${GetOrderString(
              lastMsg.order_id ?? 0,
            )}) `}</Text>
          </Text>

          {!lastMsg.is_viewed && (
            <View style={styles.unreadBage}>
              {/* <Text style={styles.bageText}>{2}</Text> */}
            </View>
          )}
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.msgText} numberOfLines={1}>
            {lastMsg.message}
          </Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.timeText}>
            {getFormattedDateTime((lastMsg.created_at ?? 0) * 1000)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default InboxRecord;
