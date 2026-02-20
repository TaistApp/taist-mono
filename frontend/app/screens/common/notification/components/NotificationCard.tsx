import { Image, StyleSheet, Text, View } from 'react-native';
import { Photo_URL } from '../../../../services/api';

interface INotificationCard {
  title: string;
  body: string;
  customer_image?: string;
  time: string;
}
const NotificationCard = ({
  title,
  body,
  customer_image,
  time,
}: INotificationCard) => {
  function timeAgo(timestamp: string): string {
    // console.log(timestamp);

    const now = new Date();
    const date = new Date(timestamp);
    const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);
    const intervals: {[key: string]: number} = {
      year: 365 * 24 * 60 * 60,
      month: 30 * 24 * 60 * 60,
      week: 7 * 24 * 60 * 60,
      day: 24 * 60 * 60,
      hour: 60 * 60,
      minute: 60,
    };
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const amount = Math.floor(secondsAgo / secondsInUnit);
      if (amount >= 1) {
        return `${amount}${unit[0]} ago`;
      }
    }
    return `${secondsAgo}s ago`;
  }

  return (
    <View style={styles.container}>
      
      <Image
        source={{
          uri: `${Photo_URL}${customer_image}`,
        }}
        style={{
          height: 50,
          width: 50,
          resizeMode: 'cover',
          borderRadius: 50,
        }}
      />
      <View>
        <View style={styles.nameAndTimeContainer}>
          <Text style={[styles.body, {fontWeight: '500'}]}>{title}</Text>
          <Text style={[styles.body, {color: '#FA4616',marginEnd: 14}]}>{timeAgo(time)}</Text>
        </View>
        <Text style={styles.bodyx} numberOfLines={7} ellipsizeMode='clip'>{body}</Text>
      </View>
    </View>
  );
};
export default NotificationCard;
const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 10,
    overflow: 'hidden',
  },
  titleText: {
    color: '#FA4616',
    fontSize: 20,
    fontWeight: '500',
  },
  body: {
    color: '#000000',
    fontSize: 16,
    overflow: 'scroll',
  },
  bodyx: {
    width: 300,
    color: '#000000',
    fontSize: 16,
    overflow: 'scroll',
    paddingEnd:14,
  },
  nameAndTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 30,
  },
});
