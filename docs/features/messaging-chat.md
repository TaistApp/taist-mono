# Messaging / Chat System

Documentation of the order-specific chat system between customers and chefs.

---

## Table of Contents

1. [Overview](#overview)
2. [Data Model](#data-model)
3. [API Endpoints](#api-endpoints)
4. [Message Flow](#message-flow)
5. [Frontend Implementation](#frontend-implementation)
6. [Read Receipts](#read-receipts)

---

## Overview

The messaging system enables order-specific communication between customers and chefs.

**Key Features:**
- Messages tied to specific orders
- Real-time message delivery
- Read receipts
- Conversation history

**Related Files:**
- Model: `backend/app/Models/Conversations.php`
- Frontend: `frontend/app/screens/common/chat/`
- Frontend: `frontend/app/screens/common/inbox/`

---

## Data Model

### Conversations Table

```sql
CREATE TABLE tbl_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_viewed TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,

    INDEX idx_conversations_order (order_id),
    INDEX idx_conversations_users (from_user_id, to_user_id)
);
```

### TypeScript Interface

```typescript
interface IConversation {
  id?: number;
  order_id: number;
  from_user_id: number;
  to_user_id: number;
  message: string;
  is_viewed: number | null;  // Timestamp when viewed
  created_at: number;        // Unix timestamp
  updated_at: number;
}
```

---

## API Endpoints

### Get Conversation List

```
GET /get_conversation_list_by_user_id?user_id={id}
```

Returns all conversations for a user, grouped by the other party.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "other_user_id": 123,
      "other_user_name": "John Smith",
      "other_user_photo": "url...",
      "last_message": "Sounds good!",
      "last_message_time": 1705432800,
      "unread_count": 2
    }
  ]
}
```

### Get Conversations by User

```
GET /get_conversations_by_user_id?user_id={id}&other_user_id={id}
```

Returns all messages between two users.

### Get Conversations by Order

```
GET /get_conversations_by_order_id?order_id={id}
```

Returns all messages for a specific order.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "order_id": 456,
      "from_user_id": 123,
      "to_user_id": 789,
      "message": "Hi, is the order still on track?",
      "is_viewed": null,
      "created_at": 1705432800
    },
    {
      "id": 2,
      "order_id": 456,
      "from_user_id": 789,
      "to_user_id": 123,
      "message": "Yes, preparing now!",
      "is_viewed": 1705432900,
      "created_at": 1705432850
    }
  ]
}
```

### Create Conversation (Send Message)

```
POST /create_conversation
```

**Request:**
```json
{
  "order_id": 456,
  "from_user_id": 123,
  "to_user_id": 789,
  "message": "Hi, when will my order be ready?"
}
```

### Update Conversation (Mark as Read)

```
POST /update_conversation/{id}
```

**Request:**
```json
{
  "is_viewed": 1705432900
}
```

---

## Message Flow

### Sending a Message

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│   Customer   │          │    Server    │          │     Chef     │
└──────┬───────┘          └──────┬───────┘          └──────┬───────┘
       │                         │                         │
       │  POST /create_conversation                        │
       │  (order_id, message)    │                         │
       │────────────────────────>│                         │
       │                         │                         │
       │                         │  Save to database       │
       │                         │  ──────────────────     │
       │                         │                         │
       │                         │  Send push notification │
       │                         │────────────────────────>│
       │                         │                         │
       │      Response: success  │                         │
       │<────────────────────────│                         │
       │                         │                         │
```

### Backend Implementation

```php
// MapiController@createConversation
public function createConversation(Request $request)
{
    $conversation = new Conversations();
    $conversation->order_id = $request->order_id;
    $conversation->from_user_id = $request->from_user_id;
    $conversation->to_user_id = $request->to_user_id;
    $conversation->message = $request->message;
    $conversation->save();

    // Send push notification
    $recipient = Listener::find($request->to_user_id);
    $sender = Listener::find($request->from_user_id);

    if ($recipient->fcm_token) {
        $this->sendPushNotification(
            $recipient->fcm_token,
            'New message from ' . $sender->first_name,
            $request->message,
            [
                'type' => 'chat_message',
                'order_id' => $request->order_id,
                'from_user_id' => $request->from_user_id,
            ]
        );
    }

    return response()->json([
        'success' => true,
        'data' => $conversation,
    ]);
}
```

---

## Frontend Implementation

### Chat Screen

**File:** `frontend/app/screens/common/chat/index.tsx`

```typescript
const ChatScreen = () => {
  const { orderId, otherUserId } = useLocalSearchParams();
  const self = useAppSelector(x => x.user.user);

  const [messages, setMessages] = useState<IConversation[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Load messages
  useEffect(() => {
    loadMessages();
  }, [orderId]);

  const loadMessages = async () => {
    const resp = await GetConversationsByOrderAPI({ order_id: orderId });
    if (resp.success) {
      setMessages(resp.data);
      markMessagesAsRead(resp.data);
    }
  };

  // Mark incoming messages as read
  const markMessagesAsRead = async (msgs: IConversation[]) => {
    const unread = msgs.filter(
      m => m.to_user_id === self.id && !m.is_viewed
    );

    for (const msg of unread) {
      await UpdateConversationAPI({
        id: msg.id,
        is_viewed: Date.now(),
      });
    }
  };

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    const resp = await CreateConversationAPI({
      order_id: orderId,
      from_user_id: self.id,
      to_user_id: otherUserId,
      message: newMessage.trim(),
    });

    if (resp.success) {
      setMessages([...messages, resp.data]);
      setNewMessage('');
    }
    setLoading(false);
  };

  return (
    <Container>
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isOwn={item.from_user_id === self.id}
          />
        )}
        keyExtractor={item => item.id.toString()}
        inverted
      />

      <View style={styles.inputContainer}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          style={styles.input}
        />
        <TouchableOpacity onPress={handleSend} disabled={loading}>
          <SendIcon />
        </TouchableOpacity>
      </View>
    </Container>
  );
};
```

### Message Bubble Component

```typescript
const MessageBubble = ({ message, isOwn }) => (
  <View style={[
    styles.bubble,
    isOwn ? styles.ownBubble : styles.otherBubble
  ]}>
    <Text style={styles.messageText}>{message.message}</Text>
    <View style={styles.metaRow}>
      <Text style={styles.timestamp}>
        {formatTime(message.created_at)}
      </Text>
      {isOwn && message.is_viewed && (
        <Text style={styles.readReceipt}>Read</Text>
      )}
    </View>
  </View>
);
```

### Inbox Screen

**File:** `frontend/app/screens/common/inbox/index.tsx`

```typescript
const InboxScreen = () => {
  const self = useAppSelector(x => x.user.user);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const resp = await GetConversationListAPI({ user_id: self.id });
    if (resp.success) {
      setConversations(resp.data);
    }
  };

  return (
    <Container>
      <FlatList
        data={conversations}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            onPress={() => navigate.toCommon.chat({
              orderId: item.order_id,
              otherUserId: item.other_user_id,
            })}
          />
        )}
        keyExtractor={item => item.other_user_id.toString()}
        ListEmptyComponent={<EmptyState title="No messages" />}
      />
    </Container>
  );
};
```

---

## Read Receipts

### How It Works

1. **Message sent:** `is_viewed = null`
2. **Recipient opens chat:** App calls `update_conversation` with timestamp
3. **Sender sees:** "Read" indicator on message

### Mark as Read

```typescript
// When chat screen opens
const markAsRead = async (messageId: number) => {
  await UpdateConversationAPI({
    id: messageId,
    is_viewed: Math.floor(Date.now() / 1000), // Unix timestamp
  });
};
```

### Display Read Status

```typescript
{isOwn && (
  <View style={styles.statusRow}>
    {message.is_viewed ? (
      <Text style={styles.read}>Read</Text>
    ) : (
      <Text style={styles.delivered}>Delivered</Text>
    )}
  </View>
)}
```

---

## Push Notifications

### Chat Message Notification

When a message is sent, recipient receives push notification:

```php
// In createConversation
$this->sendPushNotification(
    $recipient->fcm_token,
    'New message from ' . $sender->first_name,
    $request->message,
    [
        'type' => 'chat_message',
        'order_id' => $request->order_id,
        'from_user_id' => $request->from_user_id,
    ]
);
```

### Notification Handling (Frontend)

```typescript
// Handle incoming notification
messaging().onMessage(async remoteMessage => {
  if (remoteMessage.data?.type === 'chat_message') {
    // Refresh chat if on chat screen
    if (currentRoute === 'chat' && currentOrderId === remoteMessage.data.order_id) {
      loadMessages();
    }
    // Show local notification if not on chat
    else {
      showLocalNotification(
        remoteMessage.notification.title,
        remoteMessage.notification.body
      );
    }
  }
});
```

---

## Unread Count Badge

### Calculate Unread Messages

```php
// In getConversationListByUserID
$unreadCount = Conversations::where('to_user_id', $userId)
    ->whereNull('is_viewed')
    ->count();
```

### Display Badge

```typescript
const InboxIcon = () => {
  const unreadCount = useAppSelector(state => {
    // Count unread from conversations
    return state.table.conversations.filter(
      c => c.to_user_id === userId && !c.is_viewed
    ).length;
  });

  return (
    <View>
      <MessageIcon />
      {unreadCount > 0 && (
        <Badge count={unreadCount} />
      )}
    </View>
  );
};
```
