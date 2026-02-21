import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, View } from 'react-native';

// Types & Services
import { IOrder, IUser } from '../../../types/index';

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import { useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import EmptyListView from '../../../components/emptyListView/emptyListView';
import StyledTabButton from '../../../components/styledTabButton';
import Container from '../../../layout/Container';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import { GetCustomerOrdersAPI } from '../../../services/api';
import { navigate } from '../../../utils/navigation';
import {
  getDateStartTime
} from '../../../utils/validations';
import OrderCard from './components/orderCard';
import { styles } from './styles';

const Orders = () => {
  const self = useAppSelector(x => x.user.user);
  const users = useAppSelector(x => x.table.users);
  const notification_id = useAppSelector(x => x.device.notification_id);
  const dispatch = useAppDispatch();

  const [orders, setOrders] = useState<Array<IOrder>>([]);
  const [tabId, onChangeTabId] = useState('1');

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
const [refreshing, setRefreshing] = useState(false);

// ...existing code...

const onRefresh = async () => {
  setRefreshing(true);
  const today_time = getDateStartTime(moment()) / 1000;
  await loadDatax(0, today_time + 24 * 3600);
  setRefreshing(false);
};
  useFocusEffect(
    useCallback(() => {
      const today_time = getDateStartTime(moment()) / 1000;
      loadData(0, today_time + 24 * 3600);
    }, [notification_id]),
  );

  const loadData = async (start_time: number, end_time: number) => {
    dispatch(showLoading());
    const resp = await GetCustomerOrdersAPI({
      user_id: self.id ?? 0,
      start_time,
      end_time,
    });
    dispatch(hideLoading());
    if (resp.success == 1) {
      setOrders(resp.data);
    }
  };
  const loadDatax = async (start_time: number, end_time: number) => {
    // dispatch(showLoading());
    const resp = await GetCustomerOrdersAPI({
      user_id: self.id ?? 0,
      start_time,
      end_time,
    });
    // dispatch(hideLoading());
    if (resp.success == 1) {
      setOrders(resp.data);
    }
  };

  const handleOrderDetail = (orderInfo: IOrder, chefInfo: IUser) => {
    navigate.toCustomer.orderDetail(orderInfo, chefInfo);
  };

  const selectedTab = tabs.find(x => x.id == tabId);
  const filteredOrders = orders.filter(
    x =>
      x.status == selectedTab?.status ||
      (selectedTab?.status1 && x.status == selectedTab.status1),
  );

  return (
    <SafeAreaView style={styles.main}>
      <Container>
        <ScrollView
        contentContainerStyle={styles.pageView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
          <View style={styles.tabContainer}>
            {tabs.map((item, idx) => {
              return (
                <StyledTabButton
                  testID={`customerOrders.statusTab.${idx}`}
                  title={item.label}
                  disabled={item.id != tabId}
                  titleStyle={styles.tabText}
                  style={styles.tab}
                  onPress={() => onChangeTabId(item.id)}
                  key={`tab_${idx}`}
                />
              );
            })}
          </View>

          <View style={styles.orderCardContainer}>
            {filteredOrders.map((item, index) => {
              const chefInfo = users.find(x => x.id == item.chef_user_id) ?? {};
              return (
                <OrderCard
                  testID={`customerOrders.orderCard.${index}`}
                  chefInfo={chefInfo}
                  orderInfo={item}
                  onPress={() => handleOrderDetail(item, chefInfo)}
                  key={`o_${index}`}
                />
              );
            })}
            {filteredOrders.length == 0 && (
              <EmptyListView
                text={`No ${selectedTab?.label.toLowerCase()} orders `}
              />
            )}
          </View>
        </ScrollView>
      </Container>
    </SafeAreaView>
  );
};

export default Orders;
