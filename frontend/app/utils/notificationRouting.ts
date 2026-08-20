import { IOrder, IUser } from '../types/index';

/**
 * Notification `data.type` values the app routes on. Kept in one place so the
 * foreground toast handler, the background/quit tap handler and the in-app
 * notifications list agree on what a payload means.
 */
export const NotificationTypes = {
  chatMessage: 'chat_message',
  orderRejected: 'order_rejected',
} as const;

export type ChatNotificationTarget = {
  userInfo: IUser;
  orderInfo: IOrder;
};

/**
 * Builds the chat screen's navigation params from an FCM payload.
 *
 * FCM delivers every `data` value as a string, and a payload missing the order
 * or the sender cannot open a thread — callers should fall back to the inbox
 * when this returns null rather than pushing a chat screen with no context.
 */
export const buildChatNavParams = (data: any): ChatNotificationTarget | null => {
  const orderId = parseInt((data?.order_id ?? '0').toString(), 10);
  const senderId = parseInt((data?.sender_id ?? '0').toString(), 10);

  if (!orderId || !senderId) return null;

  return {
    userInfo: {
      id: senderId,
      first_name: data?.sender_first_name || '',
      last_name: data?.sender_last_name || '',
      photo: data?.sender_photo || '',
    } as IUser,
    orderInfo: { id: orderId } as IOrder,
  };
};
