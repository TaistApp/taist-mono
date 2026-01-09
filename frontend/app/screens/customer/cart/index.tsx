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
import { getImageURL, formatDisplayName } from '../../../utils/functions';
import { ShowInfoToast } from '../../../utils/toast';
import { styles } from './styles';
import EmptyListView from '../../../components/emptyListView/emptyListView';
import { GetChefProfileAPI } from '../../../services/api';
import { showLoading, hideLoading } from '../../../reducers/loadingSlice';

const Cart = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const orders = useAppSelector(x => x.customer.orders);
  const selectedDate = useAppSelector(x => x.customer.selectedDate);
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

  const handleCheckout = async (chefId: number) => {
    const chefOrders = orders.filter(o => o.chef_user_id === chefId);
    const chefInfo = users.find(u => u.id === chefId);

    if (!chefInfo) {
      ShowInfoToast('Chef information not found');
      return;
    }

    // Fetch the chef's profile to get their working days/times
    dispatch(showLoading());
    try {
      console.log('[CART] Fetching chef profile for chefId:', chefId);
      const profileResp = await GetChefProfileAPI({ user_id: chefId });
      console.log('[CART] Chef profile response:', JSON.stringify(profileResp));
      const chefProfile = profileResp.success === 1 ? profileResp.data : {};
      console.log('[CART] Passing chefProfile to checkout:', JSON.stringify(chefProfile));

      dispatch(hideLoading());

      router.push({
        pathname: '/screens/customer/(tabs)/(home)/checkout',
        params: {
          chefInfo: JSON.stringify(chefInfo),
          orders: JSON.stringify(chefOrders),
          weekDay: new Date().getDay().toString(),
          chefProfile: JSON.stringify(chefProfile),
          selectedDate: selectedDate || '',
        }
      });
    } catch (error) {
      dispatch(hideLoading());
      console.error('[CART] Error fetching chef profile:', error);
      // Still navigate, just with empty profile (will use weekDay fallback)
      router.push({
        pathname: '/screens/customer/(tabs)/(home)/checkout',
        params: {
          chefInfo: JSON.stringify(chefInfo),
          orders: JSON.stringify(chefOrders),
          weekDay: new Date().getDay().toString(),
          chefProfile: JSON.stringify({}),
          selectedDate: selectedDate || '',
        }
      });
    }
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
            subTitle="Add items from a chef to fill your cart."
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
                      {formatDisplayName(chef?.first_name, chef?.last_name)}
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

                  // Get add-on names from order.addons (comma-separated IDs)
                  const addonNames: string[] = [];
                  if (order.addons && order.addons.length > 0) {
                    const addonIds = order.addons.split(',').map(id => parseInt(id.trim()));
                    addonIds.forEach(id => {
                      const customization = menu?.customizations?.find(c => c.id === id);
                      if (customization?.name) {
                        addonNames.push(customization.name);
                      }
                    });
                  }

                  return (
                    <View key={`${order.menu_id}-${index}`} style={styles.cartItem}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{menu?.title}</Text>
                        <Text style={styles.itemDescription}>
                          {menu?.description}
                        </Text>
                        {addonNames.length > 0 && (
                          <Text style={styles.itemAddons}>
                            Add-ons: {addonNames.join(' & ')}
                          </Text>
                        )}
                        {order.notes && order.notes.length > 0 && (
                          <Text style={styles.itemNotes}>Special Instructions: {order.notes}</Text>
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

