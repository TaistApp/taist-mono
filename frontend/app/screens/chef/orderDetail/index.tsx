import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// NPM
import {
  faCamera,
  faChevronRight,
  faComment,
  faLocationDot,
  faMap,
  faPhone,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLocalSearchParams } from 'expo-router';
import ImagePicker from 'react-native-image-crop-picker';
import { StarRatingDisplay } from 'react-native-star-rating-widget';

// Types & Services
import { IMenu, IOrder, IUser, NavigationStackType } from '../../../types/index';

// Hooks
import { useAppDispatch } from '../../../hooks/useRedux';

import StyledButton from '../../../components/styledButton';
import Container from '../../../layout/Container';
import { AppColors } from '../../../../constants/theme';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import {
  CancelOrderPaymentAPI,
  CompleteOrderPaymentAPI,
  GetOrderDataAPI,
  RejectOrderPaymentAPI,
  UpdateOrderStatusAPI,
  UploadDishPhotoAPI,
} from '../../../services/api';
import { OrderStatus } from '../../../types/status';
import { GetOrderString } from '../../../utils/functions';
import { goBack, navigate } from '../../../utils/navigation';
import { ShowErrorToast, ShowSuccessToast } from '../../../utils/toast';
import { getFormattedDateTime, getFormattedDateTimeInTimezone } from '../../../utils/validations';
import { getParkingLabel } from '../../../constants/parkingTypes';
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
  const [showPhotoPrompt, setShowPhotoPrompt] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<number | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
    } else if (resp.data.status == 3) {
      setCompletedOrderId(resp.data.id);
      setShowPhotoPrompt(true);
    } else {
      goBack();
    }
  };

  const handleTakePhoto = () => {
    ImagePicker.openCamera({ width: 1000, height: 1000, cropping: true, compressImageQuality: 0.8 })
      .then(image => {
        setPhotoUri(image.path);
      })
      .catch(() => {});
  };

  const handleChooseFromLibrary = () => {
    ImagePicker.openPicker({ width: 1000, height: 1000, cropping: true, compressImageQuality: 0.8 })
      .then(image => {
        setPhotoUri(image.path);
      })
      .catch(() => {});
  };

  const handleUploadDishPhoto = async () => {
    if (!photoUri || !completedOrderId) return;
    setIsUploading(true);
    const resp = await UploadDishPhotoAPI({ order_id: completedOrderId, photo_uri: photoUri });
    setIsUploading(false);
    if (resp.success === 1) {
      ShowSuccessToast('Photo uploaded! Thanks for sharing.');
    } else {
      ShowErrorToast(resp.error || 'Upload failed.');
    }
    setShowPhotoPrompt(false);
    goBack();
  };

  const handleSkipPhoto = () => {
    setShowPhotoPrompt(false);
    goBack();
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
            <TouchableOpacity accessible={false} style={styles.cardMainTappable} onPress={handleMap} activeOpacity={0.7}>
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
                <TouchableOpacity accessible={false} style={styles.cardMainTappable} onPress={handleCall} activeOpacity={0.7}>
                  <FontAwesomeIcon icon={faPhone} color="#fa4616" size={20} />
                  <View style={{ flex: 1, rowGap: 5 }}>
                    <Text style={styles.text}>{customerInfo?.phone ?? ''}</Text>
                  </View>
                  <FontAwesomeIcon icon={faChevronRight} color="#999" size={16} />
                </TouchableOpacity>
              </>
            )}
          </View>

          {(orderInfo?.parking_type || orderInfo?.parking_instructions) && (
            <View style={[styles.card, { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 20 }}>
                  {getParkingLabel(orderInfo.parking_type)?.split(' ')[0] || '🅿️'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.text, { fontWeight: '700', marginBottom: 2 }]}>
                    Arrival & Parking
                  </Text>
                  <Text style={styles.text}>
                    {getParkingLabel(orderInfo.parking_type) || 'See instructions'}
                  </Text>
                  {orderInfo.parking_instructions ? (
                    <Text style={[styles.text, { color: AppColors.textSecondary, marginTop: 4 }]}>
                      {orderInfo.parking_instructions}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          )}

          {/* <Text style={styles.title}>Order Details</Text> */}
          <View style={styles.card}>
            <View style={[styles.cardMain, { justifyContent: 'space-between' }]}>
              <View style={{ rowGap: 5 }}>
                <Text style={styles.text} numberOfLines={1}>
                  Order ID
                </Text>
                <Text style={styles.text} numberOfLines={1}>
                  Arrival Time
                </Text>
                <Text style={styles.text} numberOfLines={1}>
                  Status
                </Text>
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
                <Text style={styles.text}>{`Special Instructions: ${orderInfo.notes ?? ''}`}</Text>
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
                        testID="chefOrderDetail.acceptButton"
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
                        testID="chefOrderDetail.onMyWayButton"
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
                        testID="chefOrderDetail.completedButton"
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
                        testID="chefOrderDetail.cancelButton"
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
                        testID="chefOrderDetail.rejectButton"
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
            <TouchableOpacity testID="chefOrderDetail.callButton" style={styles.btn} onPress={handleCall}>
              <FontAwesomeIcon icon={faPhone} color="#ffffff" size={20} />
              <Text style={styles.btnText}>Call</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity testID="chefOrderDetail.chatButton" style={styles.btn} onPress={handleChat}>
            <FontAwesomeIcon icon={faComment} color="#ffffff" size={20} />
            <Text style={styles.btnText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="chefOrderDetail.mapButton" style={styles.btn} onPress={handleMap}>
            <FontAwesomeIcon icon={faMap} color="#ffffff" size={20} />
            <Text style={styles.btnText}>Map</Text>
          </TouchableOpacity>
        </View>
      </Container>

      <Modal
        visible={showPhotoPrompt}
        animationType="slide"
        transparent={true}
        onRequestClose={handleSkipPhoto}
      >
        <View style={photoStyles.overlay}>
          <View style={photoStyles.modal}>
            <FontAwesomeIcon icon={faCamera} color={AppColors.primary} size={36} />
            <Text style={photoStyles.title}>Snap a Dish Photo?</Text>
            <Text style={photoStyles.subtitle}>
              Help us showcase your {menu?.title || 'dish'}! Quick photo for our socials.
            </Text>

            {photoUri ? (
              <View style={photoStyles.previewContainer}>
                <Image source={{ uri: photoUri }} style={photoStyles.preview} />
                <TouchableOpacity onPress={() => setPhotoUri(null)} style={photoStyles.retakeBtn}>
                  <Text style={photoStyles.retakeText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={photoStyles.buttonRow}>
                <TouchableOpacity onPress={handleTakePhoto} style={photoStyles.captureBtn}>
                  <FontAwesomeIcon icon={faCamera} color="#fff" size={20} />
                  <Text style={photoStyles.captureBtnText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleChooseFromLibrary} style={[photoStyles.captureBtn, { backgroundColor: AppColors.textSecondary }]}>
                  <Text style={photoStyles.captureBtnText}>Library</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={photoStyles.actionRow}>
              {photoUri && (
                <StyledButton
                  title={isUploading ? 'Uploading...' : 'Submit Photo'}
                  onPress={handleUploadDishPhoto}
                  style={{ flex: 1 }}
                  titleStyle={{ fontSize: 16 }}
                />
              )}
              <TouchableOpacity onPress={handleSkipPhoto} style={photoStyles.skipBtn}>
                <Text style={photoStyles.skipText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const photoStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  captureBtn: {
    flex: 1,
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  captureBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  retakeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  retakeText: {
    color: AppColors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  actionRow: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default OrderDetail;
