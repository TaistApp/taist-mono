# Redux State Management

Documentation of the frontend Redux store architecture, slices, and data flow.

---

## Table of Contents

1. [Overview](#overview)
2. [Store Configuration](#store-configuration)
3. [Redux Slices](#redux-slices)
4. [Data Flow](#data-flow)
5. [Persistence](#persistence)
6. [Custom Hooks](#custom-hooks)
7. [Best Practices](#best-practices)

---

## Overview

The Taist frontend uses **Redux Toolkit** with **Redux Persist** for state management.

**Technology Stack:**
- Redux Toolkit (simplified Redux)
- Redux Persist (AsyncStorage persistence)
- React-Redux hooks

**Related Files:**
- Store: `frontend/app/store/`
- Reducers: `frontend/app/reducers/`
- Hooks: `frontend/app/hooks/useRedux.ts`

---

## Store Configuration

### Store Setup

**File:** `frontend/app/store/index.ts`

```typescript
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import slices
import userReducer from '../reducers/userSlice';
import customerReducer from '../reducers/customerSlice';
import chefReducer from '../reducers/chefSlice';
import tableReducer from '../reducers/tableSlice';
import deviceReducer from '../reducers/deviceSlice';
import loadingReducer from '../reducers/loadingSlice';
import homeLoadingReducer from '../reducers/home_loading_slice';

// Combine reducers
const rootReducer = combineReducers({
  user: userReducer,
  customer: customerReducer,
  chef: chefReducer,
  table: tableReducer,
  device: deviceReducer,
  loading: loadingReducer,
  homeLoader: homeLoadingReducer,
});

// Persistence config
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['user', 'customer', 'chef', 'table'], // Persist these
  blacklist: ['loading', 'homeLoader'], // Don't persist these
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Provider Setup

**File:** `frontend/app/_layout.tsx`

```typescript
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Stack />
      </PersistGate>
    </Provider>
  );
}
```

---

## Redux Slices

### State Tree Overview

```
store
├── user           # Current authenticated user
│   └── user: IUser
├── customer       # Customer-specific data
│   ├── orders: IOrder[]     # Cart items
│   └── selectedDate: string
├── chef           # Chef-specific data
│   ├── profile: IChefProfile
│   ├── paymentMethod: IPayment
│   └── orders: IOrder[]
├── table          # Cached reference data
│   ├── users: IUser[]
│   ├── categories: ICategory[]
│   ├── allergens: IAllergen[]
│   ├── zipcodes: IZipcode[]
│   ├── orders: IOrder[]
│   ├── menus: IMenu[]
│   ├── reviews: IReview[]
│   └── conversations: IConversation[]
├── device         # Device-specific data
│   ├── notification_id: string
│   └── notification_order_id: string
├── loading        # Global loading state
│   └── value: boolean
└── homeLoader     # Home-specific loading
    └── value: boolean
```

---

### userSlice

Manages the authenticated user.

**File:** `frontend/app/reducers/userSlice.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IUser } from '../types';

interface UserState {
  user: IUser;
}

const initialState: UserState = {
  user: {} as IUser,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<IUser>) => {
      state.user = action.payload;
    },
    setIsPending: (state, action: PayloadAction<0 | 1>) => {
      state.user.is_pending = action.payload;
    },
    clearUser: (state) => {
      state.user = {} as IUser;
    },
  },
});

export const { setUser, setIsPending, clearUser } = userSlice.actions;
export default userSlice.reducer;
```

**Usage:**
```typescript
// Set user after login
dispatch(setUser(userData));

// Clear on logout
dispatch(clearUser());

// Access user
const user = useAppSelector(state => state.user.user);
```

---

### customerSlice

Manages customer cart and order data.

**File:** `frontend/app/reducers/customerSlice.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IOrder } from '../types';

interface CustomerState {
  orders: IOrder[];         // Cart items
  selectedDate: string | null;
}

const initialState: CustomerState = {
  orders: [],
  selectedDate: null,
};

const customerSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {
    clearCustomer: (state) => {
      state.orders = [];
      state.selectedDate = null;
    },
    addOrUpdateCustomerOrder: (state, action: PayloadAction<IOrder[]>) => {
      // Add or update orders in cart
      action.payload.forEach(newOrder => {
        const existingIndex = state.orders.findIndex(
          o => o.menu_id === newOrder.menu_id && o.chef_user_id === newOrder.chef_user_id
        );

        if (existingIndex >= 0) {
          state.orders[existingIndex] = newOrder;
        } else {
          state.orders.push(newOrder);
        }
      });
    },
    removeCustomerOrders: (state, action: PayloadAction<number>) => {
      // Remove all orders from a specific chef
      state.orders = state.orders.filter(
        order => order.chef_user_id !== action.payload
      );
    },
    setSelectedDate: (state, action: PayloadAction<string | null>) => {
      state.selectedDate = action.payload;
    },
  },
});

