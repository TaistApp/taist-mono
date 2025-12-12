import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// NPM
import { faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useLocalSearchParams } from 'expo-router';

// Types & Services
import {
  IChefProfile,
  IOrder,
  IPayment,
  IUser,
} from '../../../types/index';

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import { useStripe } from '@stripe/stripe-react-native';
import moment, { Moment } from 'moment';
import StyledSwitch from '../../../components/styledSwitch';
import StyledTabButton from '../../../components/styledTabButton';
import { AddressCollectionModal } from '../../../components/AddressCollectionModal';
import DiscountCodeInput from '../../../components/DiscountCodeInput';
import Container from '../../../layout/Container';
import { removeCustomerOrders } from '../../../reducers/customerSlice';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import {
  AddPaymentMethodAPI,
  CreateOrderAPI,
  CreatePaymentIntentAPI,
  GetAvailableTimeslotsAPI,
  GetPaymentMethodAPI,
  UpdateUserAPI,
  ValidateDiscountCodeAPI,
} from '../../../services/api';
import GlobalStyles from '../../../types/styles';
import { Delay } from '../../../utils/functions';
import { goBack, navigate } from '../../../utils/navigation';
import { ShowErrorToast, ShowSuccessToast } from '../../../utils/toast';
import { getFormattedDateTime } from '../../../utils/validations';
import CustomCalendar from './components/customCalendar';
import OrderItem from './components/orderItem';
import { styles } from './styles';
import { getApplianceById } from '../../../constants/appliances';

