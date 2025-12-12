import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View
} from 'react-native';
// Types & Services
import { IOrder, IUser } from '../../../types/index';

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import { navigate } from '@/app/utils/navigation';
import { useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import React from 'react';
import EmptyListView from '../../../components/emptyListView/emptyListView';
import StyledProfileImage from '../../../components/styledProfileImage';
import StyledTabButton from '../../../components/styledTabButton';
import Container from '../../../layout/Container';
import { setNotificationOrderId } from '../../../reducers/deviceSlice';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import { setUser } from '../../../reducers/userSlice';
import { GetChefOrdersAPI, GetUserById, GetPaymentMethodAPI } from '../../../services/api';
import { getImageURL } from '../../../utils/functions';
import { ShowErrorToast, ShowSuccessToast } from '../../../utils/toast';
import { getDateStartTime } from '../../../utils/validations';
import ChefOrderCard from './components/chefOrderCard';
import SettingItem from './components/settingItem';
import { styles } from './styles';



const Home = () => {
  const self = useAppSelector(x => x.user.user);
  const users = useAppSelector(x => x.table.users);
  const menus = useAppSelector(x => x.table.menus);
  const profile = useAppSelector(x => x.chef.profile);
  const payment = useAppSelector(x => x.chef.paymentMehthod);
  const notificationOrderId = useAppSelector(
    x => x.device.notification_order_id,
  );
  const dispatch = useAppDispatch();
  const notification_id = useAppSelector(x => x.device.notification_id);

  const [passed, setPassed] = useState(false);
  const [tabId, onChangeTabId] = useState('1');
  const [orders, setOrders] = useState<Array<IOrder>>([]);

  const tabs = useMemo(
    () => [
      {
        id: '1',
        label: 'REQUESTED ',
        status: 1,
      },
      {
        id: '2',
        label: 'ACCEPTED ',
        status: 2,
        status1: 7,
      },
    ],
    [],
  );
const [refreshing, setRefreshing] = React.useState(false);

const onRefresh = async () => {
  setRefreshing(true);
  const now_time = moment().toDate().getTime() / 1000;
  await loadDatax(0, now_time);
  setRefreshing(false);
};
useFocusEffect(
    useCallback(() => {
      const today_time = getDateStartTime(moment()) / 1000;
      loadData(0, today_time + 24 * 3600);
    }, [notification_id]),
  );
  useEffect(() => {
    if (notificationOrderId >= 0) {
       const orderInfo = { id: notificationOrderId } as IOrder;
    navigate.toChef.orderDetail(orderInfo);

      dispatch(
        setNotificationOrderId({
          notification_id: '',
          notification_order_id: -1,
        }),
      );
    }
  }, []);

  useEffect(() => {
    // Redirect to welcome screen if chef is pending and hasn't completed quiz
    if (self.is_pending === 1 && self.quiz_completed === 0) {
      navigate.toChef.chefWelcome();
    }
    // If is_pending === 1 and quiz_completed === 1, show onboarding checklist (existing behavior below)
  }, []);

  useEffect(() => {
    const now_time = moment().toDate().getTime() / 1000;
    loadData(0, now_time);
  }, [])

  // useFocusEffect(
  // );
  // useEffect(() => {
  //   // Function to run every 30 seconds
  //   if (self?.is_pending != 1) {
  //     const interval = setInterval(() => {
  //       console.log('This code runs every 30 seconds');
  //       const now_time = moment().toDate().getTime() / 1000;
  //       loadData(0, now_time);
  //     }, 30000); // 30 seconds = 30000ms

  //     // Cleanup the interval on unmount
  //     return () => clearInterval(interval);
  //   }
  // }, []);
  // const chefInfo: IUser = route.params?.chefInfo;


  const loadData = async (start_time: number, end_time: number) => {
    dispatch(showLoading());
    const resp = await GetChefOrdersAPI({
      user_id: self.id ?? 0,
      start_time,
      end_time,
    });
    

    dispatch(hideLoading());
    if (resp.success == 1) {
      setOrders(resp.data);

    }
    if (self.is_pending == 1) {
      const resp1 = await GetUserById(self.id?.toString() ?? '0');
      if (resp1.success == 1 && dispatch) {
        dispatch(setUser(resp1.data));
      }
    }
  };
  const loadDatax = async (start_time: number, end_time: number) => {
    // dispatch(showLoading());
    const resp = await GetChefOrdersAPI({
      user_id: self.id ?? 0,
      start_time,
      end_time,
    });
    

    // dispatch(hideLoading());
    if (resp.success == 1) {
      setOrders(resp.data);

    }
    if (self.is_pending == 1) {
      const resp1 = await GetUserById(self.id?.toString() ?? '0');
      if (resp1.success == 1 && dispatch) {
        dispatch(setUser(resp1.data));
      }
    }
  };

  const handleOrderDetail = (orderInfo: IOrder, customerInfo: IUser) => {
        navigate.toChef.orderDetail(orderInfo, customerInfo);
  };

  const checkEmptyFieldInUserInfo = () => {
    const userInfo = { ...self };
    if (userInfo.first_name == undefined || userInfo.first_name.length == 0) {
      return 'Please enter the first name';
    }
    if (userInfo.last_name == undefined || userInfo.last_name.length == 0) {
      return 'Please enter the last name';
    }
    if (userInfo.birthday == undefined || userInfo.birthday == 0) {
      return 'Please select the birthday';
    }
    if (userInfo.address == undefined || userInfo.address.length == 0) {
      return 'Please enter the address';
    }
    if (userInfo.city == undefined || userInfo.city.length == 0) {
      return 'Please enter the city';
    }
    if (userInfo.state == undefined || userInfo.state.length == 0) {
      return 'Please select a state';
    }
    if (userInfo.zip == undefined || userInfo.zip.length == 0) {
      return 'Please enter the zip code';
    }
    if (
      userInfo.user_type === 2 &&
      (userInfo.photo == undefined || userInfo.photo.length == 0)
    ) {
      return 'Please add your photo';
    }
    return '';
  };

  // Check if a time value represents valid availability
  // Handles both "HH:MM" strings (new format) and timestamps (legacy format)
  const hasValidTime = (value: string | number | undefined): boolean => {
    if (!value) return false;
    if (value === '' || value === '0' || value === 0) return false;
    // String with colon = "HH:MM" format
    if (typeof value === 'string' && value.includes(':')) return true;
    // Large number = legacy timestamp
    if (typeof value === 'number' && value > 86400) return true;
    // Numeric string that's a timestamp
    if (typeof value === 'string' && /^\d{9,}$/.test(value)) return true;
    return false;
  };

  const checkEmptyFieldInProfile = () => {
    if (profile == undefined || profile.id == undefined) {
      return 'Please submit your profile';
    }
    if (profile.bio == undefined || profile.bio.length == 0) {
      return 'Please enter your bio';
    }
    const isAvailableSunday =
      hasValidTime(profile.sunday_start) && hasValidTime(profile.sunday_end);
    const isAvailableMonday =
      hasValidTime(profile.monday_start) && hasValidTime(profile.monday_end);
    const isAvailableTuesday =
      hasValidTime(profile.tuesday_start) && hasValidTime(profile.tuesday_end);
    const isAvailableWednesday =
      hasValidTime(profile.wednesday_start) && hasValidTime(profile.wednesday_end);
    const isAvailableThursday =
      hasValidTime(profile.thursday_start) && hasValidTime(profile.thursday_end);
    const isAvailableFriday =
      hasValidTime(profile.friday_start) && hasValidTime(profile.friday_end);
    const isAvailableSaturday =
      hasValidTime(profile.saterday_start) && hasValidTime(profile.saterday_end);
    if (
      !isAvailableSunday &&
      !isAvailableMonday &&
      !isAvailableTuesday &&
      !isAvailableWednesday &&
      !isAvailableThursday &&
      !isAvailableFriday &&
      !isAvailableSaturday
    ) {
      return 'Please enter your availability';
    }
    return '';
  };

  const selectedTab = tabs.find(x => x.id == tabId);
  const filteredOrders = orders.filter(x => x.status == selectedTab?.status);

  return (
    <SafeAreaView style={styles.main}>
      <Container>
        <ScrollView 
         refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }

        contentContainerStyle={styles.pageView}
        >
          <View style={styles.userContainer}>
            <StyledProfileImage url={getImageURL(self.photo)} size={80} />
            <Text style={styles.userName}>{`${self.first_name
              } ${self.last_name?.substring(0, 1)}. `}</Text>
          </View>
          {self.is_pending == 1 && (
            <>
              <View style={styles.onboardingHeader}>
                <Text style={styles.onboardingTitle}>Getting Started</Text>
                <Text style={styles.onboardingSubtitle}>Complete these steps to activate your chef account</Text>
              </View>
              <View style={styles.itemContainer}>
                <SettingItem
                  title={'1. Setup Your Account'}
                  completed={checkEmptyFieldInUserInfo() == ''}
                  isNext={checkEmptyFieldInUserInfo() !== ''}
                  onPress={() => {
                    navigate.toCommon.account(self, 'ChefHome');
                  }}
                />
                <SettingItem
                  title={'2. Create Your Menu'}
                  completed={menus.length > 0}
                  isNext={checkEmptyFieldInUserInfo() == '' && menus.length == 0}
                  onPress={() => {
                    if (checkEmptyFieldInUserInfo() !== '') {
                      ShowErrorToast('Setup Your Account!');
                      return;
                    }
                    navigate.toChef.menu();
                  }}
                />
                <SettingItem
                  title={'3. Complete Your Profile'}
                  completed={checkEmptyFieldInProfile() == ''}
                  isNext={checkEmptyFieldInUserInfo() == '' && menus.length > 0 && checkEmptyFieldInProfile() !== ''}
                  onPress={() => {
                    if (menus.length == 0) {
                      ShowErrorToast('Create Your Menu!');
                      return;
                    }
                    navigate.toChef.profile();
                  }}
                />
                <SettingItem
                  title={'4. Submit Payment Info'}
                  completed={payment?.verification_complete === true}
                  isNext={checkEmptyFieldInProfile() == '' && !payment?.stripe_account_id}
                  subtitle={
                    payment?.stripe_account_id && !payment?.verification_complete
                      ? 'Verification pending...'
                      : undefined
                  }
                  onPress={() => {
                    if (checkEmptyFieldInProfile() !== '') {
                      ShowErrorToast('Complete Your Profile');
                      return;
                    }

                    // If account exists but not verified, offer to refresh or continue
                    if (payment?.stripe_account_id && !payment?.verification_complete) {
                      Alert.alert(
                        'Stripe Verification',
                        'Your Stripe account is pending verification. What would you like to do?',
                        [
                          {
                            text: 'Refresh Status',
                            onPress: async () => {
                              await GetPaymentMethodAPI();
                              ShowSuccessToast('Status updated');
                            },
                          },
                          {
                            text: 'Continue Setup',
                            onPress: () => navigate.toChef.setupStrip(),
                          },
                          {
                            text: 'Cancel',
                            style: 'cancel',
                          },
                        ]
                      );
                    } else {
                      navigate.toChef.setupStrip();
                    }
                   }}
                />
                <SettingItem
                  title={'5. Background Check'}
                  completed={self.applicant_guid ? true : false}
                  isNext={payment?.verification_complete === true && !self.applicant_guid}
                  onPress={() => {
                    if (!payment?.verification_complete) {
                      ShowErrorToast('Complete Stripe verification first');
                      return;
                    }
                    navigate.toChef.backgroundCheck();
                   }}
                />
              </View>
            </>
          )}
          {self.is_pending != 1 && (
            <>
              <View style={styles.tabContainer}>
                {tabs.map((tab, idx) => {
                  return (
                    <StyledTabButton
                      title={tab.label}
                      style={styles.tab}
                      titleStyle={styles.tabText}
                      disabled={tab.id != tabId}
                      onPress={() => onChangeTabId(tab.id)}
                      key={`tab_${idx}`}
                    />
                  );
                })}
              </View>

              <View style={styles.orderCardContainer}>
                {filteredOrders.map((order, idx) => {
                  //cutomer side
                  const customer =
                    users.find(x => x.id == order.customer_user_id) ?? {};
                  return (
                    <ChefOrderCard
                      info={order}
                      customer={customer}
                      onPress={() => handleOrderDetail(order, customer)}
                      key={`order_${idx}`}
                    />
                  );
                })}
                {filteredOrders.length == 0 && (
                  <EmptyListView
                    text={`No ${selectedTab?.label.toLowerCase()} orders `}
                  />
                )}
              </View>
            </>
          )}
        </ScrollView>
      </Container>
    </SafeAreaView>
  );
};

export default Home;
