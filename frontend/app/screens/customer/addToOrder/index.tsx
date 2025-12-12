import { TextInput } from '@react-native-material/core';
import { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View
} from 'react-native';

// NPM
import {
  faAngleLeft
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Types & Services
import { IMenu, IOrder, IUser } from '../../../types/index';

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import StyledCheckBox from '../../../components/styledCheckBox';
import Container from '../../../layout/Container';
import { addOrUpdateCustomerOrder } from '../../../reducers/customerSlice';
import { styles } from './styles';

const AddToOrder = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const self = useAppSelector(x => x.user.user);
  const dispatch = useAppDispatch();

  const orderMenu: IMenu = JSON.parse(params.orderMenu as string);
  const chefInfo: IUser = JSON.parse(params.chefInfo as string);

  // Debug: log customizations data
  console.log('AddToOrder - orderMenu.customizations:', JSON.stringify(orderMenu.customizations));

  const [quantity, onChangeQuantity] = useState(1);
  const [orderNotes, onChangeOrderNotes] = useState('');
  const [customizationIds, onChangeCustomizationIds] = useState<Array<number>>(
    [],
  );

  const handleQuantityMinus = () => {
    if (quantity > 1) {
      var quantityTemp = quantity - 1;
      onChangeQuantity(quantityTemp);
    }
  };

  const handleQuantityPlus = () => {
    var quantityTemp = quantity + 1;
    onChangeQuantity(quantityTemp);
  };

  const handleCustomizationCheck = (id: number, newVal: boolean) => {
    var tempIds = [...customizationIds];
    if (newVal) {
      tempIds.push(id);
    } else {
      const index = tempIds.findIndex(x => x == id);
      if (index >= 0) {
        tempIds.splice(index, 1);
      }
    }
    onChangeCustomizationIds(tempIds);
  };

  const handleAddToOrder = () => {
    const order: IOrder = {
      customer_user_id: self.id,
      chef_user_id: chefInfo.id,
      menu_id: orderMenu.id,
      amount: quantity,
      address: self.address,
      addons: customizationIds.join(','),
      notes: orderNotes,
      order_date: new Date().getTime() / 1000,
      total_price: quantity * (orderMenu.price ?? 0) + price_customizations,
    };
    dispatch(addOrUpdateCustomerOrder([order]));
    router.back();
  };

  var price_customizations = 0;
  customizationIds.map((id, idx) => {
    const c = orderMenu.customizations?.find(x => x.id == id);
    if (c) price_customizations += c.upcharge_price ?? 0;
  });

  return (
    <SafeAreaView style={styles.main}>
      <Container>
        <ScrollView contentContainerStyle={styles.pageView}>
          <View style={styles.heading}>
            <Pressable onPress={() => router.back()}>
              <FontAwesomeIcon icon={faAngleLeft} size={20} color="#1a1a1a" />
            </Pressable>
          </View>
          <View style={styles.menuInfo}>
            <View style={styles.menuInfoHeading}>
              <View style={{flex: 1}}>
                <Text style={styles.menuInfoTitle}>{orderMenu.title}</Text>
              </View>

              <View style={{alignItems: 'flex-end'}}>
                <Text style={styles.menuInfoPrice}>
                  {`$${orderMenu.price?.toFixed(2)} `}
                </Text>
                <Text style={styles.menuInfoSize}>
                  {`(${orderMenu.serving_size ?? 0} Person${
                    (orderMenu.serving_size ?? 0) > 1 ? 's' : ''
                  }) `}
                </Text>
              </View>
            </View>
            <Text style={styles.menuInfoDescription}>
              {orderMenu.description}
            </Text>
          </View>
          <View style={styles.orderQuantity}>
            <Text style={styles.orderQuantityLabel}>Quantity: </Text>
            <View style={styles.orderQuantityAction}>
              <Pressable
                style={styles.orderQuantityButton}
                onPress={() => handleQuantityMinus()}>
                <Text style={styles.orderQuantityButtonText}>-</Text>
              </Pressable>
              <Text style={styles.orderQuantityValue}>{quantity}</Text>
              <Pressable
                style={styles.orderQuantityButton}
                onPress={() => handleQuantityPlus()}>
                <Text style={styles.orderQuantityButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
          {orderMenu.customizations && orderMenu.customizations.length > 0 && (
            <View style={styles.orderAddonsWrapper}>
              <Text style={styles.orderAddonsLabel}>Add-ons </Text>
              <View style={styles.orderAddonContainer}>
                {orderMenu.customizations?.map((c, idx) => {
                  const isChecked = customizationIds.includes(c.id ?? 0);
                  return (
                    <StyledCheckBox
                      value={isChecked}
                      onPress={() => {
                        handleCustomizationCheck(c.id ?? 0, !isChecked);
                      }}
                      label={`${c.name} (+$${c.upcharge_price?.toFixed(2)}) `}
                      key={`c_${idx}`}
                    />
                  );
                })}
              </View>
            </View>
          )}
          <View style={styles.vcenter}>
            <TextInput
              style={styles.formFields}
              inputContainerStyle={styles.formFieldsContainer}
              inputStyle={styles.formInputFields}
              placeholder="Enter any Special Instructions "
              placeholderTextColor={'#999999'}
              variant="outlined"
              onChangeText={onChangeOrderNotes}
              value={orderNotes}
              color="#1a1a1a"
            />
          </View>
          <View style={styles.vcenter}>
            <Pressable style={styles.button} onPress={() => handleAddToOrder()}>
              <Text style={styles.buttonText}>{`ADD TO ORDER - $${(
                quantity * (orderMenu.price ?? 0) +
                price_customizations
              ).toFixed(2)} `}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Container>
    </SafeAreaView>
  );
};

export default AddToOrder;
