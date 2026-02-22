import { Text, TouchableOpacity, View } from 'react-native';
import StyledProfileImage from '../../../../components/styledProfileImage';
import { IOrder, IUser } from '../../../../types/index';
import { OrderStatus } from '../../../../types/status';
import { GetOrderString, getImageURL } from '../../../../utils/functions';
import { styles } from '../styles';

type Props = {
  testID?: string;
  info: IOrder;
  customer: IUser;
  onPress: () => void;
};

const ChefOrderCard = (props: Props) => {
  console.log('props', JSON.stringify(props));
  
  // Add safety checks to prevent undefined values
  const customerName = props.customer?.first_name || 'Unknown';
  const orderId = props.info?.id ?? 0;
  const totalPrice = props.info?.total_price ?? 0;
  const orderStatus = props.info?.status ?? 0;
  
  return (
    <TouchableOpacity testID={props.testID} accessible={false} onPress={props.onPress} style={styles.orderCard}>
      <View style={styles.orderCardMain}>
        <StyledProfileImage url={getImageURL(props.customer?.photo)} size={80} />
        <View style={styles.orderCardInfo}>
          <Text style={styles.orderCardTitle}>
            {customerName}
          </Text>
          <Text style={styles.orderCardDescription}>
            {`Order #: ${GetOrderString(orderId)}`}
          </Text>
          <Text style={styles.orderCardDescription}>
            {`Total: $${totalPrice.toFixed(2)}`}
          </Text>
          <Text style={styles.orderCardDescription}>
            {`Status: ${OrderStatus[orderStatus] || 'Unknown'}`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ChefOrderCard;
