import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useAppDispatch, useAppSelector } from './useRedux';
import { setUnreadCount } from '../reducers/notificationSlice';
import { GetUnreadCountAPI } from '../services/api';

export const useUnreadNotifications = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((x) => x.user.user);
  const unreadCount = useAppSelector((x) => x.notification.unreadCount);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    try {
      const resp = await GetUnreadCountAPI(user.id);
      if (resp.success) {
        dispatch(setUnreadCount(resp.count));
      }
    } catch (e) {
      console.warn('Failed to fetch unread count:', e);
    }
  }, [user?.id, dispatch]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
      }
    });
    return () => sub.remove();
  }, [refresh]);

  return { unreadCount, refresh };
};
