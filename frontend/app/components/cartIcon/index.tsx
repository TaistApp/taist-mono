import { faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAppSelector } from '../../hooks/useRedux';
import { navigate } from '../../utils/navigation';
import { styles } from './styles';

const CartIcon: React.FC = () => {
  const orders = useAppSelector(x => x.customer.orders);
  
  // Calculate total items in cart
  const totalItems = orders.reduce((sum, order) => sum + (order.amount || 0), 0);

  const handlePress = () => {
    navigate.toCustomer.cart();
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <FontAwesomeIcon icon={faShoppingCart} size={20} color="#000000" />
      {totalItems > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default CartIcon;

