# Mobile App Navigation

Documentation of the Expo Router navigation structure and role-based routing.

---

## Table of Contents

1. [Overview](#overview)
2. [Navigation Structure](#navigation-structure)
3. [Role-Based Routing](#role-based-routing)
4. [Navigation Helpers](#navigation-helpers)
5. [Screen Organization](#screen-organization)
6. [Deep Linking](#deep-linking)

---

## Overview

Taist uses **Expo Router** for file-based navigation with:
- Role-based navigation stacks (Customer vs Chef)
- Tab navigation within each role
- Modal and stack navigation patterns

**Related Files:**
- Navigation: `frontend/app/screens/`
- Utilities: `frontend/app/utils/navigation.ts`
- Layouts: `frontend/app/screens/*/_layout.tsx`

---

## Navigation Structure

```
app/screens/
├── common/                    # Shared screens (both roles)
│   ├── login/
│   ├── signup/
│   ├── forgot/
│   ├── splash/
│   ├── chat/
│   ├── inbox/
│   ├── notification/
│   ├── map/
│   ├── account/
│   ├── contactUs/
│   ├── terms/
│   └── privacy/
│
├── customer/                  # Customer-only screens
│   ├── (tabs)/               # Tab navigator
│   │   ├── (home)/           # Home tab (nested stack)
│   │   │   ├── home/
│   │   │   ├── chefDetail/
│   │   │   ├── addToOrder/
│   │   │   └── checkout/
│   │   ├── orders/           # Orders tab
│   │   └── account/          # Account tab
│   ├── earnByCooking/
│   ├── cart/
│   └── orderDetail/
│
└── chef/                      # Chef-only screens
    ├── (tabs)/               # Tab navigator
    │   ├── home/
    │   ├── orders/
    │   ├── menu/
    │   ├── earnings/
    │   └── profile/
    ├── addMenuItem/
    ├── addOnCustomization/
    ├── orderDetail/
    ├── setupStrip/
    ├── backgroundCheck/
    ├── safetyQuiz/
    ├── onboarding/
    ├── chefWelcome/
    ├── howToDo/
    ├── feedback/
    └── cancelApplication/
```

---

## Role-Based Routing

### User Type Detection

```typescript
// After login, route based on user type
const handlePostLogin = (user: IUser) => {
  if (user.user_type === 1) {
    // Customer
    navigate.toCustomer.tabs();
  } else if (user.user_type === 2) {
    // Chef
    if (user.is_pending === 1) {
      navigate.toChef.onboarding();
    } else if (!user.quiz_completed) {
      navigate.toChef.safetyQuiz();
    } else {
      navigate.toChef.tabs();
    }
  }
};
```

### Layout Files

**Customer Layout:** `frontend/app/screens/customer/_layout.tsx`

```typescript
import { Stack } from 'expo-router';

export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="orderDetail" options={{ presentation: 'card' }} />
      <Stack.Screen name="earnByCooking" />
      <Stack.Screen name="cart" />
    </Stack>
  );
}
```

**Chef Layout:** `frontend/app/screens/chef/_layout.tsx`

```typescript
import { Stack } from 'expo-router';

export default function ChefLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="orderDetail" />
      <Stack.Screen name="addMenuItem" />
      <Stack.Screen name="addOnCustomization" />
      <Stack.Screen name="setupStrip" />
      <Stack.Screen name="backgroundCheck" />
      <Stack.Screen name="safetyQuiz" />
    </Stack>
  );
}
```

---

## Navigation Helpers

### Navigation Utility

**File:** `frontend/app/utils/navigation.ts`

```typescript
import { router } from 'expo-router';

export const navigate = {
  // Common screens
  toCommon: {
    login: () => router.replace('/screens/common/login'),
    signup: () => router.push('/screens/common/signup'),
    forgot: () => router.push('/screens/common/forgot'),
    splash: () => router.replace('/screens/common/splash'),
    chat: (params: { orderId: number; otherUserId: number }) =>
      router.push({ pathname: '/screens/common/chat', params }),
    inbox: () => router.push('/screens/common/inbox'),
    notification: () => router.push('/screens/common/notification'),
    map: (params?: any) => router.push({ pathname: '/screens/common/map', params }),
    account: () => router.push('/screens/common/account'),
    contactUs: () => router.push('/screens/common/contactUs'),
    terms: () => router.push('/screens/common/terms'),
    privacy: () => router.push('/screens/common/privacy'),
  },

  // Customer screens
  toCustomer: {
    tabs: () => router.replace('/screens/customer/(tabs)/(home)/home'),
    home: () => router.push('/screens/customer/(tabs)/(home)/home'),
    chefDetail: (params: { chefId: number }) =>
      router.push({ pathname: '/screens/customer/(tabs)/(home)/chefDetail', params }),
    addToOrder: (params: { menuId: number; chefId: number }) =>
      router.push({ pathname: '/screens/customer/(tabs)/(home)/addToOrder', params }),
    checkout: () => router.push('/screens/customer/(tabs)/(home)/checkout'),
    orders: () => router.push('/screens/customer/(tabs)/orders'),
    orderDetail: (params: { orderId: number }) =>
      router.push({ pathname: '/screens/customer/orderDetail', params }),
    earnByCooking: () => router.push('/screens/customer/earnByCooking'),
    cart: () => router.push('/screens/customer/cart'),
  },

  // Chef screens
  toChef: {
    tabs: () => router.replace('/screens/chef/(tabs)/home'),
    home: () => router.push('/screens/chef/(tabs)/home'),
    orders: () => router.push('/screens/chef/(tabs)/orders'),
    menu: () => router.push('/screens/chef/(tabs)/menu'),
    earnings: () => router.push('/screens/chef/(tabs)/earnings'),
    profile: () => router.push('/screens/chef/(tabs)/profile'),
    orderDetail: (params: { orderId: number }) =>
      router.push({ pathname: '/screens/chef/orderDetail', params }),
    addMenuItem: (params?: { menuId?: number }) =>
      router.push({ pathname: '/screens/chef/addMenuItem', params }),
    addOnCustomization: (params: { menuId: number }) =>
      router.push({ pathname: '/screens/chef/addOnCustomization', params }),
    setupStrip: () => router.push('/screens/chef/setupStrip'),
    backgroundCheck: () => router.push('/screens/chef/backgroundCheck'),
    safetyQuiz: () => router.push('/screens/chef/safetyQuiz'),
    onboarding: () => router.push('/screens/chef/onboarding'),
    chefWelcome: () => router.push('/screens/chef/chefWelcome'),
    howToDo: () => router.push('/screens/chef/howToDo'),
    feedback: () => router.push('/screens/chef/feedback'),
    cancelApplication: () => router.push('/screens/chef/cancelApplication'),
  },

  // Auth-based routing
  toAuthorizedStacks: {
    byUserType: (user: IUser) => {
      if (user.user_type === 1) {
        navigate.toCustomer.tabs();
      } else if (user.user_type === 2) {
        if (user.is_pending === 1) {
          navigate.toChef.onboarding();
        } else if (!user.quiz_completed) {
          navigate.toChef.safetyQuiz();
        } else {
          navigate.toChef.tabs();
        }
      }
    },
  },
};

// Go back
export const goBack = () => router.back();
```

### Usage Examples

```typescript
// Navigate to chef detail
navigate.toCustomer.chefDetail({ chefId: 123 });

// Navigate to order detail
navigate.toChef.orderDetail({ orderId: 456 });

// Replace with tabs (no back)
navigate.toCustomer.tabs();

// Go back
goBack();
```

---

## Screen Organization

### Tab Navigation

**Customer Tabs:** `frontend/app/screens/customer/(tabs)/_layout.tsx`

```typescript
import { Tabs } from 'expo-router';
import { HomeIcon, OrdersIcon, AccountIcon } from '../../../components/icons';

export default function CustomerTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: AppColors.primary,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => <OrdersIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <AccountIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
```

**Chef Tabs:** `frontend/app/screens/chef/(tabs)/_layout.tsx`

```typescript
import { Tabs } from 'expo-router';

export default function ChefTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      <Tabs.Screen name="menu" options={{ title: 'Menu' }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
```

### Nested Stack (Home Tab)

**File:** `frontend/app/screens/customer/(tabs)/(home)/_layout.tsx`

```typescript
import { Stack } from 'expo-router';

export default function HomeStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="chefDetail" />
      <Stack.Screen name="addToOrder" />
      <Stack.Screen name="checkout" />
    </Stack>
  );
}
```

---

## Deep Linking

### Push Notification Navigation

```typescript
// Handle notification tap
const handleNotificationPress = (notification: RemoteMessage) => {
  const { type, order_id, from_user_id } = notification.data;

  switch (type) {
    case 'new_order':
      navigate.toChef.orderDetail({ orderId: order_id });
      break;
    case 'order_accepted':
    case 'order_completed':
      navigate.toCustomer.orderDetail({ orderId: order_id });
      break;
    case 'chat_message':
      navigate.toCommon.chat({ orderId: order_id, otherUserId: from_user_id });
      break;
  }
};
```

### Stripe Return Handling

```typescript
// frontend/app/hooks/useStripeReturnHandler.ts
export const useStripeReturnHandler = () => {
  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      if (url.includes('stripe/return')) {
        // User returned from Stripe onboarding
        const params = parseUrl(url);
        if (params.success) {
          // Verify and navigate
          navigate.toChef.tabs();
        } else {
          // Handle failure
          navigate.toChef.setupStrip();
        }
      }
    };

    Linking.addEventListener('url', handleDeepLink);
    return () => Linking.removeEventListener('url', handleDeepLink);
  }, []);
};
```

### URL Scheme Configuration

**File:** `frontend/app.json`

```json
{
  "expo": {
    "scheme": "taist",
    "ios": {
      "associatedDomains": ["applinks:taist.com"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            { "scheme": "taist" },
            { "scheme": "https", "host": "taist.com" }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

---

## Screen Parameters

### Accessing Route Params

```typescript
import { useLocalSearchParams } from 'expo-router';

const ChefDetailScreen = () => {
  const { chefId } = useLocalSearchParams<{ chefId: string }>();

  // Use chefId
  const chefIdNum = parseInt(chefId, 10);
};
```

### Type-Safe Params

```typescript
// Define param types
type ChefDetailParams = {
  chefId: string;
};

type OrderDetailParams = {
  orderId: string;
};

// Use in component
const { chefId } = useLocalSearchParams<ChefDetailParams>();
```