export const {
  clearCustomer,
  addOrUpdateCustomerOrder,
  removeCustomerOrders,
  setSelectedDate,
} = customerSlice.actions;
export default customerSlice.reducer;
```

**Usage:**
```typescript
// Add item to cart
dispatch(addOrUpdateCustomerOrder([orderItem]));

// Clear cart after checkout
dispatch(clearCustomer());

// Get cart items
const cartItems = useAppSelector(state => state.customer.orders);
```

---

### chefSlice

Manages chef profile and settings.

**File:** `frontend/app/reducers/chefSlice.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IChefProfile, IPayment } from '../types';

interface ChefState {
  profile: IChefProfile;
  paymentMethod: IPayment;
  orders: IOrder[];
}

const initialState: ChefState = {
  profile: {} as IChefProfile,
  paymentMethod: {} as IPayment,
  orders: [],
};

const chefSlice = createSlice({
  name: 'chef',
  initialState,
  reducers: {
    clearChef: (state) => {
      state.profile = {} as IChefProfile;
      state.paymentMethod = {} as IPayment;
      state.orders = [];
    },
    updateChefProfile: (state, action: PayloadAction<IChefProfile>) => {
      state.profile = action.payload;
    },
    updateChefPaymentMethod: (state, action: PayloadAction<IPayment>) => {
      state.paymentMethod = action.payload;
    },
    setChefOrders: (state, action: PayloadAction<IOrder[]>) => {
      state.orders = action.payload;
    },
  },
});

export const {
  clearChef,
  updateChefProfile,
  updateChefPaymentMethod,
  setChefOrders,
} = chefSlice.actions;
export default chefSlice.reducer;
```

---

### tableSlice

Caches reference data and shared collections.

**File:** `frontend/app/reducers/tableSlice.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TableState {
  users: IUser[];
  categories: ICategory[];
  allergens: IAllergen[];
  zipcodes: IZipcode[];
  orders: IOrder[];
  menus: IMenu[];
  reviews: IReview[];
  conversations: IConversation[];
}

const initialState: TableState = {
  users: [],
  categories: [],
  allergens: [],
  zipcodes: [],
  orders: [],
  menus: [],
  reviews: [],
  conversations: [],
};

const tableSlice = createSlice({
  name: 'table',
  initialState,
  reducers: {
    setUsers: (state, action: PayloadAction<IUser[]>) => {
      state.users = action.payload;
    },
    setCategories: (state, action: PayloadAction<ICategory[]>) => {
      state.categories = action.payload;
    },
    setAllergens: (state, action: PayloadAction<IAllergen[]>) => {
      state.allergens = action.payload;
    },
    setZipcodes: (state, action: PayloadAction<IZipcode[]>) => {
      state.zipcodes = action.payload;
    },
    setOrders: (state, action: PayloadAction<IOrder[]>) => {
      state.orders = action.payload;
    },
    setMenus: (state, action: PayloadAction<IMenu[]>) => {
      state.menus = action.payload;
    },
    setReviews: (state, action: PayloadAction<IReview[]>) => {
      state.reviews = action.payload;
    },
    setConversations: (state, action: PayloadAction<IConversation[]>) => {
      state.conversations = action.payload;
    },
    clearTable: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setUsers,
  setCategories,
  setAllergens,
  setZipcodes,
  setOrders,
  setMenus,
  setReviews,
  setConversations,
  clearTable,
} = tableSlice.actions;
export default tableSlice.reducer;
```

---

### loadingSlice

Global loading indicator state.

**File:** `frontend/app/reducers/loadingSlice.ts`

```typescript
import { createSlice } from '@reduxjs/toolkit';

interface LoadingState {
  value: boolean;
}

const initialState: LoadingState = {
  value: false,
};

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    showLoading: (state) => {
      state.value = true;
    },
    hideLoading: (state) => {
      state.value = false;
    },
  },
});

export const { showLoading, hideLoading } = loadingSlice.actions;
export default loadingSlice.reducer;
```

**Usage:**
```typescript
// In API calls
dispatch(showLoading());
const resp = await SomeAPI();
dispatch(hideLoading());
```

---

### deviceSlice

Device-specific data (notifications, etc.).

**File:** `frontend/app/reducers/deviceSlice.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DeviceState {
  notification_id: string | null;
  notification_order_id: string | null;
}

