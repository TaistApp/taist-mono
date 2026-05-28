import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, SafeAreaView, SectionList, Text, TouchableOpacity, View } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';
import Container from '../../../layout/Container';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import { setUnreadCount } from '../../../reducers/notificationSlice';
import { GetNotifcationDataAPI, GetUnreadCountAPI, MarkNotificationsReadAPI } from '../../../services/api';
import { navigate } from '../../../utils/navigation';
import { ShowErrorToast } from '../../../utils/toast';
import NotificationCard from './components/NotificationCard';
import { styles } from './styles';

const Notification = () => {
  const dispatch = useAppDispatch();
  const self = useAppSelector(x => x.user.user);
  const [sections, setSections] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getNotifications();
      markAllRead();
    }, []),
  );

  const markAllRead = async () => {
    if (!self?.id) return;
    try {
      await MarkNotificationsReadAPI(self.id);
      dispatch(setUnreadCount(0));
    } catch (e) {
      console.warn('Failed to mark notifications read:', e);
    }
  };

  const buildSections = (notifications: any[]) => {
    const unread = notifications.filter((n: any) => !n.is_read);
    const read = notifications.filter((n: any) => n.is_read);

    const result = [];
    if (unread.length > 0) {
      result.push({ title: 'New', data: unread });
    }
    if (read.length > 0) {
      result.push({ title: 'Earlier', data: read });
    }
    if (result.length === 0 && notifications.length > 0) {
      result.push({ title: 'Earlier', data: notifications });
    }
    return result;
  };

  const getNotifications = async () => {
    try {
      dispatch(showLoading());
      const resp = await GetNotifcationDataAPI({ user_id: self?.id || -1 });
      if (resp.success == 1) {
        setSections(buildSections(resp?.data || []));
      } else {
        ShowErrorToast(resp.error);
      }
      dispatch(hideLoading());
    } catch (error) {
      console.log('error getting notifications: ', error);
      dispatch(hideLoading());
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      const resp = await GetNotifcationDataAPI({ user_id: self?.id || -1 });
      if (resp.success == 1) {
        setSections(buildSections(resp?.data || []));
      } else {
        ShowErrorToast(resp.error);
      }
      setRefreshing(false);
    } catch (error) {
      console.log('error getting notifications: ', error);
      setRefreshing(false);
    }
  };

  const pressMethod = (item: any) => {
    if (item?.role == 'chef' && !item?.body?.includes('Approved')) {
      navigate.toChef.orderDetail({
        id: item?.navigation_id,
      } as any);
    } else if (item?.role == 'user') {
      navigate.toCustomer.orderDetail({
        id: item?.navigation_id,
      } as any);
    }
  };

  return (
    <SafeAreaView style={styles.main}>
      <Container backMode title="Notifications">
        <SectionList
          sections={sections}
          keyExtractor={item => item?.id?.toString()}
          renderSectionHeader={({ section: { title } }) => (
            <View style={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 6,
            }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '700',
                color: '#888888',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}>
                {title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => pressMethod(item)}>
              <NotificationCard
                title={item?.title}
                body={item?.tip ?? item?.body}
                customer_image={item?.image}
                dish_image={item?.dish_image}
                time={item?.created_at}
              />
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          stickySectionHeadersEnabled={false}
        />
      </Container>
    </SafeAreaView>
  );
};
export default Notification;
