import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
// Types & Services
import { IOrder, IUser } from '../../../types/index';

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import { navigate } from '@/app/utils/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faShareNodes } from '@fortawesome/free-solid-svg-icons';
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
import { GetChefOrdersAPI, GetChefProfileAPI, GetUserById, GetPaymentMethodAPI, ReactivateAccountAPI, getChefShareUrl } from '../../../services/api';
import { getImageURL, formatDisplayName } from '../../../utils/functions';
import { ShowErrorToast, ShowSuccessToast } from '../../../utils/toast';
import { getDateStartTime } from '../../../utils/validations';
import ChefOrderCard from './components/chefOrderCard';
import SettingItem from './components/settingItem';
import StripeOnboardingDialog from './components/stripeOnboardingDialog';
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
  const [stripeDialogVisible, setStripeDialogVisible] = useState(false);

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
  // Fresh pending chef (quiz not done) is redirected straight to the welcome
  // screen — skip the orders/user fetches so the redirect isn't blocked behind
  // a loading spinner.
  const redirectingToWelcome = self.is_pending === 1 && self.quiz_completed === 0;

  // Only the very first load blocks behind the full-screen spinner. Every later
  // refocus (e.g. returning from the Stripe flow, or reopening the app after the
  // account was activated) refreshes silently in the background so the chef
  // isn't stuck staring at a loading overlay each time.
  const hasLoadedOnce = useRef(false);

useFocusEffect(
    useCallback(() => {
      if (redirectingToWelcome) return;
      const today_time = getDateStartTime(moment()) / 1000;
      if (hasLoadedOnce.current) {
        loadDatax(0, today_time + 24 * 3600);
      } else {
        hasLoadedOnce.current = true;
        loadData(0, today_time + 24 * 3600);
      }
      // Checklist step 5 (weekly hours) reads the availability row; refresh
      // it whenever the chef comes back here (e.g. from the profile screen).
      if (self.is_pending == 1 && self.id) {
        GetChefProfileAPI({ user_id: self.id }, dispatch);
      }
    }, [notification_id, redirectingToWelcome, self.is_pending, self.id]),
  );

  // An approved chef is only visible in customer search on days with hours
  // set — a chef with no availability row is invisible despite being Active.
  const hasWeeklyHours = useMemo(() => {
    const p: any = profile ?? {};
    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saterday', 'sunday'].some(
      day => p[`${day}_start`] && p[`${day}_start`] !== '0' && p[`${day}_end`] && p[`${day}_end`] !== '0',
    );
  }, [profile]);
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

  // (Initial load is handled by the focus effect above — no separate mount
  // fetch, which previously double-loaded and double-showed the spinner.)

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

  const handleReactivate = async () => {
    dispatch(showLoading());
    const resp = await ReactivateAccountAPI(self, dispatch);
    dispatch(hideLoading());
    if (resp.success !== 1) {
      ShowErrorToast(resp.error || resp.message || 'Could not reactivate. Please try again.');
      return;
    }
    ShowSuccessToast('Welcome back! Your account is active again.');
  };

  const handleShareProfile = async () => {
    const url = getChefShareUrl(self.id ?? 0);
    try {
      await Share.share({
        message: `Order from my menu on Taist! ${url}`,
        url,
      });
    } catch (_) {}
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

  // Paused chefs see a dedicated reactivation screen instead of the dashboard
  // or onboarding checklist. They remain logged in and hidden from customers.
  if (self.is_paused == 1) {
    return (
      <SafeAreaView style={styles.main}>
        <Container>
          <View style={styles.pausedContainer}>
            <StyledProfileImage url={getImageURL(self.photo)} size={80} />
            <Text style={styles.pausedTitle}>Your account is paused</Text>
            <Text style={styles.pausedSubtitle}>
              You're hidden from customers and won't get availability reminders.
              Your profile, menus, and reviews are safe. Reactivate whenever
              you're ready to cook again.
            </Text>
            <TouchableOpacity
              testID="chefHome.reactivateButton"
              onPress={handleReactivate}
              style={styles.reactivateButton}
              activeOpacity={0.7}>
              <Text style={styles.reactivateButtonText}>Reactivate My Account</Text>
            </TouchableOpacity>
          </View>
        </Container>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.userName}>{`${
              self.first_name || self.last_name
                ? formatDisplayName(self.first_name, self.last_name)
                : 'Taist Chef'
            } `}</Text>
          </View>
          {self.is_pending != 1 && checkEmptyFieldInProfile() !== '' && (
            <View style={styles.itemContainer}>
              <View style={styles.onboardingHeader}>
                <Text style={styles.onboardingTitle}>Finish Your Setup</Text>
                <Text style={styles.onboardingSubtitle}>
                  Complete your profile so customers can find and book you
                </Text>
              </View>
              <SettingItem
                title={'Complete Your Profile'}
                completed={false}
                isNext={true}
                onPress={() => navigate.toChef.profile()}
              />
            </View>
          )}
          {self.is_pending != 1 && (
            <TouchableOpacity
              testID="chefHome.shareButton"
              onPress={handleShareProfile}
              style={styles.shareButton}
              activeOpacity={0.7}
            >
              <FontAwesomeIcon icon={faShareNodes} size={16} color="#fff" />
              <Text style={styles.shareButtonText}>Share My Profile</Text>
            </TouchableOpacity>
          )}
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
                  title={'3. Submit Payment Info'}
                  completed={payment?.verification_complete === true}
                  isNext={menus.length > 0 && !payment?.stripe_account_id}
                  subtitle={
                    payment?.stripe_account_id && !payment?.verification_complete
                      ? 'Verification pending...'
                      : undefined
                  }
                  onPress={() => {
                    if (menus.length == 0) {
                      ShowErrorToast('Create Your Menu!');
                      return;
                    }
                    setStripeDialogVisible(true);
                   }}
                />
                <SettingItem
                  title={'4. Background Check'}
                  completed={self.applicant_guid ? true : false}
                  subtitle={'Powered by SafeScreener'}
                  isNext={payment?.verification_complete === true && !self.applicant_guid}
                  onPress={() => {
                    if (!payment?.verification_complete) {
                      ShowErrorToast('Complete Stripe verification first');
                      return;
                    }
                    navigate.toChef.backgroundCheck();
                   }}
                />
                <SettingItem
                  title={'5. Set Your Weekly Hours'}
                  completed={hasWeeklyHours}
                  subtitle={'Customers only see you on days you set hours'}
                  isNext={!!self.applicant_guid && !hasWeeklyHours}
                  onPress={() => {
                    navigate.toChef.profile();
                  }}
                />
              </View>
            </>
          )}
          {self.is_pending != 1 && (
            <>
              <View style={styles.tabContainer}>
                {tabs.map((tab, idx) => {
                  const isActive = tab.id == tabId;
                  return (
                    <StyledTabButton
                      testID={`chefHome.tab.${idx}`}
                      title={tab.label}
                      // Active filter is filled orange; the other is muted so
                      // it's obvious which of Requested/Accepted is selected.
                      // (Previously both used styles.tab, so they looked
                      // identical and the active filter wasn't distinguishable.)
                      style={isActive ? styles.tab : styles.tab_disabled}
                      titleStyle={isActive ? styles.tabText : styles.tabText_disabled}
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
                      testID={`chefHome.orderCard.${idx}`}
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
      <StripeOnboardingDialog
        visible={stripeDialogVisible}
        onClose={() => setStripeDialogVisible(false)}
        hasPendingAccount={
          !!payment?.stripe_account_id && !payment?.verification_complete
        }
      />
    </SafeAreaView>
  );
};

export default Home;