const initialState: DeviceState = {
  notification_id: null,
  notification_order_id: null,
};

const deviceSlice = createSlice({
  name: 'device',
  initialState,
  reducers: {
    setNotificationOrderId: (state, action: PayloadAction<string | null>) => {
      state.notification_order_id = action.payload;
    },
    clearDevice: (state) => {
      state.notification_id = null;
      state.notification_order_id = null;
    },
  },
});

export const { setNotificationOrderId, clearDevice } = deviceSlice.actions;
export default deviceSlice.reducer;
```

---

## Data Flow

### Login Flow

```
User Login
    │
    ▼
LoginAPI() ──────────────────────────────────────────┐
    │                                                 │
    ▼                                                 │
Save token to AsyncStorage                           │
    │                                                 │
    ▼                                                 │
dispatch(setUser(userData)) ────────────────────────>│
    │                                                 │
    ▼                                                 │
Parallel data fetching:                              │
├── GetCategoriesAPI() → dispatch(setCategories())   │
├── GetAllergensAPI() → dispatch(setAllergens())     │
├── GetZipCodes() → dispatch(setZipcodes())          │
└── GetChefProfileAPI() → dispatch(updateChefProfile())
    │
    ▼
Redux Persist automatically saves to AsyncStorage
```

### Add to Cart Flow

```
Customer adds item to cart
    │
    ▼
Build order object with:
├── menu_id
├── chef_user_id
├── amount (quantity)
├── addons (customizations)
└── total_price
    │
    ▼
dispatch(addOrUpdateCustomerOrder([orderItem]))
    │
    ▼
customerSlice updates state.orders
    │
    ▼
Cart UI updates via useAppSelector
```

### Logout Flow

```
User logs out
    │
    ▼
LogOutAPI() (revoke token)
    │
    ▼
Clear AsyncStorage token
    │
    ▼
dispatch(clearUser())
dispatch(clearCustomer())
dispatch(clearChef())
dispatch(clearTable())
    │
    ▼
Navigate to login
```

---

## Persistence

### Configuration

```typescript
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['user', 'customer', 'chef', 'table'],
  blacklist: ['loading', 'homeLoader'],
};
```

### What's Persisted

| Slice | Persisted | Reason |
|-------|-----------|--------|
| user | Yes | Keep user logged in |
| customer | Yes | Preserve cart |
| chef | Yes | Preserve settings |
| table | Yes | Cache reference data |
| loading | No | Transient UI state |
| homeLoader | No | Transient UI state |

### Rehydration

On app launch, Redux Persist automatically:
1. Reads saved state from AsyncStorage
2. Dispatches `REHYDRATE` action
3. Merges with initial state

---

## Custom Hooks

### useRedux Hook

**File:** `frontend/app/hooks/useRedux.ts`

```typescript
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

// Typed dispatch hook
export const useAppDispatch = () => useDispatch<AppDispatch>();

// Typed selector hook
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### Usage Examples

```typescript
// In components
const dispatch = useAppDispatch();
const user = useAppSelector(state => state.user.user);
const cartItems = useAppSelector(state => state.customer.orders);
const categories = useAppSelector(state => state.table.categories);
const isLoading = useAppSelector(state => state.loading.value);

// Dispatch actions
dispatch(setUser(userData));
dispatch(showLoading());
```

---

## Best Practices

### 1. Use Typed Hooks

Always use `useAppDispatch` and `useAppSelector` for type safety.

### 2. Normalize Data

For collections that may have duplicates, normalize by ID:

```typescript
const addOrUpdate = (state, newItem) => {
  const index = state.items.findIndex(i => i.id === newItem.id);
  if (index >= 0) {
    state.items[index] = newItem;
  } else {
    state.items.push(newItem);
  }
};
```

### 3. Keep Slices Focused

Each slice should manage related data:
- `userSlice` - Current user only
- `customerSlice` - Customer-specific features
- `chefSlice` - Chef-specific features

### 4. Avoid Storing Derived Data

Don't store calculated values; derive them with selectors:

```typescript
// BAD: Store total
state.cartTotal = calculateTotal(state.orders);

// GOOD: Calculate on read
const cartTotal = useAppSelector(state =>
  state.customer.orders.reduce((sum, o) => sum + o.total_price, 0)
);
```

### 5. Clear State on Logout

Always clear all relevant state on logout:

```typescript
const handleLogout = () => {
  dispatch(clearUser());
  dispatch(clearCustomer());
  dispatch(clearChef());
  dispatch(clearTable());
  dispatch(clearDevice());
};
```
