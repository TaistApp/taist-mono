import { useCallback, useState } from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import moment from 'moment-timezone';

import StyledButton from '../../../components/styledButton';
import Container from '../../../layout/Container';
import { useAppDispatch } from '../../../hooks/useRedux';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import { ClaimPoolRequestAPI, GetOpenPoolRequestsAPI } from '../../../services/api';
import { navigate } from '../../../utils/navigation';
import { ShowErrorToast, ShowSuccessToast } from '../../../utils/toast';
import { styles } from './styles';

interface IPoolRequest {
  id: number;
  category_name: string;
  portions: number;
  notes?: string;
  request_date: string;
  request_time: string;
  request_timestamp: number;
  timezone?: string;
  expires_at: number;
  customer_first_name: string;
  customer_city: string;
  your_menu_title: string;
  your_price: number;
}

/**
 * The pool feed: open dish requests this chef is eligible for. First chef to
 * accept wins the order at their own menu price.
 */
const OrderRequests = () => {
  const dispatch = useAppDispatch();
  const [requests, setRequests] = useState<Array<IPoolRequest>>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const loadData = async (silent = false) => {
    if (!silent) dispatch(showLoading());
    const resp = await GetOpenPoolRequestsAPI();
    if (!silent) dispatch(hideLoading());
    if (resp.success == 1) {
      setRequests(resp.data ?? []);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const handleAccept = async (item: IPoolRequest) => {
    if (claimingId !== null) return;
    setClaimingId(item.id);
    const resp = await ClaimPoolRequestAPI({ pool_request_id: item.id });
    setClaimingId(null);

    if (resp.success == 1) {
      ShowSuccessToast('The order is yours! 🎉');
      navigate.toChef.orderDetail({ id: resp.data.order_id });
    } else {
      ShowErrorToast(resp.error ?? 'Could not accept this request.');
      // Either way (claimed by someone else / expired), refresh the feed
      loadData(true);
    }
  };

  const formatWhen = (item: IPoolRequest) => {
    const tz = item.timezone || moment.tz.guess();
    return moment(item.request_timestamp * 1000).tz(tz).format('ddd, MMM D [at] h:mm A');
  };

  const expiresIn = (item: IPoolRequest) => {
    const mins = Math.max(0, Math.floor((item.expires_at - Date.now() / 1000) / 60));
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  };

  return (
    <SafeAreaView style={styles.main}>
      <Container backMode title="Order Requests">
        <ScrollView
          contentContainerStyle={styles.pageView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.subtitle}>
            Customers are requesting dishes you make. First chef to accept gets
            the order — at your menu price.
          </Text>

          {requests.map(item => (
            <View style={styles.card} key={`pool_${item.id}`}>
              <View style={styles.cardHeader}>
                <Text style={styles.categoryText}>{item.category_name}</Text>
                <Text style={styles.priceText}>{`$${item.your_price.toFixed(2)}`}</Text>
              </View>
              <Text style={styles.menuText}>{`Your dish: ${item.your_menu_title} × ${item.portions}`}</Text>
              <Text style={styles.detailText}>{formatWhen(item)}</Text>
              <Text style={styles.detailText}>
                {`${item.customer_first_name || 'Customer'}${item.customer_city ? ` · ${item.customer_city}` : ''}`}
              </Text>
              {item.notes ? (
                <Text style={styles.notesText}>{`"${item.notes}"`}</Text>
              ) : null}
              <Text style={styles.expiresText}>{`Offer expires in ${expiresIn(item)}`}</Text>
              <StyledButton
                testID={`orderRequests.accept.${item.id}`}
                title={claimingId === item.id ? 'ACCEPTING...' : 'ACCEPT ORDER'}
                disabled={claimingId !== null}
                onPress={() => handleAccept(item)}
                titleStyle={{ fontSize: 16, letterSpacing: 0.5 }}
              />
            </View>
          ))}

          {requests.length === 0 && (
            <View style={styles.emptyView}>
              <Text style={styles.emptyTitle}>No open requests right now</Text>
              <Text style={styles.emptyText}>
                When a customer requests a dish in one of your categories,
                it'll appear here — and you'll get a notification. Fastest
                chef wins!
              </Text>
            </View>
          )}
        </ScrollView>
      </Container>
    </SafeAreaView>
  );
};

export default OrderRequests;
