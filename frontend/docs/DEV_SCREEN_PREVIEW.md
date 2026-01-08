# Dev Screen Preview System

A development tool that lets you skip directly to any screen in the app without logging in or navigating through flows.

---

## Quick Start

```bash
# Jump directly to chef menu screen
npm run dev:chef-menu

# Jump to customer home
npm run dev:customer-home

# See all available scripts
npm run | grep dev:
```

### Available Scripts

| Script | Screen | User Type |
|--------|--------|-----------|
| `npm run dev:chef-menu` | Chef Menu | Chef |
| `npm run dev:chef-home` | Chef Home | Chef |
| `npm run dev:chef-orders` | Chef Orders | Chef |
| `npm run dev:chef-add-item` | Add Menu Item | Chef |
| `npm run dev:chef-profile` | Chef Profile | Chef |
| `npm run dev:customer-home` | Customer Home | Customer |
| `npm run dev:customer-orders` | Customer Orders | Customer |
| `npm run dev:login` | Login Screen | None |

### Custom Screen Navigation

For any screen not in the shortcuts above:

```bash
# Format: APP_ENV=staging DEV_SCREEN="<path>" DEV_USER_TYPE=<chef|customer> expo start

# Examples:
APP_ENV=staging DEV_SCREEN="/screens/chef/earnings" DEV_USER_TYPE=chef expo start
APP_ENV=staging DEV_SCREEN="/screens/customer/cart" DEV_USER_TYPE=customer expo start
APP_ENV=staging DEV_SCREEN="/screens/common/signup" expo start
```

**Note:** Always include `APP_ENV=staging` to ensure the app connects to the staging server where test accounts exist.

---

## How It Works

1. **Environment Variables**: `DEV_SCREEN` and `DEV_USER_TYPE` are passed to the app via `app.config.js`
2. **Splash Screen Check**: On app load, splash screen checks for `DEV_SCREEN`
3. **Mock User**: If `DEV_USER_TYPE` is set, a mock user is created in Redux
4. **Direct Navigation**: App navigates directly to the specified screen, skipping auth

### Safety Features

- Only works in `__DEV__` mode - completely ignored in production builds
- Mock users have `id: 999` to easily identify dev sessions
- Normal app flow is untouched when env vars are not set

---

## Background: Common Developer Approaches

### Option A: Environment Variable + Initial Route (Simplest)

**How it works:**
```bash
# Jump directly to chef menu screen
DEV_SCREEN=/screens/chef/(tabs)/menu npm start

# Jump to customer checkout
DEV_SCREEN=/screens/customer/checkout npm start
```

**Pros:**
- Zero runtime overhead in production
- Works with hot reload
- Simple to implement

**Cons:**
- Must restart to change screens
- Can't test screens that need route params easily

---

### Option B: Dev Menu Screen (Most Flexible)

**How it works:**
- Triple-tap anywhere or shake device opens dev menu
- Shows list of all screens grouped by section
- Can mock different user types
- Persists last selection for quick access

```
┌─────────────────────────────────┐
│  🛠️ Dev Screen Navigator       │
├─────────────────────────────────┤
│  👤 Mock User: [Chef ▼]         │
│                                 │
│  📁 Chef Screens                │
│  ├─ Home                        │
│  ├─ Menu (empty state) ←        │
│  ├─ Menu (with items)           │
│  ├─ Orders                      │
│  ├─ Add Menu Item               │
│  └─ Order Detail                │
│                                 │
│  📁 Customer Screens            │
│  ├─ Home                        │
│  └─ ...                         │
│                                 │
│  📁 Common Screens              │
│  ├─ Login                       │
│  └─ ...                         │
└─────────────────────────────────┘
```

**Pros:**
- Change screens without restart
- Can include screen variants (empty state, with data)
- Can mock different user states
- Can include mock data for param-dependent screens

**Cons:**
- More code to build and maintain
- Small bundle size increase (can tree-shake in prod)

---

### Option C: Deep Linking (Production-Ready)

