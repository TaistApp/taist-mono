import { Text, View } from 'react-native';
import { IMenu, IOrder } from '../../../../types/index';
import { ConvertStringToNumberArr } from '../../../../utils/functions';
import { styles } from '../styles';

type Props = {
  menu: IMenu;
  order: IOrder;
};

const OrderItem = (props: Props) => {
  const customizations = props.menu.customizations;
  const addons = ConvertStringToNumberArr(props.order.addons ?? '');
  var names_customizations: Array<string> = [];
  customizations?.map((c, idx) => {
    if (addons.includes(c.id ?? 0)) {
      names_customizations.push(c.name ?? '');
    }
  });
  return (
    <View style={styles.checkoutSummaryItemWrapper}>
      <View style={{flex: 1}}>
        <Text style={styles.checkoutSummaryItemTitle}>{props.menu.title}</Text>
        {names_customizations.length > 0 && (
          <Text style={styles.checkoutSummaryItemAddon} numberOfLines={1}>
            {`Add-ons: ${names_customizations.join(' & ')} `}
          </Text>
        )}
        {props.order.notes && props.order.notes.length > 0 && (
          <Text
            style={styles.checkoutSummaryItemAddon}
            numberOfLines={1}>{`Special Instructions: ${props.order.notes} `}</Text>
        )}
      </View>
      <View style={styles.checkoutSummaryItemPriceWrapper}>
        <Text style={styles.checkoutSummaryItemTitle} numberOfLines={1}>
          {`${props.order.amount} `}
        </Text>
        <Text
          style={styles.checkoutSummaryItemTitle}
          numberOfLines={1}>{`$${props.order.total_price?.toFixed(2)} `}</Text>
      </View>
    </View>
  );
};

export default OrderItem;