const Checkout = () => {
  const self = useAppSelector(x => x.user.user);
  const menus = useAppSelector(x => x.table.menus);
  const dispatch = useAppDispatch();
  const {initPaymentSheet, presentPaymentSheet, createToken} = useStripe();

  const params = useLocalSearchParams();
  const orders: Array<IOrder> = params.orders ? JSON.parse(params.orders as string) : [];
  const chefInfo: IUser = params.chefInfo ? JSON.parse(params.chefInfo as string) : {};
  const weekDay: number = params.weekDay ? parseInt(params.weekDay as string) : 0;
  const chefProfile: IChefProfile = params.chefProfile ? JSON.parse(params.chefProfile as string) : {};

  const [DAY, onChangeDay] = useState(moment());
  const [times, onChangeTimes] = useState<Array<any>>([]);
  const [timeId, onChangeTimeId] = useState('1');
  const [appliance, onChangeAppliance] = useState(false);
  const [paymentMethod, onChangePaymentMethod] = useState<IPayment>({});
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Discount code state
  const [discountCode, setDiscountCode] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    discount_amount: number;
    final_amount: number;
  } | null>(null);
  const [discountError, setDiscountError] = useState<string>('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  // Determine which days the chef works based on their profile
  // A day is "working" if the _start value is > 0 (not "0" or 0 or null/undefined)
  const getChefWorkingDays = (): number[] => {
    const workingDays: number[] = [];
    // moment.js weekdays: 0=Sunday, 1=Monday, ..., 6=Saturday
    // Values can be strings or numbers, so convert to number and check > 0
    if (Number(chefProfile.sunday_start) > 0) workingDays.push(0);
    if (Number(chefProfile.monday_start) > 0) workingDays.push(1);
    if (Number(chefProfile.tuesday_start) > 0) workingDays.push(2);
    if (Number(chefProfile.wednesday_start) > 0) workingDays.push(3);
    if (Number(chefProfile.thursday_start) > 0) workingDays.push(4);
    if (Number(chefProfile.friday_start) > 0) workingDays.push(5);
    if (Number(chefProfile.saterday_start) > 0) workingDays.push(6);

    console.log('[CHECKOUT] chefProfile:', JSON.stringify(chefProfile));
    console.log('[CHECKOUT] Working days calculated:', workingDays, 'fallback weekDay:', weekDay);

    return workingDays.length > 0 ? workingDays : [weekDay]; // Fallback to passed weekDay
  };

  const chefWorkingDays = getChefWorkingDays();
  console.log('[CHECKOUT] Final chefWorkingDays:', chefWorkingDays);

  // Simple date range: today to 1 month from now
  const startDate = moment().startOf('day');
  const endDate = moment().add(1, 'months').endOf('day');

  var price_total = 0;
  orders.map((o, idx) => {
    price_total += o.total_price ?? 0;
  });
  
  // Calculate final total with discount
  const calculateFinalTotal = () => {
    if (appliedDiscount) {
      return appliedDiscount.final_amount;
    }
    return price_total;
  };

  useEffect(() => {
    addTimes();
    getPaymentMethod();

    // Find the first available working day starting from today
    const findFirstWorkingDay = () => {
      const today = moment().startOf('day');
      for (let i = 0; i < 30; i++) {
        const checkDate = today.clone().add(i, 'days');
        if (chefWorkingDays.includes(checkDate.weekday())) {
          return checkDate;
        }
      }
      return today; // Fallback
    };
    onChangeDay(findFirstWorkingDay());

    // Check if user has address, if not show modal
    if (!self.address || !self.city || !self.state || !self.zip) {
      setShowAddressModal(true);
    }
  }, []);

  // Refetch time slots when the selected date changes
  useEffect(() => {
    addTimes();
  }, [DAY]);

  const handleSaveAddress = async (addressInfo: Partial<IUser>) => {
    dispatch(showLoading());
    try {
      const updatedUser = { ...self, ...addressInfo };
      const resp = await UpdateUserAPI(updatedUser, dispatch);
      
      if (resp.success === 1) {
        setShowAddressModal(false);
        ShowSuccessToast('Address saved successfully!');
      } else {
        ShowErrorToast(resp.message ?? resp.error ?? 'Failed to save address');
      }
    } catch (error) {
      ShowErrorToast('An error occurred while saving your address');
      console.error('Save address error:', error);
    } finally {
      dispatch(hideLoading());
    }
  };

  /**
   * TMA-011 REVISED: Fetch available timeslots from backend
   * Backend handles all filtering logic:
   * - Checks overrides vs weekly schedule
   * - Applies 3-hour minimum
   * - Filters cancelled days
   */
  const addTimes = async () => {
    if (!chefInfo?.id) {
      onChangeTimes([]);
      return;
    }

    const selectedDate = DAY.format('YYYY-MM-DD');

    try {
      // Call backend endpoint - it returns pre-filtered time slots
      const resp = await GetAvailableTimeslotsAPI(chefInfo.id, selectedDate);
      console.log('[DEBUG] addTimes response:', JSON.stringify(resp), 'for date:', selectedDate, 'chefId:', chefInfo.id);

      if (resp.success === 1 && resp.data) {
        // Convert backend time strings (HH:MM) to frontend time objects
        const timeslots = resp.data.map((timeStr: string, index: number) => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const timeLabel = moment()
            .hour(hours)
            .minute(minutes)
            .format('hh:mm a');

          return {
            id: (index + 1).toString(),
            label: timeLabel + ' ',
            h: hours,
            m: minutes,
          };
        });

        onChangeTimes(timeslots);
      } else {
        // No timeslots available (chef cancelled or no times within 3 hours)
        onChangeTimes([]);
      }
    } catch (error) {
      console.error('[TMA-011] Error fetching timeslots:', error);
      onChangeTimes([]);
    }
  };

  const getPaymentMethod = async () => {
    const resp = await GetPaymentMethodAPI();
    if (resp.success == 1) {
      const data = resp.data.find((x: IPayment) => x.active == 1);
      onChangePaymentMethod(data);
    }
  };

  const handleDayPress = async (day: moment.Moment) => {
    await Delay(10);
    onChangeDay(day);
  };

  const handleCreditCard = () => {
    console.log('handleCreditCard: Navigating to credit card screen with callback');
    navigate.toCustomer.creditCard(handleAddPaymentCard);
  };

  const handleAddPaymentCard = async (details: any) => {
    console.log('handleAddPaymentCard called with details:', details);
    if (details.complete !== true) {
      ShowErrorToast('Please input the card information correctly');
      return;
    }
    console.log('Creating payment token...');
    dispatch(showLoading());
    const resp_card = await createToken({
      type: 'Card',
      name: `${self.first_name} ${self.last_name}`,
      currency: 'usd',
    });
    if (resp_card.error) {
      dispatch(hideLoading());
      ShowErrorToast(resp_card.error.message);
      return;
    }

    console.log('Adding payment method via API...');
    const resp = await AddPaymentMethodAPI({
      ...details,
      token: resp_card.token.card?.id,
      payment_token: resp_card.token.id,
    });
    dispatch(hideLoading());
    if (resp.success == 1) {
      console.log('Payment method added successfully');
      const data = resp.data.find((x: IPayment) => x.active == 1);
      onChangePaymentMethod(data);
      ShowSuccessToast('Added Successfully!');
    } else {
      console.log('Payment method failed:', resp.error ?? resp.message);
      ShowErrorToast(resp.error ?? resp.message);
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError('Please enter a discount code');
      return;
    }

    setIsValidatingCode(true);
    setDiscountError('');

    try {
      const response = await ValidateDiscountCodeAPI({
        code: discountCode.toUpperCase(),
        order_amount: price_total,
      });

      if (response.success === 1) {
        setAppliedDiscount(response.data);
        ShowSuccessToast(
          `${response.data.code} applied! You saved $${response.data.discount_amount.toFixed(2)}`
        );
      } else {
        setDiscountError(response.error || 'Invalid code');
        setAppliedDiscount(null);
      }
    } catch (error) {
      setDiscountError('Failed to validate code');
      setAppliedDiscount(null);
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleRemoveDiscount = () => {
    setDiscountCode('');
    setAppliedDiscount(null);
    setDiscountError('');
  };

  const handleCheckout = () => {
    if (paymentMethod == undefined) {
      ShowErrorToast('Please add a payment method');
      return;
    }
    const day = moment(DAY);
    const time = times.find(x => x.id == timeId);

    if (time == undefined) {
      ShowErrorToast('Please select a time for the order');
      return;
    }

    day.hour(time?.h);
    day.minute(time?.m);

    // if (day < moment()) {
    //   ShowErrorToast('Select the order date and time correctly');
    //   return;
    // }

    Alert.alert('Confirm Purchase', 'Please tap to confirm', [
      {
        text: 'GO BACK',
        onPress: () => false,
      },
      {
        text: 'PURCHASE',
        onPress: () => handleCheckoutProcess(day),
      },
    ]);
  };

  const handleCheckoutProcess = async (day: Moment) => {
    const order_datetime = day.toDate().getTime() / 1000;

    dispatch(showLoading());
    var newOrders: Array<IOrder> = [];
    orders.map(async (o, idx) => {
      const orderWithSameMenu = newOrders.find(x => x.menu_id == o.menu_id);
      if (orderWithSameMenu !== undefined) {
        var newOrder = {...orderWithSameMenu};
        newOrder.addons = (orderWithSameMenu.addons?.split(',') ?? [])
          .concat(o.addons?.split(',') ?? [])
          ?.join(',');
        newOrder.amount = (orderWithSameMenu.amount ?? 0) + (o.amount ?? 0);
        newOrder.notes = orderWithSameMenu.notes + '&' + o.notes;
        if (
          orderWithSameMenu.notes == undefined ||
          orderWithSameMenu.notes.length == 0
        ) {
          newOrder.notes = o.notes;
        }
        if (o.notes == undefined || o.notes.length == 0) {
          newOrder.notes = orderWithSameMenu.notes;
        }
        newOrder.total_price =
          (orderWithSameMenu.total_price ?? 0) + (o.total_price ?? 0);
        const index = newOrders.findIndex(x => x.menu_id == o.menu_id);
        newOrders[index] = newOrder;
      } else {
        newOrders.push(o);
      }
    });

    var isCreateSuccess = true;
    for (let i = 0; i < newOrders.length; i++) {
      const o = newOrders[i];
      const idx = i;
      
      // Apply discount code to first order only
      const orderData: IOrder = {
        ...o, 
        order_date: order_datetime,
        discount_code: (i === 0 && appliedDiscount) ? appliedDiscount.code : undefined,
      };
      
      const resp = await CreateOrderAPI(orderData, dispatch);
      if (resp.success == 1) {
        const resp_intent = await CreatePaymentIntentAPI({
          order_id: resp.data.id,
        });
        if (resp_intent.success == 0) {
          ShowErrorToast(resp_intent.error ?? resp_intent.message);
          isCreateSuccess = false;
          break;
        }
        console.log('#####', resp_intent.data);
      } else {
        ShowErrorToast(resp.error ?? resp.message);
        isCreateSuccess = false;
        break;
      }
    }

    dispatch(hideLoading());
    if (isCreateSuccess) {
      dispatch(removeCustomerOrders(chefInfo.id ?? 0));
      goBack();
      navigate.toCustomer.orders();
    }

    // newOrders.map(async (o, idx) => {
    //   const newOrder: IOrder = {...o, order_date: order_datetime};
    //   const resp = await CreateOrderAPI(newOrder, dispatch);
    //   if (resp.success == 1) {
    //     const resp_intent = await CreatePaymentIntentAPI({
    //       order_id: resp.data.id,
    //     });
    //     console.log('#####', resp_intent.data);
    //   }
    // });
    // dispatch(hideLoading());
    // dispatch(removeCustomerOrders(chefInfo.id ?? 0));
    // navigation.navigate('CustomerOrdersStack');
    // navigation.goBack();
  };

  const getEstimatedTime = () => {
    const day = moment(DAY);
    const time = times.find(x => x.id == timeId);

    day.hour(time?.h);
    day.minute(time?.m);

    orders.map((o, idx) => {
      const menu = menus.find(x => x.id == o.menu_id);
      if (menu) {
        day.add((menu.estimated_time ?? 0) * 60 * 1000);
      }
    });
    return getFormattedDateTime(day);
  };

  const getAppliances = () => {
    var applianceIds: Array<number> = [];
    orders.map((o, idx) => {
      const menu = menus.find(x => x.id == o.menu_id);
      if (menu) {
        const arr =
          menu.appliances?.split(',').map((val, index) => {
            return parseInt(val);
          }) ?? [];
        applianceIds = applianceIds.concat([...arr]);
      }
    });

    var applianceNames: Array<string> = [];
    applianceIds.map((aId, idx) => {
      const appliance = getApplianceById(aId);
      if (appliance && appliance.name) {
        if (!applianceNames.includes(appliance.name)) {
          applianceNames.push(appliance.name);
        }
      }
    });

    return applianceNames;
  };

  return (
    <SafeAreaView style={styles.main}>
      <Container>
        <ScrollView contentContainerStyle={styles.pageView}>
          <View style={styles.heading}>
            <Pressable onPress={() => goBack()}>
              <FontAwesomeIcon icon={faAngleLeft} size={24} color="#1a1a1a" />
            </Pressable>
          </View>
          <Text style={styles.pageTitle}>Checkout</Text>
          <View style={styles.checkoutBlock}>
            <Text style={styles.checkoutSubheading}>Order Date & Time</Text>
            <Text style={styles.checkoutText}>
              Select the time for your chef to arrive.
            </Text>
            <Text style={styles.checkoutText}>
              Completion times may vary depending on your appliances.
            </Text>
            <CustomCalendar
              selectedDate={DAY}
              onDateSelect={handleDayPress}
              minDate={startDate}
              maxDate={endDate}
              datesWhitelist={(date: moment.Moment) => {
                // Allow any day the chef works within the date range
                return (
                  chefWorkingDays.includes(date.weekday()) &&
                  date.isSameOrAfter(startDate, 'day') &&
                  date.isSameOrBefore(endDate, 'day')
                );
              }}
            />
            <Text style={styles.timeLabel}>Select a time:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.timeContainer}>
                {times.length === 0 ? (
                  <Text style={styles.noTimesText}>No available times for this date</Text>
                ) : (
                  times.map((item, idx) => {
                    const day = moment(DAY);
                    day.hour(item?.h);
                    day.minute(item?.m);
                    if (day < moment()) return null;
                    return (
                      <StyledTabButton
                        title={item.label}
                        disabled={item.id != timeId}
                        onPress={() => onChangeTimeId(item.id)}
                        key={`time_${idx}`}
                      />
                    );
                  })
                )}
              </View>
            </ScrollView>
            <Text style={styles.estimated}>
              {`* Estimated completion time is ${getEstimatedTime()}`}
            </Text>
          </View>
          <View style={styles.checkoutBlock}>
            <Text style={styles.checkoutSubheading}>Order Summary</Text>
            {orders.map((o, idx) => {
              return (
                <OrderItem
                  order={o}
                  menu={menus.find(x => x.id == o.menu_id) ?? {}}
                  key={`o_${idx}`}
                />
              );
            })}
            <View style={styles.checkoutSummaryItemWrapper}>
              <View>
                <Text style={styles.checkoutSummaryItemTitle}>
                  Subtotal:
                </Text>
              </View>
              <View style={styles.checkoutSummaryItemPriceWrapper}>
                <Text
                  style={
                    styles.checkoutSummaryItemTitle
                  }>{`$${price_total.toFixed(2)}`}</Text>
              </View>
            </View>
            {appliedDiscount && (
              <View style={styles.checkoutSummaryItemWrapper}>
                <View>
                  <Text style={[styles.checkoutSummaryItemTitle, {color: '#10B981'}]}>
                    Discount ({appliedDiscount.code}):
                  </Text>
                </View>
                <View style={styles.checkoutSummaryItemPriceWrapper}>
                  <Text
                    style={[styles.checkoutSummaryItemTitle, {color: '#10B981'}]}>
                    {`-$${appliedDiscount.discount_amount.toFixed(2)}`}
                  </Text>
                </View>
              </View>
            )}
            <View style={[styles.checkoutSummaryItemWrapper, {borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12, marginTop: 8}]}>
              <View>
                <Text style={[styles.checkoutSummaryItemTitle, {fontWeight: '700', fontSize: 18}]}>
                  Total:
                </Text>
              </View>
              <View style={styles.checkoutSummaryItemPriceWrapper}>
                <Text
                  style={[styles.checkoutSummaryItemTitle, {fontWeight: '700', fontSize: 18}]}>
                  {`$${calculateFinalTotal().toFixed(2)}`}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Discount Code Section */}
          <DiscountCodeInput
            code={discountCode}
            onCodeChange={setDiscountCode}
            onApply={handleApplyDiscount}
            onRemove={handleRemoveDiscount}
            appliedDiscount={appliedDiscount}
            error={discountError}
            isLoading={isValidatingCode}
          />
          
          <View style={styles.checkoutBlock}>
            <Text style={styles.checkoutSubheading}>Order Address</Text>
            <View style={styles.checkoutSummaryItemWrapper}>
              <View style={{width: '100%'}}>
                <Text style={styles.checkoutAddressItemTitle}>
                  {`${self.first_name} ${self.last_name?.substring(0, 1)}.`}
                </Text>
                <Text style={styles.checkoutAddressItemTitle}>
                  {`${self.phone}`}
                </Text>
                <Text style={styles.checkoutAddressItemTitle}>
                  {`${self.address}`}
                </Text>
                <Text style={styles.checkoutAddressItemTitle}>
                  {`${self.city}, ${self.state}, ${self.zip}`}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.checkoutBlock}>
            <Text style={styles.checkoutSubheading}>Payment Information</Text>
            <TouchableOpacity
              onPress={handleCreditCard}
              style={styles.checkoutPaymentItemWrapper}>
              <View>
                <Text style={styles.checkoutSummaryItemTitle}>
                  Payment Method
                </Text>
                <Text style={styles.checkoutSummaryItemAddon}>
                  {paymentMethod
                    ? `${paymentMethod?.card_type ?? ''} ending in ${
                        paymentMethod?.last4 ?? ''
                      }`
                    : `Add payment method`}
                </Text>
              </View>
              <View>
                <FontAwesomeIcon
                  icon={faAngleRight}
                  size={20}
                  color="#666666"
                />
              </View>
            </TouchableOpacity>
            {/* <StyledStripeCardField
              content={
                <View style={styles.checkoutPaymentItemWrapper}>
                  <View>
                    <Text style={styles.checkoutSummaryItemTitle}>
                      Payment Method{' '}
                    </Text>
                    <Text style={styles.checkoutSummaryItemAddon}>
                      {paymentMethod
                        ? `${paymentMethod?.card_type ?? ''} ending in ${
                            paymentMethod?.last4 ?? ''
                          } `
                        : `Add payment method `}
                    </Text>
                  </View>
                  <View>
                    <FontAwesomeIcon
                      icon={faAngleRight}
                      size={20}
                      color="#ffffff"
                    />
                  </View>
                </View>
              }
              onAddCard={handleAddPaymentCard}
            /> */}
          </View>
          <View style={styles.checkoutBlock}>
            <View style={styles.switchWrapper}>
              <StyledSwitch
                label={`I have the following appliances available for the Chef: ${getAppliances().join(
                  ', ',
                )}`}
                labelLines={0}
                value={appliance}
                onPress={() => onChangeAppliance(!appliance)}
              />
            </View>
          </View>
          <View style={styles.vcenter}>
            <TouchableOpacity
              style={appliance ? GlobalStyles.btn : GlobalStyles.btnDisabled}
              onPress={() => handleCheckout()}
              disabled={!appliance}>
              <Text
                style={
                  appliance ? GlobalStyles.btnTxt : GlobalStyles.btnDisabledTxt
                }>
                PLACE ORDER
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Container>

      {/* Address Collection Modal */}
      <AddressCollectionModal
        visible={showAddressModal}
        userInfo={self}
        onSave={handleSaveAddress}
        onCancel={() => {
          setShowAddressModal(false);
          // Optionally navigate back if user cancels without providing address
          // goBack();
        }}
      />
    </SafeAreaView>
  );
};

export default Checkout;
