import { TextInput } from '@react-native-material/core';
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
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';

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

import PushPermissionModal from '../../../components/PushPermissionModal';
import StyledProfileImage from '../../../components/styledProfileImage';
import { RequestPushPermission } from '../../../firebase';
import { OptInPushNotificationsAPI } from '../../../services/api';
import { ReadDataFromStorage, StoreDataToStorage } from '../../../utils/storage';
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
import { navigate, setActiveOrderDetailId } from '../../../utils/navigation';
import { ShowErrorToast, ShowSuccessToast } from '../../../utils/toast';
import {
  getFormattedDate,
  getFormattedDateTime,
  getFormattedDateInTimezone,
  getFormattedDateTimeInTimezone
} from '../../../utils/validations';
import { getParkingLabel } from '../../../constants/parkingTypes';
import { REVIEW_MAX_LENGTH, truncateReview } from '../../../utils/review';
import { styles } from './styles';

const OrderDetail = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const self = useAppSelector(x => x.user.user);
  const users = useAppSelector(x => x.table.users);
  const dispatch = useAppDispatch();

  const orderId = params.orderId as string;

  // The Orders list passes the order (and often the chef) it already has, so we
  // render those immediately and refresh in the background — instead of showing
  // a full-screen spinner while GetOrderDataAPI round-trips (the reported LL).
  const parseParam = (v: unknown) =>
    typeof v === 'string' ? JSON.parse(v) : (v ?? {});
  const initialOrder: IOrder = parseParam(params.orderInfo);
  const initialChef: IUser = parseParam(params.chefInfo);

  const [orderInfo, setOrderInfo] = useState<IOrder>(initialOrder);
  const [chefInfo, setChefInfo] = useState<IUser>(initialChef);
  const [menu, setMenu] = useState<IMenu>({});
  const [reviewText, onChangeReviewText] = useState('');
  const [rating, onChangeRating] = useState(5);
  const [tipAmount, onChangeTipAmount] = useState(0);
  // Custom tip entry (#12): when set, overrides the preset percentage. Mode
  // toggles between a flat dollar amount and a percentage of the order total.
  const [customTip, setCustomTip] = useState('');
  const [customTipMode, setCustomTipMode] = useState<'dollar' | 'percent'>('dollar');
  const [paymentMethod, onChangePaymentMethod] = useState<IPayment>();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  // Only block on a spinner if we arrived without any order data to show.
  const [isLoading, setIsLoading] = useState(!initialOrder?.id);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  // Y-offset of the "Review your Experience" section inside the scroll content,
  // so focusing the review input scrolls the section into view instead of
  // overshooting to the end of the page (which left the input hidden above a
  // block of blank space).
  const reviewSectionY = useRef(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToReviewSection = () =>
    scrollViewRef.current?.scrollTo({ y: Math.max(reviewSectionY.current - 10, 0), animated: true });

  useEffect(() => {
    const id = initialOrder.id ?? 0;
    setActiveOrderDetailId(initialOrder.id ?? null);
    loadData(id);
    getPaymentMethod();
    pollingRef.current = setInterval(() => {
      loadData(id);
    }, 30000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setActiveOrderDetailId(null);
    };
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
    if (resp.success == 1) {
      setOrderInfo(resp.data);
      setChefInfo(resp.data.chef);
      setMenu(resp.data.menu);

      // Stop polling once order is completed — no further status changes expected
      if (resp.data.status === 3 && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      // Show push permission modal after first completed order
      if (resp.data.status === 3) {
        checkPushPrompt();
      }

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

  const checkPushPrompt = async () => {
    const alreadyShown = await ReadDataFromStorage('@push_prompt_shown');
    if (alreadyShown) return;
    setTimeout(() => setShowPushModal(true), 2000);
  };

  const handleAcceptPush = async () => {
    setShowPushModal(false);
    await StoreDataToStorage('@push_prompt_shown', true);
    const granted = await RequestPushPermission();
    if (granted && self?.id) {
      await OptInPushNotificationsAPI(self.id);
    }
  };

  const handleDeclinePush = async () => {
    setShowPushModal(false);
    await StoreDataToStorage('@push_prompt_shown', true);
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
    // Selecting a preset clears any custom entry (they're mutually exclusive).
    setCustomTip('');
    if (amount == tipAmount) {
      onChangeTipAmount(0);
    } else {
      onChangeTipAmount(amount);
    }
  };

  // Resolve the tip to a dollar amount. A custom entry (flat $ or % of total)
  // overrides the preset percentage.
  const getTipDollars = (): number => {
    const total = orderInfo?.total_price ?? 0;
    const customNum = parseFloat(customTip);
    if (customTip.trim() !== '' && !Number.isNaN(customNum) && customNum > 0) {
      return customTipMode === 'dollar' ? customNum : (total * customNum) / 100;
    }
    return (total * tipAmount) / 100;
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
    const tipDollars = getTipDollars();

    // Save the review first (fast). Use an inline button state instead of the
    // blocking full-screen loader.
    setIsSubmittingReview(true);
    const resp = await CreateReviewAPI({
      from_user_id: self.id ?? 0,
      to_user_id: chefInfo?.id ?? 0,
      rating: rating,
      review: reviewText,
      order_id: orderInfo?.id ?? -1,
      tip_amount: tipDollars,
    });
    setIsSubmittingReview(false);

    if (resp.success != 1) {
      ShowErrorToast(resp.error ?? resp.message ?? 'Could not submit your review.');
      return;
    }

    // Charge the tip in the background. The Stripe round-trip is the slow part
    // and the review is already saved, so we don't make the user wait on it
    // (the reported LL). A failure is surfaced via toast.
    if (tipDollars > 0) {
      TipOrderPaymentAPI({
        order_id: orderInfo?.id ?? -1,
        tip_amount: tipDollars,
      })
        .then((resp_tip) => {
          if (resp_tip?.success != 1) {
            ShowErrorToast('Your review was saved, but the tip could not be processed.');
          }
        })
        .catch(() => {
          ShowErrorToast('Your review was saved, but the tip could not be processed.');
        });
    }

    ShowSuccessToast('Review submitted!');
    navigate.toCustomer.orders();
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
        <KeyboardAwareScrollView ref={scrollViewRef} contentContainerStyle={styles.pageView}>
          <View style={{ alignItems: 'center' }}>
            <StyledProfileImage url={getImageURL(chefInfo?.photo)} size={160} />
            <Text style={styles.chefName}>{`${chefInfo?.first_name} ${chefInfo?.last_name?.charAt(0) ?? ''}.`}</Text>
          </View>

          {orderInfo?.status == 3 && (
            <TouchableOpacity
              accessible={false}
              style={{
                width: '100%',
                backgroundColor: '#fa4616',
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={scrollToReviewSection}
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

          {/* A declined order is otherwise a dead end — give the customer a way
              straight back to Home to order from similar chefs. */}
          {orderInfo?.status == 5 && (
            <TouchableOpacity
              testID="customerOrderDetail.browseChefsButton"
              accessible={false}
              style={{
                width: '100%',
                backgroundColor: '#fa4616',
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={() => navigate.toCustomer.home()}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>
                  Order from similar chefs
                </Text>
                <Text style={{ color: '#ffffff', fontSize: 14, opacity: 0.9 }}>
                  We're sorry - this chef wasn't able to complete your request.
                  You'll be refunded in full.
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
            {(orderInfo?.parking_type || orderInfo?.parking_instructions) && (
              <Text style={styles.text}>
                {`Arrival & Parking: ${getParkingLabel(orderInfo.parking_type)}${orderInfo.parking_instructions ? ` · ${orderInfo.parking_instructions}` : ''}`}
              </Text>
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
              <Text
                style={styles.title}
                onLayout={(e) => { reviewSectionY.current = e.nativeEvent.layout.y; }}>
                Review your Experience
              </Text>
              <View style={[styles.card, { rowGap: 0 }]}>
                <TextInput
                  testID="customerOrderDetail.reviewInput"
                  multiline
                  maxLength={REVIEW_MAX_LENGTH}
                  placeholder="Type a message"
                  value={reviewText}
                  onChangeText={(text) => onChangeReviewText(truncateReview(text))}
                  variant={'outlined'}
                  color="#7f7f7f"
                  inputContainerStyle={{ paddingVertical: 10 }}
                  onFocus={() => setTimeout(scrollToReviewSection, 300)}
                />
                <Text style={{ color: '#7f7f7f', fontSize: 12, letterSpacing: 0.5, marginTop: 5, alignSelf: 'flex-end' }}>
                  {`${reviewText.length}/${REVIEW_MAX_LENGTH} Characters`}
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

                {/* Custom tip (#12): flat $ or % of the order total. */}
                <View style={styles.customTipRow}>
                  <View style={styles.customTipToggle}>
                    <TouchableOpacity
                      testID="customerOrderDetail.customTipDollar"
                      style={[
                        styles.customTipToggleBtn,
                        customTipMode === 'dollar' && styles.customTipToggleBtnActive,
                      ]}
                      onPress={() => setCustomTipMode('dollar')}
                    >
                      <Text
                        style={[
                          styles.customTipToggleText,
                          customTipMode === 'dollar' && styles.customTipToggleTextActive,
                        ]}
                      >
                        $
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID="customerOrderDetail.customTipPercent"
                      style={[
                        styles.customTipToggleBtn,
                        customTipMode === 'percent' && styles.customTipToggleBtnActive,
                      ]}
                      onPress={() => setCustomTipMode('percent')}
                    >
                      <Text
                        style={[
                          styles.customTipToggleText,
                          customTipMode === 'percent' && styles.customTipToggleTextActive,
                        ]}
                      >
                        %
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    testID="customerOrderDetail.customTipInput"
                    label={`Custom tip (${customTipMode === 'dollar' ? '$' : '%'})`}
                    keyboardType="decimal-pad"
                    variant={'outlined'}
                    color="#7f7f7f"
                    style={{ flex: 1 }}
                    value={customTip}
                    onChangeText={(text: string) => {
                      // Typing a custom tip clears any selected preset.
                      onChangeTipAmount(0);
                      setCustomTip(text.replace(/[^0-9.]/g, ''));
                    }}
                  />
                </View>
                {getTipDollars() > 0 && (
                  <Text style={styles.customTipPreview}>
                    {`Tip: $${getTipDollars().toFixed(2)}`}
                  </Text>
                )}

                <TouchableOpacity accessible={false} style={styles.btnPayment}>
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

                <TouchableOpacity
                  testID="customerOrderDetail.submitReviewButton"
                  style={[styles.btnSubmitButton, isSubmittingReview && { opacity: 0.6 }]}
                  onPress={handleSubmitReview}
                  disabled={isSubmittingReview}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnSubmitLabel}>
                    {isSubmittingReview ? 'SAVING...' : 'SAVE REVIEW'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAwareScrollView>

        <View style={styles.btnContainer}>
          <TouchableOpacity testID="customerOrderDetail.callButton" style={styles.btn} onPress={handleCall}>
            <FontAwesomeIcon icon={faPhone} color="#ffffff" size={20} />
            <Text style={styles.btnText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="customerOrderDetail.chatButton" style={styles.btn} onPress={handleChat}>
            <FontAwesomeIcon icon={faComment} color="#ffffff" size={20} />
            <Text style={styles.btnText}>Chat</Text>
          </TouchableOpacity>
          {


            (orderInfo?.status == 1 ||
              orderInfo?.status == 2 ||
              orderInfo?.status == 7) && (
              <TouchableOpacity testID="customerOrderDetail.cancelButton" style={styles.btn} onPress={handleCancel}>
                <FontAwesomeIcon icon={faXmark} color="#ffffff" size={20} />
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            )}
        </View>
      </Container>

      <PushPermissionModal
        visible={showPushModal}
        chefFirstName={chefInfo?.first_name ?? 'your chef'}
        onAccept={handleAcceptPush}
        onDecline={handleDeclinePush}
      />
    </SafeAreaView>
  );
};

export default OrderDetail;
