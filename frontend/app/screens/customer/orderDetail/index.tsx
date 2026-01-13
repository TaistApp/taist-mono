import { FAB, TextInput } from '@react-native-material/core';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// NPM
import {
  faAngleRight,
  faComment,
  faPhone,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import StarRating from 'react-native-star-rating-widget';

// Types & Services
import { IMenu, IOrder, IPayment, IUser } from '../../../types/index';

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import StyledProfileImage from '../../../components/styledProfileImage';
import Container from '../../../layout/Container';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import {
  CancelOrderPaymentAPI,
  CreateReviewAPI,
  GetOrderDataAPI,
  GetPaymentMethodAPI,
  TipOrderPaymentAPI,
  UpdateOrderStatusAPI
} from '../../../services/api';
import { OrderStatus } from '../../../types/status';
import { GetOrderString, getImageURL } from '../../../utils/functions';
import { ShowErrorToast, ShowSuccessToast } from '../../../utils/toast';
import {
  getFormattedDate,
  getFormattedDateTime,
  getFormattedDateInTimezone,
  getFormattedDateTimeInTimezone
} from '../../../utils/validations';
import { styles } from './styles';

const OrderDetail = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const self = useAppSelector(x => x.user.user);
  const users = useAppSelector(x => x.table.users);
  const dispatch = useAppDispatch();

  const orderId = params.orderId as string;

  const [orderInfo, setOrderInfo] = useState<IOrder>({});
  const [chefInfo, setChefInfo] = useState<IUser>({});
  const [menu, setMenu] = useState<IMenu>({});
  const [reviewText, onChangeReviewText] = useState('');
  const [rating, onChangeRating] = useState(5);
  const [tipAmount, onChangeTipAmount] = useState(0);
  const [paymentMethod, onChangePaymentMethod] = useState<IPayment>();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    console.log(params);
console.log("order detail useeffect....");
    const orderInfo = typeof params.orderInfo === 'string' ? JSON.parse(params.orderInfo) : params.orderInfo;
    loadData(orderInfo.id);
    getPaymentMethod();
    const intervalId = setInterval(() => {
      console.log('interval');
      const orderInfo = typeof params.orderInfo === 'string' ? JSON.parse(params.orderInfo) : params.orderInfo;
      loadData(orderInfo.id);
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);

  }, []);

  useEffect(() => {
    if (orderInfo) {
    }
  }, [orderInfo]);

  // Countdown timer for acceptance deadline
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) {
      return;
    }

    const countdownInterval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [timeRemaining]);

  const loadData = async (orderId: number) => {
    const resp = await GetOrderDataAPI({ order_id: orderId }, dispatch);
    console.log('load data ======>>>');
    if (resp.success == 1) {
      console.log('load data 1:  ======>>>');
      setOrderInfo(resp.data);
      setChefInfo(resp.data.chef);
      setMenu(resp.data.menu);

      // Update time remaining if order is in requested status
      if (resp.data.status === 1 && resp.data.deadline_info) {
        setTimeRemaining(resp.data.deadline_info.seconds_remaining);
      } else {
        setTimeRemaining(null);
      }
    }
    setIsLoading(false);
  };

  const getPaymentMethod = async () => {
    const resp = await GetPaymentMethodAPI();
    if (resp.success == 1) {
      const data = resp.data.find((x: IPayment) => x.active == 1);
      onChangePaymentMethod(data);
    }
  };

  const handleStatus = async (status: number) => {
    //ORDER STATUS//1: Requested, 2:Accepted, 3:Completed, 4:Cancelled, 5:Rejected, 6:Expired
    var params = { ...orderInfo, status };
    // dispatch(showLoading());
    if (status == 4 && orderInfo?.status !== 1) {
      const resp_cancel = await CancelOrderPaymentAPI({
        order_id: orderInfo?.id ?? -1,
      });
      if (resp_cancel.success !== 1) {
        ShowErrorToast(resp_cancel.error || resp_cancel.message);
        // dispatch(hideLoading());
        return;
      }
    }

    const resp = await UpdateOrderStatusAPI(params, dispatch);
    // dispatch(hideLoading());
    if (resp.success == 1) {
      ShowSuccessToast(
        resp.data?.status == 2
          ? 'Accepted!'
          : resp.data?.status == 3
            ? 'Thank you! '
            : 'Taist has notified that you have cancelled. ',
      );
      router.back();
    }
  };

  const handleTipAmount = (amount: number) => {
    if (amount == tipAmount) {
      onChangeTipAmount(0);
    } else {
      onChangeTipAmount(amount);
    }
  };

  const handleCall = () => {
    Linking.openURL(`tel:${chefInfo?.phone}`);
  };

  const handleChat = () => {
    router.push({
      pathname: '/screens/common/chat',
      params: { userInfo: JSON.stringify(chefInfo), orderInfo: JSON.stringify(orderInfo) }
    });
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        {
          text: 'NO',
          style: 'cancel',
        },
        {
          text: 'YES, CANCEL',
          style: 'destructive',
          onPress: () => handleStatus(4),
        },
      ],
      { cancelable: true }
    );
  };

  const handleMap = () => { };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) {
      return 'Expired';
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmitReview = async (e: any) => {
    dispatch(showLoading());
    const resp = await CreateReviewAPI({
      from_user_id: self.id ?? 0,
      to_user_id: chefInfo?.id ?? 0,
      rating: rating,
      review: reviewText,
      order_id: orderInfo?.id ?? -1,
      tip_amount: ((orderInfo?.total_price ?? 0) * tipAmount) / 100.0,
    });

    console.log('order review response: ', resp);


    if (resp.success == 1) {
      if (tipAmount > 0) {
        const resp_tip = await TipOrderPaymentAPI({
          order_id: orderInfo?.id ?? -1,
          tip_amount: ((orderInfo?.total_price ?? 0) * tipAmount) / 100.0,
        });
        console.log('tip amount response: ', resp_tip);

      }
    }
    dispatch(hideLoading());
    router.back();
  };

  var items: Array<any> = [];
  items.push({
    name: menu.title,
    qty: orderInfo?.amount ?? 0,
    price: (menu.price ?? 0) * (orderInfo?.amount ?? 0),
    isCustomization: false,
  });
  orderInfo?.addons?.split(',').map((addon, idx) => {
    const customize = menu.customizations?.find(x => x.id == parseInt(addon));
    if (customize) {
      const sameIndex = items.findIndex(x => x.name == customize.name);
      if (sameIndex == -1) {
        items.push({
          name: customize.name,
          qty: 1,
          price: customize.upcharge_price ?? 0,
          isCustomization: true,
        });
      } else {
        items[sameIndex].qty++;
        items[sameIndex].price += customize.upcharge_price ?? 0;
      }
    }
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.main}>
        <Container backMode title="">
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#fa4616" />
          </View>
        </Container>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.main}>
      <Container
        backMode
        title={getFormattedDateInTimezone((orderInfo?.order_date ?? 0) * 1000, orderInfo?.timezone)}>
        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.pageView}>
          <View style={{ alignItems: 'center' }}>
            <StyledProfileImage url={getImageURL(chefInfo?.photo)} size={160} />
            <Text style={styles.chefName}>{`${chefInfo?.first_name} ${chefInfo?.last_name?.charAt(0) ?? ''}.`}</Text>
          </View>

          {orderInfo?.status == 3 && (
            <TouchableOpacity
              style={{
                width: '100%',
                backgroundColor: '#fa4616',
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              <View>
                <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>
                  Leave a Tip & Review
                </Text>
                <Text style={{ color: '#ffffff', fontSize: 14, opacity: 0.9 }}>
                  Thank {chefInfo?.first_name} for your order
                </Text>
              </View>
              <FontAwesomeIcon icon={faAngleRight} size={24} color="#ffffff" />
            </TouchableOpacity>
          )}

          <Text style={styles.title}>Order Details</Text>
          <View style={styles.card}>
            <View style={[styles.cardMain, { justifyContent: 'space-between' }]}>
              <View style={{ rowGap: 5 }}>
                <Text style={styles.text} numberOfLines={1}>
                  Order ID
                </Text>
                <Text style={styles.text} numberOfLines={1}>
                  Order Date
                </Text>
                <Text style={styles.text} numberOfLines={1}>
                  Status
                </Text>
                {/* <Text style={styles.text} numberOfLines={1}>
                  Arrival Date
                </Text> */}
              </View>
              <View style={{ rowGap: 5 }}>
                <Text style={styles.text} numberOfLines={1}>
                  {GetOrderString(orderInfo?.id ?? 0)}
                </Text>
                <Text style={styles.text} numberOfLines={1}>
                  {getFormattedDateTimeInTimezone((orderInfo?.order_date ?? 0) * 1000, orderInfo?.timezone)}
                </Text>
                <Text style={styles.text} numberOfLines={1}>
                  {OrderStatus[orderInfo?.status ?? 0]}
                </Text>
              </View>
            </View>
            {orderInfo?.status === 1 && timeRemaining !== null && (
              <>
                <View style={styles.line} />
                <View style={styles.cardMain}>
                  <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
                    <Text style={[styles.text, { fontWeight: '600', marginBottom: 5 }]}>
                      Chef Acceptance Deadline
                    </Text>
                    <Text style={[styles.text, {
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: timeRemaining <= 300 ? '#ff4444' : '#4CAF50'
                    }]}>
                      {formatTimeRemaining(timeRemaining)}
                    </Text>
                    <Text style={[styles.text, { fontSize: 12, color: '#666', marginTop: 5 }]}>
                      {timeRemaining > 0
                        ? 'You will receive a full refund if not accepted within this time'
                        : 'Processing automatic refund...'}
                    </Text>
                  </View>
                </View>
              </>
            )}
            <View style={styles.line} />
            {items.length > 0 && (
              <View style={styles.cardMain}>
                <View style={{ flex: 1, rowGap: 5 }}>
                  <Text style={styles.text}>Item</Text>
                  {items.map((item, idx) => {
                    return (
                      <Text style={styles.text} key={`name_${idx}`}>
                        {item.isCustomization ? '  + ' : ''}{item.name}
                      </Text>
                    );
                  })}
                </View>
                <View style={{ width: '20%', rowGap: 5 }}>
                  <Text style={styles.textRight}>Qty</Text>
                  {items.map((item, idx) => {
                    return (
                      <Text style={styles.textRight} key={`qty_${idx}`}>
                        {item.qty}
                      </Text>
                    );
                  })}
                </View>
                <View style={{ width: '25%', rowGap: 5 }}>
                  <Text style={styles.textRight}>Price</Text>
                  {items.map((item, idx) => {
                    return (
                      <Text
                        style={styles.textRight}
                        key={`price_${idx}`}>{`$${item.price.toFixed(
                          2,
                        )} `}</Text>
                    );
                  })}
                </View>
              </View>
            )}
            {orderInfo?.notes && (
              <Text style={styles.text}>{`Special Instructions: ${orderInfo?.notes ?? ''}`}</Text>
            )}
            <View style={styles.line} />
            <View style={styles.cardMain}>
              <View style={{ width: '50%', rowGap: 5 }}>
                <Text style={styles.text}>Order Total</Text>
              </View>
              <View style={{ width: '50%', rowGap: 5 }}>
                <Text
                  style={styles.textRight}>{`$${orderInfo?.total_price?.toFixed(
                    2,
                  )} `}</Text>
              </View>
            </View>
          </View>

          {orderInfo?.status == 3 && (
            <>
              <Text style={styles.title}>Review your Experience</Text>
              <View style={[styles.card, { rowGap: 0 }]}>
                <TextInput
                  multiline
                  placeholder="Type a message"
                  value={reviewText}
                  onChangeText={(text) => onChangeReviewText(text.slice(0, 100))}
                  variant={'outlined'}
                  color="#7f7f7f"
                  inputContainerStyle={{ paddingVertical: 10 }}
                />
                <Text style={{ color: '#7f7f7f', fontSize: 12, letterSpacing: 0.5, marginTop: 5, alignSelf: 'flex-end' }}>
                  {`${reviewText.length}/100 Characters`}
                </Text>

                <View style={{ width: '100%', alignItems: 'center', paddingTop: 10 }}>
                  <StarRating
                    rating={rating}
                    starSize={30}
                    starStyle={{ marginHorizontal: 0 }}
                    onChange={onChangeRating}
                  />
                </View>

                <Text style={styles.titleBlack}>Tip Amount</Text>
                <View style={styles.tipContainer}>
                  <TouchableOpacity
                    style={[
                      styles.tipMain,
                      {
                        borderTopLeftRadius: 15,
                        borderBottomLeftRadius: 15,
                      },
                      tipAmount == 15 && { backgroundColor: '#fa4616' },
                    ]}
                    onPress={() => handleTipAmount(15)}>
                    <Text style={styles.text}>15%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.tipMain,
                      tipAmount == 18 && { backgroundColor: '#fa4616' },
                    ]}
                    onPress={() => handleTipAmount(18)}>
                    <Text style={styles.text}>18%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.tipMain,
                      tipAmount == 20 && { backgroundColor: '#fa4616' },
                    ]}
                    onPress={() => handleTipAmount(20)}>
                    <Text style={styles.text}>20%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.tipMain,
                      {
                        borderTopRightRadius: 15,
                        borderBottomRightRadius: 15,
                      },
                      tipAmount == 25 && { backgroundColor: '#fa4616' },
                    ]}
                    onPress={() => handleTipAmount(25)}>
                    <Text style={styles.text}>25%</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.btnPayment}>
                  <View style={{ rowGap: 5 }}>
                    <Text style={[styles.text, { fontSize: 18, letterSpacing: 0.5 }]}>
                      Payment Method
                    </Text>
                    <Text style={styles.text}>
                      {paymentMethod
                        ? `${paymentMethod?.card_type ?? ''} ending in ${paymentMethod?.last4 ?? ''
                        } `
                        : `Add payment method `}
                    </Text>
                  </View>
                  <FontAwesomeIcon
                    icon={faAngleRight}
                    size={40}
                    color="#000000"
                  />
                </TouchableOpacity>

                <FAB
                  style={styles.btnSubmit}
                  variant="extended"
                  color="#000000"
                  tintColor="#ffffff"
                  label="SAVE REVIEW"
                  labelStyle={styles.btnSubmit}
                  onPress={handleSubmitReview}
                />
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.btnContainer}>
          <TouchableOpacity style={styles.btn} onPress={handleCall}>
            <FontAwesomeIcon icon={faPhone} color="#ffffff" size={20} />
            <Text style={styles.btnText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={handleChat}>
            <FontAwesomeIcon icon={faComment} color="#ffffff" size={20} />
            <Text style={styles.btnText}>Chat</Text>
          </TouchableOpacity>
          {


            (orderInfo?.status == 1 ||
              orderInfo?.status == 2 ||
              orderInfo?.status == 7) && (
              <TouchableOpacity style={styles.btn} onPress={handleCancel}>
                <FontAwesomeIcon icon={faXmark} color="#ffffff" size={20} />
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            )}
        </View>
      </Container>
    </SafeAreaView>
  );
};

export default OrderDetail;
