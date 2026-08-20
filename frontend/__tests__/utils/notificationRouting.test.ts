import { NotificationTypes, buildChatNavParams } from '../../app/utils/notificationRouting';

describe('buildChatNavParams', () => {
  it('turns an FCM chat payload into chat screen params', () => {
    const target = buildChatNavParams({
      type: NotificationTypes.chatMessage,
      order_id: '1802',
      sender_id: '9',
      sender_first_name: 'Chikondi',
      sender_last_name: 'Mwale',
      sender_photo: 'chikondi.jpg',
    });

    expect(target).toEqual({
      userInfo: {
        id: 9,
        first_name: 'Chikondi',
        last_name: 'Mwale',
        photo: 'chikondi.jpg',
      },
      orderInfo: { id: 1802 },
    });
  });

  it('coerces FCM string ids to numbers', () => {
    const target = buildChatNavParams({ order_id: '1802', sender_id: '9' });

    expect(typeof target!.orderInfo.id).toBe('number');
    expect(typeof target!.userInfo.id).toBe('number');
  });

  it('defaults missing sender name fields to empty strings', () => {
    const target = buildChatNavParams({ order_id: '5', sender_id: '7' });

    expect(target!.userInfo.first_name).toBe('');
    expect(target!.userInfo.last_name).toBe('');
    expect(target!.userInfo.photo).toBe('');
  });

  // Control: without an order or a sender there is no thread to open, so the
  // caller must fall back to the inbox instead of pushing an empty chat.
  it.each([
    ['missing order', { sender_id: '9' }],
    ['missing sender', { order_id: '1802' }],
    ['zero ids', { order_id: '0', sender_id: '0' }],
    ['empty payload', {}],
    ['undefined payload', undefined],
  ])('returns null for %s', (_label, payload) => {
    expect(buildChatNavParams(payload)).toBeNull();
  });
});
