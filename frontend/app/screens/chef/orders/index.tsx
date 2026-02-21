import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

// Types & Services
import { IOrder, IUser } from '../../../types/index';

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import { useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import Container from '../../../layout/Container';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import { GetChefOrdersAPI } from '../../../services/api';
import { Delay } from '../../../utils/functions';
import { navigate } from '../../../utils/navigation';
import ChefOrderCard from './components/chefOrderCard';
import CustomCalendar from './components/customCalendar';
import { styles } from './styles';


const Orders = () => {
  const self = useAppSelector(x => x.user.user);
  const users = useAppSelector(x => x.table.users);
  const notification_id = useAppSelector(x => x.device.notification_id);
  const dispatch = useAppDispatch();

  const [DAY, onChangeDAY] = useState(moment());
  const [orders, setOrders] = useState<Array<IOrder>>([]);
  const [tabId, onChangeTabId] = useState('1');

  // Set date range for calendar (past 3 months to future 3 months)
  const startDate = moment().subtract(3, 'months');
  const endDate = moment().add(3, 'months');

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
      {
        id: '3',
        label: 'COMPLETED ',
        status: 3,
      },
      {
        id: '4',
        label: 'CANCELLED ',
        status: 4,
        status1: 5,
      },
    ],
    [],
  );

  useFocusEffect(
    useCallback(() => {
      console.log('notification_id: ----');  
      loadData();
    }, [notification_id]),
  );

  // Load data when date changes
  useEffect(() => {
    loadData();
  }, [DAY]);

  const loadData = async () => {
    console.log('notification_id: ');
    const start_time = moment(DAY).startOf('day').unix();
    const end_time = moment(DAY).endOf('day').unix();
    
    dispatch(showLoading());
    const resp = await GetChefOrdersAPI({
      user_id: self.id ?? 0,
      start_time,
      end_time,
    });
    dispatch(hideLoading());
    if (resp.success == 1) {
      setOrders(resp.data);
      console.log('orders data; ', resp?.data);
    }
  };

  const handleDayPress = async (day: moment.Moment) => {
    onChangeDAY(day);
    await Delay(10);
    loadData();
  };

  const handleOrderDetail = (orderInfo: IOrder, customerInfo: IUser) => {
    navigate.toChef.orderDetail(orderInfo, customerInfo);
  };

  const tab = ({ tabId, selectedTabId, tabs, onPress, testID }: any) => {
    var thisTab = tabs.find((tt: any) => tt.id == tabId);
    return (
      <TouchableOpacity
        testID={testID}
        key={`tab_${tabId}`}
        style={tabId === selectedTabId ? styles.tab : styles.tab_disabled}
        onPress={onPress}>
        <Text
          style={
            tabId === selectedTabId ? styles.tabText : styles.tabText_disabled
          }
          numberOfLines={1}>
          {thisTab?.label || 'Tab'}
        </Text>
      </TouchableOpacity>
    );
  };


  const selectedTab = tabs.find(x => x.id == tabId);
  const filteredOrders = orders.filter(
    x =>
      x.status == selectedTab?.status ||
      (selectedTab?.status1 && x.status == selectedTab.status1),
  );

  return (
    <Container>
      {self.is_pending == 1 ? (
        <View style={styles.pageEmptyView}>
          <Text style={styles.title}>You currently have no requests </Text>
          <Image
            source={require('../../../assets/images/orders_empty.png')}
            style={styles.emptyImg}
          />
          <Text style={styles.text}>
            Refer to the Main Menu in the Home tab to help you get the
            customers you deserve!{' '}
          </Text>
          <Text style={styles.notificationText}>
            You'll receive a notification when you get an order request!
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.pageView}>
          <View style={{ width: '100%' }}>
            <CustomCalendar
              selectedDate={DAY}
              onDateSelect={handleDayPress}
              minDate={startDate}
              maxDate={endDate}
            />
          </View>
          <View style={styles.tabContainer}>
            {tabs.map((item, idx) => {
              return tab({
                testID: `chefOrders.statusTab.${idx}`,
                tabId: item.id,
                selectedTabId: tabId,
                tabs: tabs,
                onPress: () => {
                  onChangeTabId(item.id);
                },
              });
            })}
          </View>

          <View style={styles.orderCardContainer}>
            {filteredOrders.map((order, idx) => {
              const customer =
                users.find(x => x.id == order.customer_user_id) ?? {};
              return (
                <ChefOrderCard
                  testID={`chefOrders.orderCard.${idx}`}
                  info={order}
                  customer={customer}
                  onPress={() => handleOrderDetail(order, customer)}
                  key={`order_${idx}`}
                />
              );
            })}
            {filteredOrders.length == 0 && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#ffffff', fontSize: 16, textAlign: 'center', letterSpacing: 0.5 }}>
                  {`No ${selectedTab?.label?.toLowerCase() || 'orders'} orders`}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </Container>
  );
};

export default Orders;
