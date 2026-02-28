import {Text, TouchableOpacity, View} from 'react-native';
import {styles} from '../styles';
import {IOrder, IUser} from '../../../../types/index';
import StyledProfileImage from '../../../../components/styledProfileImage';
import {getImageURL, GetOrderString} from '../../../../utils/functions';
import {OrderStatus} from '../../../../types/status';

type Props = {
  testID?: string;
  info: IOrder;
  customer: IUser;
  onPress: () => void;
};

const ChefOrderCard = (props: Props) => {
  console.log('-------->>>>>>>',JSON.stringify(props));
  return (
    <TouchableOpacity testID={props.testID} accessible={false} onPress={props.onPress} style={styles.orderCard}>
      <View style={styles.orderCardMain}>
        <StyledProfileImage url={getImageURL(props.customer.photo)} size={80} />
        <View style={styles.orderCardInfo}>
          <Text
            style={
              styles.orderCardTitle
              // @ts-ignore
            }>{`${props.customer?.first_name} `}</Text>
          <Text style={styles.orderCardDescription}>
            {`Order #: ${GetOrderString(props.info.id ?? 0)} `}
          </Text>
          <Text style={styles.orderCardDescription}>
            {`Total: $${(props.info.total_price ?? 0).toFixed(2)} `}
          </Text>
          <Text style={styles.orderCardDescription}>
            {`Status: ${OrderStatus[props.info.status ?? 0]} `}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ChefOrderCard;