**How it works:**
```bash
# From terminal
npx uri-scheme open "taist://screens/chef/menu" --ios

# From Expo Go
exp://localhost:8081/--/screens/chef/menu
```

**Pros:**
- Works on real devices
- Shareable URLs for QA team
- Can link from Slack, tickets, etc.

**Cons:**
- Requires linking config
- Auth still blocks some screens
- Need separate auth bypass

---

## Recommended Implementation

### Phase 1: Quick Start (Option A)
Add env-based initial route override. Get working in 30 minutes.

### Phase 2: Dev Menu (Option B)
Build a dev menu for more flexibility. Takes 2-3 hours.

### Phase 3: Deep Linking (Option C)
Add for QA team and production debugging. Takes 1-2 hours.

---

## Phase 1 Implementation: Initial Route Override

### Step 1: Update app.config.js

```javascript
export default ({ config }) => {
  const APP_ENV = process.env.APP_ENV || 'production';
  const isDevelopment = APP_ENV === 'development';
  const storybookEnabled = process.env.STORYBOOK_ENABLED === 'true';
  const devScreen = process.env.DEV_SCREEN || null;
  const devUserType = process.env.DEV_USER_TYPE || null; // 'chef' or 'customer'

  // ... existing code ...

  return {
    ...config,
    plugins,
    extra: {
      ...config.extra,
      APP_ENV,
      storybookEnabled,
      devScreen,
      devUserType,
    },
  };
};
```

### Step 2: Update splash screen to check for dev screen

In `/app/screens/common/splash/index.tsx`, add early exit:

```typescript
import Constants from 'expo-constants';

// At the top of the component
const DEV_SCREEN = Constants.expoConfig?.extra?.devScreen;
const DEV_USER_TYPE = Constants.expoConfig?.extra?.devUserType;

useEffect(() => {
  if (__DEV__ && DEV_SCREEN) {
    // Mock user based on DEV_USER_TYPE
    const mockUser = DEV_USER_TYPE === 'chef'
      ? { user_type: 2, id: 999, first_name: 'Dev', last_name: 'Chef', /* ... */ }
      : { user_type: 1, id: 999, first_name: 'Dev', last_name: 'Customer', /* ... */ };

    dispatch(setUser(mockUser));

    // Navigate directly to dev screen
    setTimeout(() => {
      router.replace(DEV_SCREEN);
    }, 100);
    return;
  }

  // ... existing splash logic
}, []);
```

### Step 3: Add npm scripts

```json
{
  "scripts": {
    "dev:chef-menu": "DEV_SCREEN=/screens/chef/(tabs)/menu DEV_USER_TYPE=chef expo start",
    "dev:chef-add-item": "DEV_SCREEN=/screens/chef/addMenuItem DEV_USER_TYPE=chef expo start",
    "dev:customer-home": "DEV_SCREEN=/screens/customer/(tabs)/(home) DEV_USER_TYPE=customer expo start",
    "dev:login": "DEV_SCREEN=/screens/common/login expo start"
  }
}
```

### Step 4: Usage

```bash
# Preview chef menu (empty state)
npm run dev:chef-menu

# Preview add menu item screen
npm run dev:chef-add-item

# Or with custom screen path
DEV_SCREEN=/screens/chef/orderDetail DEV_USER_TYPE=chef npm start
```

---

## Phase 2 Implementation: Dev Menu

### Step 1: Create DevMenu component

Create `/app/components/DevMenu/index.tsx`:

