import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// NPM
import {
  faChevronRight,
  faComment,
  faLocationDot,
  faMap,
  faPhone,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLocalSearchParams } from 'expo-router';
import { StarRatingDisplay } from 'react-native-star-rating-widget';

// Types & Services
import { IMenu, IOrder, IUser, NavigationStackType } from '../../../types/index';

// Hooks
import { useAppDispatch } from '../../../hooks/useRedux';

import StyledButton from '../../../components/styledButton';
import Container from '../../../layout/Container';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import {
  CancelOrderPaymentAPI,
  CompleteOrderPaymentAPI,
  GetOrderDataAPI,
  RejectOrderPaymentAPI,
  UpdateOrderStatusAPI
} from '../../../services/api';
import { OrderStatus } from '../../../types/status';
import { GetOrderString } from '../../../utils/functions';
import { goBack, navigate } from '../../../utils/navigation';
import { ShowErrorToast, ShowSuccessToast } from '../../../utils/toast';
import { getFormattedDateTime, getFormattedDateTimeInTimezone } from '../../../utils/validations';
import { styles } from './styles';
 

type PropsType = NativeStackScreenProps<NavigationStackType>;
//ORDER STATUS//1: Requested, 2:Accepted, 3:Completed, 4:Cancelled, 5:Rejected, 6:Expired
const OrderDetail = () => {
  const dispatch = useAppDispatch();
  const screenWidth = Dimensions.get('window').width;

  const params = useLocalSearchParams();
  
  // Handle both navigation styles
  const orderInfoFromParams = typeof params?.orderInfo === 'string' 
    ? JSON.parse(params.orderInfo) 
    : params?.orderInfo;
  const orderId = params?.orderId || orderInfoFromParams?.id;

  const [orderInfo, setOrderInfo] = useState<IOrder>({});
  const [customerInfo, setCustomerInfo] = useState<IUser>({});
  const [menu, setMenu] = useState<IMenu>({});
  const [imageIndex, onChangeImageIndex] = useState(0);
  const [reviewText, onChangeReviewText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    loadData(orderId || orderInfoFromParams?.id);
  }, []);

  const loadData = async (orderId: number | string) => {
    const resp = await GetOrderDataAPI({ order_id: parseInt(orderId?.toString() || '0') }, dispatch);
    if (resp.success == 1) {
      console.log('------', resp);
      setOrderInfo(resp.data);
      setCustomerInfo(resp.data.customer);
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

  useEffect(() => {
    if (orderInfo) {
      console.log('xxx---x---x---x--');
      setOrderInfo(orderInfo);
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

  const handleScrollIndexChange = (e: any) => {
    const { nativeEvent } = e;
    const index = Math.round(nativeEvent.contentOffset.x / (screenWidth - 20));
    onChangeImageIndex(index);
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) {
      return 'Expired';
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStatus = async (status: number) => {
    //ORDER STATUS//1: Requested, 2:Accepted, 3:Completed, 4:Cancelled, 5:Rejected, 6:Expired, 7:OnMyWay
    var params = { ...orderInfo, status };

    dispatch(showLoading());
    if (status == 3) {
      const resp_complete = await CompleteOrderPaymentAPI({
        order_id: orderInfo.id ?? -1,
      });
      if (resp_complete.success !== 1) {
        ShowErrorToast(resp_complete.error || resp_complete.message);
        dispatch(hideLoading());
        return;
      }
    } else if (status == 4) {
      const resp_cancel = await CancelOrderPaymentAPI({
        order_id: orderInfo.id ?? -1,
      });
      if (resp_cancel.success !== 1) {
        ShowErrorToast(resp_cancel.error || resp_cancel.message);
        dispatch(hideLoading());
        return;
      }
    } else if (status == 5) {
      const resp_reject = await RejectOrderPaymentAPI({
        order_id: orderInfo.id ?? -1,
      });
      if (resp_reject.success !== 1) {
        ShowErrorToast(resp_reject.error || resp_reject.message);
        dispatch(hideLoading());
        return;
      }
    }

    const resp = await UpdateOrderStatusAPI(params, dispatch);
    dispatch(hideLoading());

    // Handle error response (e.g., expired order)
    if (resp.success !== 1) {
      ShowErrorToast(resp.error || 'Failed to update order status');
      // If order expired, navigate back
      if (resp.error?.includes('expired')) {
        goBack();
      }
      return;
    }

    ShowSuccessToast(
      resp.data?.status == 2
        ? 'Accepted!'
        : resp.data?.status == 3
          ? 'Customer has been notified'
          : 'Customer has been notified',
    );
    if (resp.data.status == 2 || resp.data.status == 7) {
      setOrderInfo(resp.data);
    } else {
      goBack();
    }
  };

  const handleCall = () => {
    Linking.openURL(`tel:${customerInfo.phone}`);
  };

  const handleChat = () => {
    navigate.toCommon.chat(customerInfo, orderInfo);
  };

  const handleMap = () => {
    // navigation.push('Map', {userInfo: customerInfo});
    const scheme = Platform.select({
      ios: 'http://maps.apple.com/?q=',
      android: 'geo:0,0?q=',
    });
    const url = Platform.select({
      ios: `${scheme}${customerInfo.address}, ${customerInfo.city}, ${customerInfo.state} ${customerInfo.zip}`,
      // android: `${scheme}(street=${customerInfo.address} city=${customerInfo.city} state=${customerInfo.state} zip=${customerInfo.zip})`,
      android: `${scheme}${customerInfo.address}, ${customerInfo.city}, ${customerInfo.state} ${customerInfo.zip}`,
    });
    Linking.openURL(url ?? '');
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
      <Container backMode title={`${customerInfo?.first_name ?? ''} `}>
        <ScrollView contentContainerStyle={styles.pageView}>
          <Image
            style={styles.img}
            source={require('../../../assets/images/order.jpg')}
          />

          <View style={styles.card}>
            <TouchableOpacity style={styles.cardMainTappable} onPress={handleMap} activeOpacity={0.7}>
              <FontAwesomeIcon
                icon={faLocationDot}
                color="#fa4616"
                size={20}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.text}>{customerInfo?.address ?? ''}</Text>
                <Text style={styles.text}>{`${customerInfo?.city ?? ''}, ${customerInfo?.state ?? ''} ${customerInfo?.zip ?? ''}`}</Text>
              </View>
              <FontAwesomeIcon icon={faChevronRight} color="#999" size={16} />
            </TouchableOpacity>
            {orderInfo?.status !== 1 && (
              <>
                <View style={styles.line} />
                <TouchableOpacity style={styles.cardMainTappable} onPress={handleCall} activeOpacity={0.7}>
                  <FontAwesomeIcon icon={faPhone} color="#fa4616" size={20} />
                  <View style={{ flex: 1, rowGap: 5 }}>
                    <Text style={styles.text}>{customerInfo?.phone ?? ''}</Text>
                  </View>
                  <FontAwesomeIcon icon={faChevronRight} color="#999" size={16} />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* <Text style={styles.title}>Order Details</Text> */}
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
            <View style={styles.line} />


            {orderInfoFromParams?.title === "Review and tip for Chef" || orderInfoFromParams?.title === "Review for chef" ? (
              orderInfoFromParams?.title === "Review and tip for Chef" ? (
                <View style={[styles.cardMain, { justifyContent: 'flex-start' }]}>
                  {/* <View style={{ rowGap: 5,flexDirection:'row' }}>
                    <Text style={styles.text} numberOfLines={1}>
                      Tip
                    </Text>
                    <Text style={styles.text} numberOfLines={1}>
                      Rating
                    </Text>
                    <Text style={styles.text} numberOfLines={1}>
                      Review
                    </Text>
                  </View> */}
                  <View style={{ rowGap: 5 }}>
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={[styles.text, { width: '20%' }]} numberOfLines={1}>
                        Tip
                      </Text>
                      <Text style={[styles.text, { width: '80%' }]} numberOfLines={2}>
                        {`${orderInfoFromParams?.tip ?? 'N/A'
                          }`}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={[styles.text, { width: '20%' }]} numberOfLines={1}>
                        Rating
                      </Text>
                      <Text style={[styles.text, { width: '80%' }]} numberOfLines={1}>
                        {`${orderInfoFromParams?.ratings ?? 'N/A'
                          }`}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={[styles.text, { width: '20%' }]} numberOfLines={1}>
                        Review
                      </Text>
                      <Text style={[styles.text, { width: '80%' }]} >
                        {`${orderInfoFromParams?.review   ?? 'N/A'
                          }`}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={[styles.cardMain, { justifyContent: 'space-between' }]}>
                  <View style={{ rowGap: 5 }}>
                    <Text style={styles.text} numberOfLines={1}>
                      Rating
                    </Text>
                    <Text style={styles.text} numberOfLines={1}>
                      Review
                    </Text>
                  </View>
                  <View style={{ rowGap: 5 }}>
                    <Text style={styles.text} numberOfLines={1}>
                      {`${orderInfoFromParams?.ratings ?? 'N/A'
                        }`}
                    </Text>

                    <Text style={styles.text} numberOfLines={1}>
                      {`${orderInfoFromParams?.review ?? 'N/A'
                        }`}
                    </Text>
                  </View>
                </View>
              )
            ) : (
              // Else condition
              items.length > 0 && (
                <View style={styles.cardMain}>
                  <View style={{ flex: 1, rowGap: 5 }}>
                    <Text style={styles.text}>Item</Text>
                    {items.map((item, idx) => (
                      <Text style={styles.text} key={`name_${idx}`}>
                        {item.isCustomization ? '  + ' : ''}{item.name}
                      </Text>
                    ))}
                  </View>
                  <View style={{ width: '20%', rowGap: 5 }}>
                    <Text style={styles.textRight}>Qty</Text>
                    {items.map((item, idx) => (
                      <Text style={styles.textRight} key={`qty_${idx}`}>
                        {item.qty}
                      </Text>
                    ))}
                  </View>
                  <View style={{ width: '25%', rowGap: 5 }}>
                    <Text style={styles.textRight}>Price</Text>
                    {items.map((item, idx) => (
                      <Text
                        style={styles.textRight}
                        key={`price_${idx}`}
                      >{`$${item.price.toFixed(2)} `}</Text>
                    ))}
                  </View>
                </View>
              )
            )}

            {orderInfoFromParams?.title !== "Review and tip for Chef" && orderInfoFromParams?.title !== "Review for chef" && (
              orderInfo?.notes && (
                <Text style={styles.text}>{`Special: ${orderInfo.notes ?? ''} `}</Text>
              )
            )}
            {orderInfoFromParams?.title !== "Review and tip for Chef" && orderInfoFromParams?.title !== "Review for chef" && (
              <>
                <View style={styles.line} />
                <View style={styles.cardMain}>
                  <View style={{ flex: 1, rowGap: 5 }}>
                    <Text style={styles.text}>Order Total</Text>
                  </View>
                  <View style={{ width: '50%', rowGap: 5 }}>
                    <Text
                      style={styles.textRight}>{`$${orderInfo?.total_price?.toFixed(2)} `}</Text>
                  </View>
                </View>
              </>
            )}

          </View>

          {(orderInfo?.status == 1 ||
            orderInfo?.status == 2 ||
            orderInfo?.status == 7) && (
              <>
                <Text style={styles.title}>Pending Order </Text>
                <View style={[styles.card, { alignItems: 'center' }]}>
                  {/* Countdown timer for status 1 (Requested) */}
                  {orderInfo?.status === 1 && timeRemaining !== null && (
                    <View style={{ width: '100%', alignItems: 'center', paddingBottom: 15 }}>
                      <Text style={[styles.text, { fontWeight: '600', marginBottom: 5 }]}>
                        Time to Accept
                      </Text>
                      <Text style={[styles.text, {
                        fontSize: 24,
                        fontWeight: 'bold',
                        color: timeRemaining <= 300 ? '#ff4444' : '#4CAF50'
                      }]}>
                        {formatTimeRemaining(timeRemaining)}
                      </Text>
                      {timeRemaining <= 0 && (
                        <Text style={[styles.text, { fontSize: 12, color: '#ff4444', marginTop: 5 }]}>
                          Order expired - customer will be refunded
                        </Text>
                      )}
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                    {orderInfo?.status == 1 && (
                      <StyledButton
                        title={'ACCEPT ORDER'}
                        onPress={() => {
                          handleStatus(2);
                        }}
                        style={{ flex: 1 }}
                        titleStyle={{ fontSize: 16, letterSpacing: 0.5 }}
                      />
                    )}
                    {orderInfo?.status == 2 && (
                      <StyledButton
                        title={'ON MY WAY'}
                        onPress={() => {
                          handleStatus(7);
                        }}
                        style={{ flex: 1 }}
                        titleStyle={{ fontSize: 16, letterSpacing: 0.5 }}
                      />
                    )}
                    {orderInfo.status == 7 && (
                      <StyledButton
                        title={'ORDER COMPLETED'}
                        onPress={() => {
                          handleStatus(3);
                        }}
                        style={{ flex: 1 }}
                        titleStyle={{ fontSize: 16, letterSpacing: 0.5 }}
                      />
                    )}
                    {(orderInfo.status == 2 || orderInfo.status == 7) && (
                      <StyledButton
                        title={'CANCEL ORDER'}
                        onPress={() => {
                          handleStatus(5);
                        }}
                        style={{ flex: 1 }}
                        titleStyle={{ fontSize: 16, letterSpacing: 0.5 }}
                      />
                    )}
                    {orderInfo.status == 1 && (
                      <StyledButton
                        title={'REJECT ORDER'}
                        onPress={() => {
                          handleStatus(5);
                        }}
                        style={{ flex: 1 }}
                        titleStyle={{ fontSize: 16, letterSpacing: 0.5 }}
                      />
                    )}
                  </View>

                  <Text style={styles.text}>
                    {orderInfo.status == 1
                      ? 'This order is pending your acceptance. '
                      : orderInfo.status == 2
                        ? 'Let the customer know you are on the way. '
                        : orderInfo.status == 7
                          ? 'Press this button when you have finished the order. '
                          : ''}
                  </Text>
                </View>
              </>
            )}

          {orderInfo?.review && (
            <>
              <Text style={styles.title}>Reviews</Text>
              <View style={[styles.card, { gap: 20 }]}>
                <Text style={styles.text}>{orderInfo.review}</Text>
                <View style={{ width: '100%', alignItems: 'center' }}>
                  <StarRatingDisplay
                    rating={orderInfo.rating ?? 0}
                    starSize={30}
                    starStyle={{ marginHorizontal: 0 }}
                  />
                </View>
              </View>
            </>
          )}
        </ScrollView>
        <View style={styles.btnContainer}>
          {orderInfo?.status !== 1 && (
            <TouchableOpacity style={styles.btn} onPress={handleCall}>
              <FontAwesomeIcon icon={faPhone} color="#ffffff" size={20} />
              <Text style={styles.btnText}>Call</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.btn} onPress={handleChat}>
            <FontAwesomeIcon icon={faComment} color="#ffffff" size={20} />
            <Text style={styles.btnText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={handleMap}>
            <FontAwesomeIcon icon={faMap} color="#ffffff" size={20} />
            <Text style={styles.btnText}>Map</Text>
          </TouchableOpacity>
        </View>
      </Container>
    </SafeAreaView>
  );
};

export default OrderDetail;
