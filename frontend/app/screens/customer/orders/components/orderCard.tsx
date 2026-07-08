import { getImageURL } from '@/app/utils/functions';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { IOrder, IUser } from '../../../../types/index';
import { OrderStatus } from '../../../../types/status';
import { getFormattedDate, getFormattedDateTime } from '../../../../utils/validations';
import { styles } from '../styles';

type Props = {
  testID?: string;
  orderInfo: IOrder;
  chefInfo: IUser;
  onPress: () => void;
};
const OrderCard = (props: Props) => {
  return (
    <TouchableOpacity testID={props.testID} accessible={false} onPress={() => props.onPress()} style={styles.orderCard}>
      <View style={styles.orderCardMain}>
        <View>
            <Image
            source={{uri: getImageURL(props.chefInfo.photo)}}
            style={styles.orderCardImg}                         
             />
        </View>
        <View style={styles.orderCardInfo}>
          <Text style={styles.orderCardTitle}>
            {getFormattedDateTime((props.orderInfo.order_date ?? 0) * 1000)}
          </Text>
          <Text style={styles.orderCardDescription}>
            {`Order - ${getFormattedDate(
              (props.orderInfo.order_date ?? 0) * 1000,
            )} `}
          </Text>
          <Text style={styles.orderCardDescription}>
            {OrderStatus[props.orderInfo.status ?? 0]}
          </Text>
          <Text
            style={
              styles.orderCardDescription
            }>{`Order total $${props.orderInfo.total_price?.toFixed(
            2,
          )} `}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default OrderCard;