```typescript
import React, { useState } from 'react';
import { Modal, ScrollView, TouchableOpacity, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppDispatch } from '../../hooks/useRedux';
import { setUser } from '../../reducers/userSlice';

const SCREENS = {
  chef: [
    { label: 'Home', path: '/screens/chef/(tabs)/home' },
    { label: 'Menu (empty)', path: '/screens/chef/(tabs)/menu', mockState: { menus: [] } },
    { label: 'Menu (with items)', path: '/screens/chef/(tabs)/menu' },
    { label: 'Orders', path: '/screens/chef/(tabs)/orders' },
    { label: 'Add Menu Item', path: '/screens/chef/addMenuItem' },
    { label: 'Profile', path: '/screens/chef/(tabs)/profile' },
    { label: 'Earnings', path: '/screens/chef/(tabs)/earnings' },
  ],
  customer: [
    { label: 'Home', path: '/screens/customer/(tabs)/(home)' },
    { label: 'Orders', path: '/screens/customer/(tabs)/orders' },
    { label: 'Cart', path: '/screens/customer/cart' },
  ],
  common: [
    { label: 'Login', path: '/screens/common/login' },
    { label: 'Signup', path: '/screens/common/signup' },
    { label: 'Splash', path: '/screens/common/splash' },
  ],
};

const MOCK_USERS = {
  chef: { user_type: 2, id: 999, first_name: 'Dev', last_name: 'Chef', email: 'dev@chef.com' },
  customer: { user_type: 1, id: 999, first_name: 'Dev', last_name: 'Customer', email: 'dev@customer.com' },
};

export const DevMenu = ({ visible, onClose }) => {
  const dispatch = useAppDispatch();
  const [userType, setUserType] = useState<'chef' | 'customer'>('chef');

  const navigateTo = (path: string, mockState?: any) => {
    // Set mock user
    dispatch(setUser(MOCK_USERS[userType]));

    // Apply any mock state
    if (mockState) {
      // dispatch other mock state as needed
    }

    // Navigate
    router.replace(path);
    onClose();
  };

  if (!__DEV__) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <ScrollView style={{ flex: 1, padding: 20, paddingTop: 60 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          🛠️ Dev Screen Navigator
        </Text>

        {/* User Type Toggle */}
        <View style={{ flexDirection: 'row', marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => setUserType('chef')}
            style={{
              padding: 10,
              backgroundColor: userType === 'chef' ? '#fa4616' : '#ddd',
              borderRadius: 5,
              marginRight: 10
            }}
          >
            <Text style={{ color: userType === 'chef' ? '#fff' : '#000' }}>Chef</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setUserType('customer')}
            style={{
              padding: 10,
              backgroundColor: userType === 'customer' ? '#fa4616' : '#ddd',
              borderRadius: 5
            }}
          >
            <Text style={{ color: userType === 'customer' ? '#fff' : '#000' }}>Customer</Text>
          </TouchableOpacity>
        </View>

        {/* Screen Lists */}
        {Object.entries(SCREENS).map(([section, screens]) => (
          <View key={section} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 10, textTransform: 'capitalize' }}>
              {section} Screens
            </Text>
            {screens.map((screen) => (
              <TouchableOpacity
                key={screen.path}
                onPress={() => navigateTo(screen.path, screen.mockState)}
                style={{
                  padding: 12,
                  backgroundColor: '#f5f5f5',
                  marginBottom: 8,
                  borderRadius: 8
                }}
              >
                <Text>{screen.label}</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>{screen.path}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <TouchableOpacity
          onPress={onClose}
          style={{ padding: 15, backgroundColor: '#333', borderRadius: 8, alignItems: 'center', marginTop: 20 }}
        >
          <Text style={{ color: '#fff' }}>Close</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
};
```

### Step 2: Add DevMenu trigger to root layout

In `/app/_layout.tsx`:

```typescript
import { DevMenu } from './components/DevMenu';

// Inside RootLayout component
const [devMenuVisible, setDevMenuVisible] = useState(false);

// Add triple-tap detector or keyboard shortcut
useEffect(() => {
  if (__DEV__) {
    // For keyboard shortcut (web/simulator)
    const handleKeyDown = (e) => {
      if (e.key === 'd' && e.metaKey) { // Cmd+D
        setDevMenuVisible(true);
      }
    };
    // Add listener...
  }
}, []);

// In the return, wrap with DevMenu:
return (
  <>
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* ... existing app ... */}
    </GestureHandlerRootView>
    {__DEV__ && <DevMenu visible={devMenuVisible} onClose={() => setDevMenuVisible(false)} />}
  </>
);
```

