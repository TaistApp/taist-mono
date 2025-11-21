import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import StyledButton from '../../../components/styledButton';
import Container from '../../../layout/Container';
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';
import { removeCustomerOrders } from '../../../reducers/customerSlice';
import { getImageURL } from '../../../utils/functions';
import { ShowInfoToast } from '../../../utils/toast';
import { styles } from './styles';
import EmptyListView from '../../../components/emptyListView/emptyListView';

const Cart = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const orders = useAppSelector(x => x.customer.orders);
  const menus = useAppSelector(x => x.table.menus);
  const users = useAppSelector(x => x.table.users);

  // Group orders by chef
  const groupedOrders = useMemo(() => {
    const groups: { [chefId: number]: typeof orders } = {};
    orders.forEach(order => {
      const chefId = order.chef_user_id ?? 0;
      if (!groups[chefId]) {
        groups[chefId] = [];
      }
      groups[chefId].push(order);
    });
    return groups;
  }, [orders]);

  const handleRemoveChefOrders = (chefId: number) => {
    dispatch(removeCustomerOrders(chefId));
    ShowInfoToast('Items removed from cart');
  };

  const handleCheckout = (chefId: number) => {
    const chefOrders = orders.filter(o => o.chef_user_id === chefId);
    const chefInfo = users.find(u => u.id === chefId);
    
    if (!chefInfo) {
      ShowInfoToast('Chef information not found');
      return;
    }

    router.push({
      pathname: '/screens/customer/(tabs)/(home)/checkout',
      params: {
        chefInfo: JSON.stringify(chefInfo),
        orders: JSON.stringify(chefOrders),
        weekDay: new Date().getDay().toString(),
        chefProfile: JSON.stringify({}),
      }
    });
  };

  const getTotalPrice = (chefOrders: typeof orders) => {
    return chefOrders.reduce((sum, order) => sum + (order.total_price ?? 0), 0);
  };

  if (orders.length === 0) {
    return (
      <SafeAreaView style={styles.main}>
        <Container backMode={true} title="CART">
          <EmptyListView
            img={require('../../../assets/images/orders_empty.png')}
            title="Your cart is empty"
            subTitle="Add items from chefs to get started"
          />
        </Container>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.main}>
      <Container backMode={true} title="CART">
        <ScrollView contentContainerStyle={styles.pageView}>
          {Object.entries(groupedOrders).map(([chefId, chefOrders]) => {
            const chef = users.find(u => u.id === Number(chefId));
            const totalPrice = getTotalPrice(chefOrders);

            return (
              <View key={chefId} style={styles.chefSection}>
                <View style={styles.chefHeader}>
                  <View style={styles.chefInfo}>
                    {chef?.photo && (
                      <Image
                        source={{ uri: getImageURL(chef.photo) }}
                        style={styles.chefImage}
                      />
                    )}
                    <Text style={styles.chefName}>
                      {chef?.first_name} {chef?.last_name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveChefOrders(Number(chefId))}
                    style={styles.clearButton}>
                    <FontAwesomeIcon icon={faTrash} size={16} color="#fa4616" />
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                </View>

                {chefOrders.map((order, index) => {
                  const menu = menus.find(m => m.id === order.menu_id);
                  
                  return (
                    <View key={`${order.menu_id}-${index}`} style={styles.cartItem}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{menu?.title}</Text>
                        <Text style={styles.itemDescription}>
                          {menu?.description}
                        </Text>
                        {order.notes && order.notes.length > 0 && (
                          <Text style={styles.itemNotes}>Note: {order.notes}</Text>
                        )}
                      </View>
                      <View style={styles.itemRight}>
                        <Text style={styles.quantity}>Qty: {order.amount}</Text>
                        <Text style={styles.price}>
                          ${(order.total_price ?? 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                <View style={styles.chefFooter}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal:</Text>
                    <Text style={styles.totalPrice}>${totalPrice.toFixed(2)}</Text>
                  </View>
                  <StyledButton
                    title="PROCEED TO CHECKOUT"
                    onPress={() => handleCheckout(Number(chefId))}
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>
      </Container>
    </SafeAreaView>
  );
};

export default Cart;