---

## Screen Reference Guide

### Chef Screens
| Screen | Path | Required Params |
|--------|------|-----------------|
| Home | `/screens/chef/(tabs)/home` | None |
| Menu | `/screens/chef/(tabs)/menu` | None |
| Orders | `/screens/chef/(tabs)/orders` | None |
| Profile | `/screens/chef/(tabs)/profile` | None |
| Earnings | `/screens/chef/(tabs)/earnings` | None |
| Add Menu Item | `/screens/chef/addMenuItem` | Optional: menuItem (for edit) |
| Order Detail | `/screens/chef/orderDetail` | orderInfo, customerInfo |
| Background Check | `/screens/chef/backgroundCheck` | None |
| Setup Stripe | `/screens/chef/setupStrip` | None |

### Customer Screens
| Screen | Path | Required Params |
|--------|------|-----------------|
| Home | `/screens/customer/(tabs)/(home)` | None |
| Orders | `/screens/customer/(tabs)/orders` | None |
| Account | `/screens/customer/(tabs)/account` | None |
| Chef Detail | `/screens/customer/chefDetail` | chefInfo, reviews, menus, weekDay, selectedDate |
| Cart | `/screens/customer/cart` | None |
| Checkout | `/screens/customer/checkout` | orders, chefInfo, weekDay, chefProfile, selectedDate |
| Order Detail | `/screens/customer/orderDetail` | orderInfo, chefInfo |

### Common Screens
| Screen | Path | Required Params |
|--------|------|-----------------|
| Splash | `/screens/common/splash` | None |
| Login | `/screens/common/login` | None |
| Signup | `/screens/common/signup` | None |
| Account | `/screens/common/account` | None |
| Chat | `/screens/common/chat` | Optional: chefId/customerId |

---

## Quick Commands Reference

Add these to `package.json` scripts:

```json
{
  "scripts": {
    "dev:chef-menu": "DEV_SCREEN=/screens/chef/(tabs)/menu DEV_USER_TYPE=chef expo start",
    "dev:chef-menu-empty": "DEV_SCREEN=/screens/chef/(tabs)/menu DEV_USER_TYPE=chef DEV_MOCK_EMPTY=true expo start",
    "dev:chef-add-item": "DEV_SCREEN=/screens/chef/addMenuItem DEV_USER_TYPE=chef expo start",
    "dev:chef-orders": "DEV_SCREEN=/screens/chef/(tabs)/orders DEV_USER_TYPE=chef expo start",
    "dev:chef-home": "DEV_SCREEN=/screens/chef/(tabs)/home DEV_USER_TYPE=chef expo start",
    "dev:customer-home": "DEV_SCREEN=/screens/customer/(tabs)/(home) DEV_USER_TYPE=customer expo start",
    "dev:customer-orders": "DEV_SCREEN=/screens/customer/(tabs)/orders DEV_USER_TYPE=customer expo start",
    "dev:login": "DEV_SCREEN=/screens/common/login expo start"
  }
}
```

---

## Troubleshooting

### Screen shows blank
- Check that mock user has correct `user_type` (1=customer, 2=chef)
- Some screens may need additional Redux state (menus, orders, etc.)

### Navigation blocked
- The `useProtectedRoute` hook may redirect you
- Ensure mock user is set before navigation

### Screen needs params
- For screens requiring route params, you'll need to either:
  1. Add mock params to the DevMenu
  2. Or use the navigate.* functions with mock data

### Hot reload resets state
- This is normal - Redux state is reset on reload
- Use the dev menu to quickly get back to your screen

---

## Future Enhancements

1. **Persist dev screen selection** - Remember last selected screen across restarts
2. **Screen variants** - Different states for same screen (loading, error, empty, populated)
3. **Mock data library** - Pre-built mock objects for complex screens
4. **Screenshot mode** - Quickly capture all screens for documentation
5. **QA deep links** - Share links with QA team to reproduce specific screens
