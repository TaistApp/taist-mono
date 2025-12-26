# Customer Home Page Performance Analysis

## Executive Summary

The customer home page has a critical UX issue: **the loading spinner ends, but content doesn't appear for another 1-3+ seconds**. This creates a confusing experience where users see a blank screen after the spinner disappears.

**Root Cause:** The spinner hides when the API response arrives, but significant processing still needs to happen before content is visible:
1. Redux state updates (30+ dispatches)
2. Component re-rendering (non-memoized)
3. Image loading (sequential, uncached)

**Total Hidden Delay:** 1000-3200ms after spinner ends

---

## Table of Contents

1. [Issue #1: Spinner Ends Before UI is Ready](#issue-1-spinner-ends-before-ui-is-ready)
2. [Issue #2: N+1 Redux Dispatches](#issue-2-n1-redux-dispatches)
3. [Issue #3: Non-Memoized Rating Calculation](#issue-3-non-memoized-rating-calculation)
4. [Issue #4: Non-Memoized Components](#issue-4-non-memoized-components)
5. [Issue #5: Sequential Image Loading Without Caching](#issue-5-sequential-image-loading-without-caching)
6. [Issue #6: Inline Function Props Causing Re-renders](#issue-6-inline-function-props-causing-re-renders)
7. [Issue #7: Non-Stable List Keys](#issue-7-non-stable-list-keys)
8. [Issue #8: Backend API Performance](#issue-8-backend-api-performance)

---

## Issue #1: Spinner Ends Before UI is Ready

### Problem

The loading spinner is controlled by Redux state that hides **immediately when the API responds**, but the UI still needs 1-3 seconds to actually render content. This creates the "blank screen" effect users are experiencing.

### Architecture Overview

**Loading System Components:**

| Component | File | Purpose |
|-----------|------|---------|
| `loadingSlice` | [frontend/app/reducers/loadingSlice.ts](../frontend/app/reducers/loadingSlice.ts) | Redux state for global spinner |
| `ProgressProvider` | [frontend/app/services/ProgressProvider/index.tsx](../frontend/app/services/ProgressProvider/index.tsx) | Renders spinner overlay |
| `Indicator` | [frontend/app/services/ProgressProvider/indicator.tsx](../frontend/app/services/ProgressProvider/indicator.tsx) | Actual spinner UI |
| `homeLoadingSlice` | [frontend/app/reducers/home_loading_slice.ts](../frontend/app/reducers/home_loading_slice.ts) | **UNUSED** - alternative slice that was never implemented |

**Note:** There's an unused `homeLoadingReducer` in the store (with typo `homeLoaer`) that was likely intended to solve this problem but was never connected:
```typescript
// frontend/app/store/index.ts:21
homeLoaer:homeLoadingReducer,  // Typo, and not used anywhere
```

### Primary Location

**File:** [frontend/app/screens/customer/home/index.tsx](../frontend/app/screens/customer/home/index.tsx)

**Lines 94-133 - The `loadData` function:**
```typescript
// Line 94-95: Race condition prevention
const loadData = useCallback(async (showSpinner = true) => {
  const currentRequestId = ++requestIdRef.current;

  // Lines 98-102: Build query params
  const week_day = DAY.weekday();
  const selected_date = DAY.format('YYYY-MM-DD');
  const category_id = categoryId;
  const time_slot = timeSlotId;
  const timezone_gap = moment().utcOffset() / 60;

  // Line 104-106: Show spinner BEFORE API call
  if (showSpinner) {
    dispatch(showLoading());
  }

  try {
    // Line 109-112: API call (700-2800ms)
    const searchChefs = await GetSearchChefAPI(
      { week_day, selected_date, category_id, time_slot, timezone_gap, user_id: self?.id || -1 },
      dispatch,  // <-- This triggers 30+ Redux dispatches inside GetSearchChefAPI!
    );

    // Line 115-117: Stale request check
    if (currentRequestId !== requestIdRef.current) {
      return;
    }

    // Line 119-123: Update local state
    if (searchChefs.success == 1) {
      setChefs(searchChefs.data);  // <-- Triggers component re-render
    } else {
      setChefs([]);
    }
  } catch (error) {
    console.error('Chef search failed:', error);
    setChefs([]);
  } finally {
    // Line 128-131: Hide spinner IMMEDIATELY
    if (showSpinner) {
      dispatch(hideLoading());  // <-- PROBLEM: UI not ready yet!
    }
  }
}, [DAY, categoryId, timeSlotId, self?.id, dispatch]);
```

### Spinner UI Implementation

**File:** [frontend/app/services/ProgressProvider/index.tsx](../frontend/app/services/ProgressProvider/index.tsx)

```typescript
const ProgressProvider = ({children}: Props) => {
  const isLoading = useAppSelector(state => state.loading.value);

  return (
    <View style={styles.container}>
      {children}
      {isLoading && <Indicator />}  {/* Overlay appears/disappears based on Redux */}
      <InitializeNotification />
    </View>
  );
};
```

**File:** [frontend/app/services/ProgressProvider/indicator.tsx](../frontend/app/services/ProgressProvider/indicator.tsx)

```typescript
const Indicator = () => {
  return (
    <View style={styles.container}>  {/* Full-screen semi-transparent overlay */}
      <ActivityIndicator size={'large'} color={'#fff'} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,  // Covers entire screen
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00000080',  // 50% black overlay
  },
});
```

### Detailed Timeline Analysis

```
Timeline from user tap to content visible:

0ms       - User navigates to home screen
           └─ useFocusEffect triggers

~5ms      - dispatch(showLoading())
           └─ Redux state: loading.value = true
           └─ ProgressProvider re-renders
           └─ SPINNER APPEARS (full-screen overlay)

~10ms     - GetSearchChefAPI() starts
           └─ HTTP request sent to backend

700-2800ms - Waiting for backend response...
           └─ Backend queries database, calculates distances
           └─ Backend returns JSON with chefs + menus + reviews

~2000ms   - API response arrives
           └─ GetSearchChefAPI dispatches 30+ Redux actions (see Issue #2)

~2050ms   - setChefs(searchChefs.data) called
           └─ React schedules re-render

~2100ms   - dispatch(hideLoading()) in finally block
           └─ Redux state: loading.value = false
           └─ ProgressProvider re-renders
           └─ SPINNER DISAPPEARS ← USER SEES BLANK SCREEN HERE

~2150ms   - Redux persist starts writing to AsyncStorage
           └─ 30+ writes scheduled

~2200ms   - React starts reconciling Home component
           └─ filteredChefs useMemo runs
           └─ JSX tree built for ScrollView + filters

~2400ms   - React renders ChefCard components
           └─ Each card: rating calculation, layout, styles
           └─ FIRST CHEF CARDS BECOME VISIBLE

~2500ms   - Profile images start loading
           └─ Network requests for each chef photo

~3500ms+  - All images loaded
           └─ CONTENT FULLY VISIBLE

Gap: ~2100ms (spinner hides) → ~2400ms (cards visible) = 300ms BLANK
     ~2100ms (spinner hides) → ~3500ms (images loaded) = 1400ms PARTIAL
```

### Why `requestAnimationFrame` is the Right Fix

According to [React Native documentation](https://reactnative.dev/docs/interactionmanager):

> "requestAnimationFrame(fn) is not the same as setTimeout(fn, 0) - the former will fire after all the frame has flushed"

This means `requestAnimationFrame` waits for:
1. All pending state updates to process
2. React reconciliation to complete
3. Layout calculations to finish
4. The frame to be ready for display

### Solution Options

**Option A: Use `requestAnimationFrame` to delay spinner hide (Recommended)**

```typescript
// frontend/app/screens/customer/home/index.tsx

import { InteractionManager } from 'react-native';

const [isDataLoaded, setIsDataLoaded] = useState(false);

const loadData = useCallback(async (showSpinner = true) => {
  const currentRequestId = ++requestIdRef.current;

  if (showSpinner) {
    setIsDataLoaded(false);
    dispatch(showLoading());
  }

  try {
    const searchChefs = await GetSearchChefAPI(/* ... */);

    if (currentRequestId !== requestIdRef.current) return;

    if (searchChefs.success == 1) {
      setChefs(searchChefs.data);
      setIsDataLoaded(true);
    } else {
      setChefs([]);
      setIsDataLoaded(true);
    }
  } catch (error) {
    setChefs([]);
    setIsDataLoaded(true);
  }
  // NOTE: Don't hide spinner here anymore!
}, [/* ... */]);

// Hide spinner AFTER React has rendered the new content
useEffect(() => {
  if (isDataLoaded) {
    // Wait for interactions (animations) to complete, then wait for frame flush
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        dispatch(hideLoading());
      });
    });
  }
}, [isDataLoaded, dispatch]);
```

**Option B: Use skeleton screens (Better UX but more work)**

```typescript
// New file: frontend/app/screens/customer/home/components/chefCardSkeleton.tsx
import { View } from 'react-native';
import { MotiView } from 'moti';  // or use Animated API

const ChefCardSkeleton = () => {
  return (
    <View style={styles.chefCard}>
      <MotiView
        from={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ loop: true, type: 'timing', duration: 1000 }}
        style={styles.skeletonImage}
      />
      <View style={styles.skeletonContent}>
        <MotiView style={styles.skeletonTitle} /* ... */ />
        <MotiView style={styles.skeletonText} /* ... */ />
      </View>
    </View>
  );
};
```

```typescript
// In home/index.tsx render:
<View style={styles.chefCardContainer}>
  {!isDataLoaded && (
    <>
      <ChefCardSkeleton />
      <ChefCardSkeleton />
      <ChefCardSkeleton />
    </>
  )}
  {isDataLoaded && filteredChefs.map((item) => (
    <ChefCard /* ... */ />
  ))}
</View>
```

**Option C: Hybrid approach (skeleton + delayed spinner for slow connections)**

```typescript
const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'rendering' | 'ready'>('idle');

// Show skeleton immediately, spinner only if API takes > 3 seconds
useEffect(() => {
  let spinnerTimeout: NodeJS.Timeout;

  if (loadingState === 'loading') {
    spinnerTimeout = setTimeout(() => {
      dispatch(showLoading());
    }, 3000);  // Only show spinner for very slow connections
  }

  return () => clearTimeout(spinnerTimeout);
}, [loadingState]);
```

### Edge Cases to Handle

1. **Empty results**: Spinner should still hide, show "No Chefs" message
2. **API error**: Spinner should hide, show error state
3. **Race conditions**: Already handled with `requestIdRef`
4. **Pull-to-refresh**: Uses `showSpinner = false`, works independently

### Files to Modify

| File | Changes |
|------|---------|
| `frontend/app/screens/customer/home/index.tsx` | Add `isDataLoaded` state, move `hideLoading` to useEffect |
| (Optional) `frontend/app/screens/customer/home/components/chefCardSkeleton.tsx` | NEW - Skeleton component |
| (Optional) `frontend/app/screens/customer/home/styles.ts` | Skeleton styles |

### Testing Checklist

- [x] Spinner stays visible until first ChefCard appears
- [x] Pull-to-refresh still works (no spinner, uses RefreshControl)
- [x] Empty results shows "No Chefs" without stuck spinner
- [x] API errors don't leave spinner stuck
- [x] Filter changes show spinner appropriately
- [x] Back navigation and return doesn't break state

### Impact

| Metric | Before | After |
|--------|--------|-------|
| Blank screen duration | 300-1400ms | 0ms |
| User confusion | High | None |
| Perceived performance | Poor | Good |

### Effort

- **Option A (requestAnimationFrame):** 1 hour
- **Option B (skeletons):** 2-3 hours
- **Option C (hybrid):** 3-4 hours

### Status: COMPLETED ✓

Implemented Option A on 2025-12-26. See commit `bfb8132`.

---

## Issue #2: N+1 Redux Dispatches

### Problem

When the API returns chef data, the code dispatches Redux actions **inside a loop**, causing 30+ state updates for a typical response of 10 chefs. Each dispatch triggers expensive operations including array copies, `findIndex` scans, and AsyncStorage writes.

### Architecture Overview

**Redux Data Flow for Chef Search:**

```
GetSearchChefAPI()
    │
    ├── API Response: { data: [chef1, chef2, ..., chef10] }
    │
    └── FOR EACH chef (10 iterations):
            ├── dispatch(addOrUpdateUsers([chef]))     → tableSlice reducer → AsyncStorage
            ├── dispatch(addOrUpdateMenus(menus))      → tableSlice reducer → AsyncStorage
            └── dispatch(addOrUpdateReviews(reviews))  → tableSlice reducer → AsyncStorage

                                                        = 30 total dispatches!
```

### Primary Location

**File:** [frontend/app/services/api.ts](../frontend/app/services/api.ts)

**Lines 323-346 - The problematic function:**
```typescript
export const GetSearchChefAPI = async (
  params: {
    week_day?: number;
    selected_date?: string;
    category_id?: number;
    time_slot?: number;
    timezone_gap?: number;
    user_id: number;
  },
  dispatch?: any
) => {
  var response = await GETAPICALL(
    `get_search_chefs/${params?.user_id}`,
    params
  );

  // THE PROBLEM: Dispatching inside a loop
  if (response.success == 1 && dispatch) {
    response.data.map((item: any, index: number) => {
      dispatch(addOrUpdateUsers([item]));      // Dispatch #1, #4, #7, #10...
      dispatch(addOrUpdateMenus(item.menus));  // Dispatch #2, #5, #8, #11...
      dispatch(addOrUpdateReviews(item.reviews)); // Dispatch #3, #6, #9, #12...
    });
  }
  return response;
};
```

### Redux Store Configuration

**File:** [frontend/app/store/index.ts](../frontend/app/store/index.ts)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistReducer, persistStore } from 'redux-persist';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,  // Every state change writes to disk!
  // NO throttle configured - every dispatch triggers immediate write
  // NO blacklist configured - everything is persisted
};

const appReducer = combineReducers({
  user: userReducer,
  loading: loadingReducer,
  homeLoaer: homeLoadingReducer,  // Typo in key name
  device: deviceReducer,
  table: tableReducer,  // <-- This is where users/menus/reviews live
  customer: customerReducer,
  chef: chefReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);
```

**Issues with current config:**
1. No `throttle` option - every dispatch writes immediately
2. No `blacklist` - even `loading` state (which doesn't need persistence) is saved
3. Entire `table` slice persisted on every update

### Reducer Implementation Analysis

**File:** [frontend/app/reducers/tableSlice.ts](../frontend/app/reducers/tableSlice.ts)

**Lines 34-47 - The `getNewArr` helper (runs on EVERY dispatch):**
```typescript
const getNewArr = (oldArr: Array<any>, payloadArr: Array<any>) => {
  var arr = [...oldArr];  // ← O(n) copy #1

  payloadArr.map((item, index) => {
    // ← O(n) findIndex for EACH item in payload
    const sameIndex = arr.findIndex(
      x => x?.id !== undefined && x?.id === item.id,
    );

    if (sameIndex == -1) {
      arr = [...arr, item];  // ← O(n) copy if new item
    } else {
      arr[sameIndex] = {...arr[sameIndex], ...item};  // ← Object spread
    }
  });

  return arr;
};
```

**Lines 63-66 - addOrUpdateUsers reducer:**
```typescript
addOrUpdateUsers: (state, action: PayloadAction<Array<IUser>>) => {
  var arr = getNewArr([...state.users], action.payload);  // ← ANOTHER copy
  state.users = [...arr];  // ← AND ANOTHER copy
},
```

### Complexity Analysis

**For 10 chefs, each with 3 menus and 2 reviews:**

| Operation | Count | Complexity | Total |
|-----------|-------|------------|-------|
| Redux dispatches | 30 | O(1) | 30 operations |
| Array copies (getNewArr entry) | 30 | O(n) | O(30n) |
| findIndex scans | 30 × items | O(n) | O(30n²) in worst case |
| AsyncStorage writes | 30 | O(serialization) | 30 disk writes |
| React re-render triggers | 30 | varies | 30 potential re-renders |

**Estimated time breakdown:**
- Array operations: 50-100ms
- AsyncStorage serialization: 50-150ms
- AsyncStorage disk writes: 100-200ms
- **Total: 200-450ms** just for state management

### The Cascade Effect

Each dispatch triggers this chain:
```
dispatch(action)
    │
    ├── 1. Redux reducer runs
    │       └── getNewArr() copies arrays
    │       └── findIndex() scans for duplicates
    │
    ├── 2. Redux notifies subscribers
    │       └── Any useAppSelector that touches this slice re-evaluates
    │       └── May trigger component re-renders
    │
    └── 3. redux-persist intercepts
            └── Serializes entire root state to JSON
            └── Writes to AsyncStorage (disk I/O)
```

### Solution: Batch Dispatches

**Updated GetSearchChefAPI:**

```typescript
export const GetSearchChefAPI = async (
  params: {
    week_day?: number;
    selected_date?: string;
    category_id?: number;
    time_slot?: number;
    timezone_gap?: number;
    user_id: number;
  },
  dispatch?: any
) => {
  var response = await GETAPICALL(
    `get_search_chefs/${params?.user_id}`,
    params
  );

  if (response.success == 1 && dispatch) {
    // SOLUTION: Collect all data first, then dispatch once per type
    const allUsers = response.data;
    const allMenus = response.data.flatMap((chef: any) => chef.menus || []);
    const allReviews = response.data.flatMap((chef: any) => chef.reviews || []);

    // 3 dispatches instead of 30
    if (allUsers.length > 0) {
      dispatch(addOrUpdateUsers(allUsers));
    }
    if (allMenus.length > 0) {
      dispatch(addOrUpdateMenus(allMenus));
    }
    if (allReviews.length > 0) {
      dispatch(addOrUpdateReviews(allReviews));
    }
  }
  return response;
};
```

### Additional Optimization: Improve getNewArr

The current `getNewArr` has O(n²) complexity due to `findIndex` in a loop. Use a Map for O(n):

```typescript
// frontend/app/reducers/tableSlice.ts

const getNewArrOptimized = <T extends { id?: number }>(
  oldArr: Array<T>,
  payloadArr: Array<T>
): Array<T> => {
  // Build a map for O(1) lookups instead of O(n) findIndex
  const itemMap = new Map<number, T>();

  // Add existing items to map
  oldArr.forEach(item => {
    if (item.id !== undefined) {
      itemMap.set(item.id, item);
    }
  });

  // Update or add new items
  payloadArr.forEach(item => {
    if (item.id !== undefined) {
      const existing = itemMap.get(item.id);
      if (existing) {
        itemMap.set(item.id, { ...existing, ...item });
      } else {
        itemMap.set(item.id, item);
      }
    }
  });

  return Array.from(itemMap.values());
};
```

### Additional Optimization: Configure Redux Persist

**Updated store configuration:**

```typescript
// frontend/app/store/index.ts

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  throttle: 1000,  // Only persist once per second max
  blacklist: ['loading', 'homeLoaer'],  // Don't persist loading states
  // Or use whitelist for more control:
  // whitelist: ['user', 'table'],
};

// For even better performance, persist table slice separately with longer throttle
const tablePersistConfig = {
  key: 'table',
  storage: AsyncStorage,
  throttle: 2000,  // Table data can tolerate 2 second delay
};
```

### Alternative: Skip Redux for Search Results

Since chef search results are:
1. Ephemeral (refresh on every search)
2. Already stored in component state (`const [chefs, setChefs] = useState([])`)
3. Not needed across app restarts

Consider **not dispatching to Redux at all** for search results:

```typescript
export const GetSearchChefAPI = async (params, dispatch?: any) => {
  var response = await GETAPICALL(`get_search_chefs/${params?.user_id}`, params);

  // Just return the data - let component manage it locally
  // Only dispatch if we actually need this data elsewhere
  return response;
};
```

The home screen already stores chefs in local state:
```typescript
// home/index.tsx line 41
const [chefs, setChefs] = useState<Array<any>>([]);
```

### Files to Modify

| File | Changes |
|------|---------|
| `frontend/app/services/api.ts` | Batch dispatches in GetSearchChefAPI (lines 338-343) |
| `frontend/app/reducers/tableSlice.ts` | Optimize getNewArr with Map (lines 34-47) |
| `frontend/app/store/index.ts` | Add throttle and blacklist to persistConfig |

### Testing Checklist

- [ ] Chef search still populates the list correctly
- [ ] Menus and reviews are accessible from Redux when needed
- [ ] App doesn't crash on large result sets (20+ chefs)
- [ ] Performance measurably improved (use React DevTools Profiler)
- [ ] Data persists correctly after app restart

### Impact

| Metric | Before | After |
|--------|--------|-------|
| Redux dispatches | 30 | 3 |
| AsyncStorage writes | 30 | 3 (or 1 with throttle) |
| Array copy operations | O(30n) | O(3n) |
| findIndex scans | O(30n²) | O(3n) with Map |
| Time for state updates | 200-450ms | 30-80ms |
| **Total time saved** | - | **~150-370ms** |

### Effort

- **Batch dispatches only:** 15 minutes
- **+ Optimize getNewArr:** 30 minutes
- **+ Configure persist throttle:** 15 minutes
- **Total:** ~1 hour for full optimization

---

## Issue #3: Non-Memoized Rating Calculation

### Problem

Every `ChefCard` calculates the average rating **on every render** using an inefficient pattern. The calculation uses `.map()` for side effects (mutation), runs outside of any memoization, and recalculates even when the reviews array hasn't changed.

### Architecture Overview

**Component Render Flow:**
```
Parent (Home) state change
    │
    └── Re-renders Home component
            │
            └── filteredChefs.map() runs
                    │
                    └── Each ChefCard re-renders
                            │
                            └── Rating calculation runs AGAIN
                                    │
                                    └── StarRatingDisplay re-renders
```

### Primary Location

**File:** [frontend/app/screens/customer/home/components/chefCard.tsx](../frontend/app/screens/customer/home/components/chefCard.tsx)

**Lines 32-37 - The problematic calculation:**
```typescript
const ChefCard = ({
  chefInfo,
  reviews,
  menus,
  gotoChefDetail,
  gotoOrder,
}: Props) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // PROBLEM 1: Calculation runs on EVERY render
  // PROBLEM 2: Uses var (mutable) instead of const
  // PROBLEM 3: Uses .map() for side effects instead of .reduce()
  // PROBLEM 4: Unused 'index' parameter
  var totalRatings = 0;
  reviews.map((item, index) => {
    totalRatings += item.rating ?? 0;
  });

  // ...later in JSX (line 57-58):
  // <StarRatingDisplay rating={totalRatings / reviews.length} ... />
```

**The IReview interface:**
```typescript
// frontend/app/types/review.interface.ts
export default interface ReviewInterface {
  id?: number;
  order_id?: number;
  from_user_id?: number;
  to_user_id?: number;
  rating?: number;      // <- This is what we're summing (1-5 scale)
  review?: string;
  tip_amount?: number;
  created_at?: number;
  updated_at?: number;
}
```

### Code Smell Analysis

| Issue | Current Code | Best Practice |
|-------|--------------|---------------|
| Side effect in .map() | `reviews.map((item) => { totalRatings += ... })` | Use `.reduce()` for aggregation |
| Mutable variable | `var totalRatings = 0` | Use `const` with functional approach |
| No memoization | Runs on every render | Wrap in `useMemo` |
| Division by zero risk | `totalRatings / reviews.length` | Check `reviews.length > 0` first |
| Unused parameter | `(item, index)` | Remove unused `index` |

### When Does ChefCard Re-render?

ChefCard re-renders when ANY of these happen:

1. **Parent state changes:**
   - `DAY` changes (date picker)
   - `categoryId` changes (cuisine filter)
   - `timeSlotId` changes (time filter)
   - `chefs` array updates

2. **Local state changes:**
   - `menuOpen` toggle (expand/collapse menu)

3. **Props change:**
   - Any of the 5 props passed from parent

**For 10 chef cards with 5 reviews each:**

| Trigger | Rating Calculations |
|---------|---------------------|
| Initial render | 10 × 5 = 50 operations |
| User clicks category filter | 10 × 5 = 50 more operations |
| User clicks time filter | 10 × 5 = 50 more operations |
| User expands one chef's menu | 1 × 5 = 5 operations (just that card) |
| **Total for typical session** | **150-200 operations** |

### The StarRatingDisplay Component

This is from `react-native-star-rating-widget`, a third-party library:

```typescript
// Line 57-61 in chefCard.tsx
<StarRatingDisplay
  rating={totalRatings / reviews.length}  // ← Calculated fresh each render
  starSize={20}
  starStyle={{marginHorizontal: 0}}  // ← Inline object = new reference each render!
/>
```

**Additional problem:** The inline `starStyle` object creates a new reference on every render, which could cause `StarRatingDisplay` to re-render even if memoized.

### Solution

**Complete fix for chefCard.tsx:**

```typescript
import { faAngleDown, faAngleUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useMemo, useState } from 'react';  // ← Add useMemo
import { Text, TouchableOpacity, View } from 'react-native';
import { StarRatingDisplay } from 'react-native-star-rating-widget';
import StyledProfileImage from '../../../../components/styledProfileImage';
import { IMenu, IReview, IUser } from '../../../../types/index';
import { getImageURL } from '../../../../utils/functions';
import { styles } from '../styles';
import ChefMenuItem from './chefMenuItem';

type Props = {
  chefInfo: IUser;
  reviews: Array<IReview>;
  menus: Array<IMenu>;
  gotoChefDetail: (chefId: number) => void;
  gotoOrder: (
    orderMenu: IMenu,
    chefInfo: IUser,
    reviews: Array<IReview>,
    menus: Array<IMenu>,
  ) => void;
};

// Memoize starStyle outside component to prevent new object each render
const STAR_STYLE = { marginHorizontal: 0 };

const ChefCard = ({
  chefInfo,
  reviews,
  menus,
  gotoChefDetail,
  gotoOrder,
}: Props) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // SOLUTION: Memoized rating calculation using reduce
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0);
    return total / reviews.length;
  }, [reviews]);

  return (
    <View style={styles.chefCard}>
      {/* ... */}
      {reviews.length > 0 && (
        <View style={styles.chefCardReview}>
          <StarRatingDisplay
            rating={averageRating}     // ← Use memoized value
            starSize={20}
            starStyle={STAR_STYLE}     // ← Use constant reference
          />
          <Text style={{ fontSize: 14, letterSpacing: 0.5 }}>
            {`(${reviews.length}) `}
          </Text>
        </View>
      )}
      {/* ... */}
    </View>
  );
};

export default ChefCard;
```

### Additional Optimizations in Same File

While fixing the rating calculation, also fix these issues in lines 82-88:

```typescript
// Current (line 82-88):
{menus.map((item, index) => {
  return (
    <ChefMenuItem
      item={item}
      onPress={() => gotoOrder(item, chefInfo, reviews, menus)}  // ← New function each render!
      key={`menuItem_${index}`}  // ← Index-based key
    />
  );
})}

// Improved:
{menus.map((item) => (
  <ChefMenuItem
    item={item}
    onPress={() => gotoOrder(item, chefInfo, reviews, menus)}
    key={`menu_${item.id}`}  // ← Stable key using menu ID
  />
))}
```

### Files to Modify

| File | Line | Change |
|------|------|--------|
| `chefCard.tsx` | 3 | Add `useMemo` to imports |
| `chefCard.tsx` | 24 | Add `const STAR_STYLE = { marginHorizontal: 0 }` |
| `chefCard.tsx` | 34-37 | Replace with `useMemo` + `reduce` |
| `chefCard.tsx` | 58 | Use `averageRating` instead of inline calculation |
| `chefCard.tsx` | 60 | Use `starStyle={STAR_STYLE}` |
| `chefCard.tsx` | 87 | Use `key={\`menu_${item.id}\`}` |

### Testing Checklist

- [ ] Star ratings display correctly (0-5 scale)
- [ ] Chefs with no reviews show no rating (not NaN or 0/0)
- [ ] Ratings update when reviews change
- [ ] React DevTools Profiler shows fewer recalculations
- [ ] Menu expand/collapse still works

### Impact

| Metric | Before | After |
|--------|--------|-------|
| Rating calculations per session | 150-200 | 10 (initial only) |
| Time per calculation | ~0.5-1ms | ~0.05ms (cached) |
| StarRatingDisplay re-renders | Every parent render | Only when rating changes |
| Memory (object allocations) | New starStyle each render | 1 constant reference |
| **Total time saved per session** | - | **~100-150ms** |

### Effort: 20 minutes

### Status: COMPLETED ✓

Implemented on 2025-12-26. Changes made:
- Added `useMemo` import
- Created `STAR_STYLE` constant outside component
- Replaced `var` + `.map()` with memoized `averageRating` using `useMemo` + `reduce`
- Updated `StarRatingDisplay` to use `averageRating` and `STAR_STYLE`

### Why This Matters for Overall Performance

This fix alone isn't huge, but combined with React.memo on ChefCard (Issue #4), the memoization ensures that when ChefCard doesn't re-render, the calculation also doesn't run. The two fixes work together synergistically.

---

## Issue #4: Non-Memoized Components

### Problem

Neither `ChefCard` nor `ChefMenuItem` are wrapped in `React.memo`, causing unnecessary re-renders when parent state changes. This means every time the parent component updates (filter changes, scroll, etc.), ALL child components re-execute their entire function body, even if their props haven't changed.

### Architecture Overview

**Current Component Hierarchy:**
```
Home (index.tsx)
    │
    ├── CustomCalendar          (can trigger re-renders via onDateSelect)
    ├── TimeSlot buttons        (can trigger re-renders via onPress)
    ├── Category buttons        (can trigger re-renders via onPress)
    │
    └── ChefCard × 10           (NO memo - re-renders on every parent update)
            │
            └── ChefMenuItem × 3 per card  (NO memo - nested re-renders)

When user clicks a category filter:
1. Home updates categoryId state
2. Home re-renders
3. ALL 10 ChefCards re-render (even if chef data unchanged)
4. ALL 30 ChefMenuItems re-render (if menus expanded)
```

### Primary Locations

**ChefCard:** [frontend/app/screens/customer/home/components/chefCard.tsx](../frontend/app/screens/customer/home/components/chefCard.tsx)

```typescript
// Lines 25-95: Component definition (not memoized)
const ChefCard = ({
  chefInfo,
  reviews,
  menus,
  gotoChefDetail,
  gotoOrder,
}: Props) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Rating calculation runs on EVERY render (Issue #3)
  var totalRatings = 0;
  reviews.map((item, index) => {
    totalRatings += item.rating ?? 0;
  });

  return (
    <View style={styles.chefCard}>
      {/* ... complex nested JSX ... */}
    </View>
  );
};

// Line 97: No memoization!
export default ChefCard;
```

**ChefMenuItem:** [frontend/app/screens/customer/home/components/chefMenuItem.tsx](../frontend/app/screens/customer/home/components/chefMenuItem.tsx)

```typescript
// Lines 9-45: Component definition (not memoized)
const ChefMenuItem = (props: Props) => {
  // Also has same .map() for side effects issue
  const customizations: Array<IMenuCustomization> =
    props.item.customizations ?? [];
  var price_customizations = 0;
  var names_customizations: Array<string> = [];
  customizations.map((c, idx) => {
    price_customizations += c.upcharge_price ?? 0;
    names_customizations.push(c.name ?? '');
  });

  return (
    <TouchableOpacity onPress={props.onPress} style={styles.chefCardMenuItem}>
      {/* ... */}
    </TouchableOpacity>
  );
};

// Line 48: No memoization!
export default ChefMenuItem;
```

### Re-render Trigger Analysis

**What triggers Home component re-render:**

| Trigger | State Change | ChefCards Re-render? |
|---------|--------------|---------------------|
| Date picker | `DAY` | Yes, all 10 |
| Time filter | `timeSlotId` | Yes, all 10 |
| Cuisine filter | `categoryId` | Yes, all 10 |
| Pull to refresh | `refreshing` | Yes, all 10 |
| API response | `chefs` | Yes, all 10 |
| Redux update (any) | Via useAppSelector | Potentially all |

**What triggers ChefCard re-render:**

| Trigger | Result |
|---------|--------|
| Parent re-renders | ChefCard re-renders (no memo) |
| `menuOpen` toggle | That specific ChefCard re-renders |
| Props change | ChefCard re-renders |

**Cascade Effect:**

For a user session with:
- 2 filter changes
- 3 menu expands/collapses
- 10 chefs displayed
- 3 menus per chef

```
Without React.memo:
- Initial render: 10 ChefCards = 10 renders
- Filter change 1: 10 ChefCards = 10 renders
- Filter change 2: 10 ChefCards = 10 renders
- Menu toggle 1-3: 3 ChefCards = 3 renders
- Total: 33 ChefCard renders (30 unnecessary)
- Plus ~90 ChefMenuItem renders if menus are open

With React.memo:
- Initial render: 10 ChefCards = 10 renders
- Filter changes: 0 ChefCards (props unchanged)
- Menu toggles: 3 ChefCards (only those toggled)
- Total: 13 ChefCard renders (saves 20)
```

### Props Comparison Challenges

ChefCard receives these props:
```typescript
type Props = {
  chefInfo: IUser;           // Object - needs deep compare or stable reference
  reviews: Array<IReview>;   // Array - new reference each render from parent
  menus: Array<IMenu>;       // Array - new reference each render from parent
  gotoChefDetail: (chefId: number) => void;  // Function - stable if useCallback
  gotoOrder: (...) => void;  // Function - NEW reference each render (Issue #6)
};
```

**Problem:** Even if the *content* is the same, React's shallow comparison sees:
- `prevProps.reviews !== nextProps.reviews` (different array references)
- `prevProps.gotoOrder !== nextProps.gotoOrder` (inline function)

This means naive `React.memo` won't help unless we:
1. Fix inline function props (Issue #6)
2. Use custom comparison function

### Solution

**ChefCard with custom comparison:**

```typescript
// frontend/app/screens/customer/home/components/chefCard.tsx

import { faAngleDown, faAngleUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { memo, useCallback, useMemo, useState } from 'react';  // Add memo
import { Text, TouchableOpacity, View } from 'react-native';
import { StarRatingDisplay } from 'react-native-star-rating-widget';
import StyledProfileImage from '../../../../components/styledProfileImage';
import { IMenu, IReview, IUser } from '../../../../types/index';
import { getImageURL } from '../../../../utils/functions';
import { styles } from '../styles';
import ChefMenuItem from './chefMenuItem';

type Props = {
  chefInfo: IUser;
  reviews: Array<IReview>;
  menus: Array<IMenu>;
  gotoChefDetail: (chefId: number) => void;
  gotoOrder: (
    orderMenu: IMenu,
    chefInfo: IUser,
    reviews: Array<IReview>,
    menus: Array<IMenu>,
  ) => void;
};

const STAR_STYLE = { marginHorizontal: 0 };

const ChefCard = ({
  chefInfo,
  reviews,
  menus,
  gotoChefDetail,
  gotoOrder,
}: Props) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Memoized rating (Issue #3 fix)
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length;
  }, [reviews]);

  // Memoize callbacks to prevent ChefMenuItem re-renders
  const handleToggleMenu = useCallback(() => {
    setMenuOpen(prev => !prev);
  }, []);

  const handleChefPress = useCallback(() => {
    gotoChefDetail(chefInfo.id ?? 0);
  }, [gotoChefDetail, chefInfo.id]);

  return (
    <View style={styles.chefCard}>
      <TouchableOpacity style={styles.chefCardMain} onPress={handleChefPress}>
        <StyledProfileImage url={getImageURL(chefInfo.photo)} size={80} />
        <View style={styles.chefCardInfo}>
          <View style={{flex: 1}}>
            <Text style={styles.chefCardTitle}>
              {`${chefInfo.first_name} ${chefInfo.last_name?.substring(0, 1)}. `}
            </Text>
            <Text style={styles.chefCardDescription} numberOfLines={2}>
              {chefInfo.bio ?? ''}
            </Text>
          </View>

          {reviews.length > 0 && (
            <View style={styles.chefCardReview}>
              <StarRatingDisplay
                rating={averageRating}
                starSize={20}
                starStyle={STAR_STYLE}
              />
              <Text style={{ fontSize: 14, letterSpacing: 0.5 }}>
                {`(${reviews.length}) `}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleToggleMenu} style={{ padding: 20, paddingHorizontal: 10 }}>
          <FontAwesomeIcon
            icon={menuOpen ? faAngleUp : faAngleDown}
            size={20}
            color="#000000"
          />
        </TouchableOpacity>
      </TouchableOpacity>
      {menuOpen && (
        <View style={styles.chefCardMenu}>
          {menus.map((item) => (
            <ChefMenuItem
              item={item}
              chefInfo={chefInfo}
              reviews={reviews}
              menus={menus}
              gotoOrder={gotoOrder}
              key={`menu_${item.id}`}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// Custom comparison function
const arePropsEqual = (prevProps: Props, nextProps: Props): boolean => {
  // Compare by ID and lengths - cheaper than deep comparison
  return (
    prevProps.chefInfo.id === nextProps.chefInfo.id &&
    prevProps.reviews.length === nextProps.reviews.length &&
    prevProps.menus.length === nextProps.menus.length &&
    // If using stable gotoChefDetail from useCallback in parent:
    prevProps.gotoChefDetail === nextProps.gotoChefDetail
    // Note: gotoOrder comparison skipped - it's inline function (Issue #6)
  );
};

export default memo(ChefCard, arePropsEqual);
```

**ChefMenuItem with memo:**

```typescript
// frontend/app/screens/customer/home/components/chefMenuItem.tsx

import { memo, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { IMenu, IMenuCustomization, IReview, IUser } from '../../../../types/index';
import { styles } from '../styles';

type Props = {
  item: IMenu;
  chefInfo: IUser;
  reviews: Array<IReview>;
  menus: Array<IMenu>;
  gotoOrder: (
    orderMenu: IMenu,
    chefInfo: IUser,
    reviews: Array<IReview>,
    menus: Array<IMenu>,
  ) => void;
};

const ChefMenuItem = ({ item, chefInfo, reviews, menus, gotoOrder }: Props) => {
  // Memoize customization calculations
  const { price_customizations, names_customizations } = useMemo(() => {
    const customizations: Array<IMenuCustomization> = item.customizations ?? [];
    let price = 0;
    const names: string[] = [];

    customizations.forEach((c) => {
      price += c.upcharge_price ?? 0;
      names.push(c.name ?? '');
    });

    return { price_customizations: price, names_customizations: names };
  }, [item.customizations]);

  const handlePress = () => {
    gotoOrder(item, chefInfo, reviews, menus);
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.chefCardMenuItem}>
      <View style={styles.chefCardMenuItemHeading}>
        <View style={{flex: 1}}>
          <Text style={styles.chefCardMenuItemTitle}>{item.title}</Text>
        </View>
        <View style={{alignItems: 'flex-end'}}>
          <Text style={styles.chefCardMenuItemPrice}>
            {`$${item.price?.toFixed(2)} `}
          </Text>
          <Text style={styles.chefCardMenuItemSize}>
            {`${item.serving_size ?? 0} Person${(item.serving_size ?? 0) > 1 ? 's' : ''} `}
          </Text>
        </View>
      </View>
      <Text style={styles.chefCardMenuItemDescription}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );
};

export default memo(ChefMenuItem, (prevProps, nextProps) => {
  return prevProps.item.id === nextProps.item.id;
});
```

### React Compiler Note (Future)

React Compiler 1.0 (released December 2025) provides automatic memoization. From [Meta's announcement](https://www.infoq.com/news/2025/12/react-compiler-meta/):

> "React Compiler automatically optimizes component re-rendering for you... Meta reports up to 12 percent faster initial loads and more than 2.5 times faster interactions."

Once adopted, manual `React.memo`, `useMemo`, and `useCallback` calls become unnecessary as the compiler handles them automatically.

### Files to Modify

| File | Changes |
|------|---------|
| `chefCard.tsx` | Add `memo` import, wrap export with `memo()` and custom comparison |
| `chefCard.tsx` | Add `useCallback` for event handlers |
| `chefMenuItem.tsx` | Add `memo` import, wrap export with `memo()` |
| `chefMenuItem.tsx` | Add `useMemo` for customization calculations |

### Testing Checklist

- [ ] React DevTools Profiler shows reduced render counts
- [ ] ChefCards don't re-render on filter changes (use Profiler "Highlight updates")
- [ ] Menu expand/collapse still works
- [ ] Chef detail navigation works
- [ ] Order flow works correctly
- [ ] No visual glitches from stale memoized values

### Impact

| Metric | Before | After |
|--------|--------|-------|
| ChefCard renders per filter change | 10 | 0 |
| ChefMenuItem renders when menu open | 30 per parent update | 0 |
| Total renders per session | 50-100+ | 15-20 |
| Time saved per filter change | - | ~50-100ms |
| **Total render time saved** | - | **200-400ms per session** |

### Effort: 45 minutes

### Dependencies on Other Issues

- **Issue #3 (Rating Calculation):** The `useMemo` for rating should be implemented first
- **Issue #6 (Inline Functions):** For full benefit, fix inline function props too
- **Issue #7 (List Keys):** Stable keys help React reconciliation with memoized components

These fixes are most effective when done together.

---

## Issue #5: Sequential Image Loading Without Caching ✅ COMPLETED

> **Status:** Implemented on 2025-12-26
>
> **Changes Made:**
> - Updated `StyledProfileImage` with `cachePolicy="memory-disk"`, blurhash placeholder, 200ms transition
> - Removed unnecessary `useState` and custom overlay component
> - Added `useMemo` for style calculation
> - Added image prefetching for first 5 chefs in `home/index.tsx`

### Problem (RESOLVED)

Profile images load sequentially without caching configuration, causing slow visual appearance and repeated network requests. The current implementation uses a custom placeholder overlay instead of expo-image's built-in features, missing out on performance optimizations.

### Architecture Overview

**Current Image Loading Flow:**
```
ChefCard renders
    │
    └── StyledProfileImage mounts
            │
            ├── useState(false) for isLoaded
            ├── <Image source={{uri: url}} /> starts loading
            │       │
            │       ├── No cachePolicy → unclear caching behavior
            │       ├── No priority → competes equally with all images
            │       └── No placeholder → shows nothing during load
            │
            └── Custom overlay visible until onLoad fires
                    └── Gray background + Icon_Profile.png
```

**Problems with Current Approach:**
1. No caching strategy = repeated network requests
2. No priority hints = all images compete equally
3. Custom overlay = extra component + state management
4. No transition = abrupt appearance when image loads

### Primary Location

**File:** [frontend/app/components/styledProfileImage/index.tsx](../frontend/app/components/styledProfileImage/index.tsx)

**Lines 1-57 - Current implementation:**
```typescript
import { Image } from 'expo-image';
import { useState } from 'react';
import { View, ViewStyle } from 'react-native';
import styles from './styles';

type Props = {
  url?: string;
  containerStyle?: ViewStyle;
  size?: number;
};

const StyledProfileImage = (props: Props) => {
  const [isLoaded, setLoaded] = useState(false);  // Unnecessary state

  var style = {...styles.img};  // Recreated every render
  if (props.size) {
    style = {
      ...style,
      width: props.size,
      height: props.size,
      borderRadius: props.size,
    };
  }

  const handleLoadStart = () => {
    setLoaded(false);  // Triggers re-render
  };

  const handleLoad = () => {
    setLoaded(true);   // Triggers re-render
  };

  const handleLoadEnd = () => {};  // Empty function

  return (
    <View style={[styles.container, props.containerStyle]}>
      <Image
        style={style}
        source={{uri: props.url}}  // No caching!
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onLoadEnd={handleLoadEnd}
      />
      {!isLoaded && (  // Conditional rendering = layout shift
        <View style={styles.overlay}>
          <Image
            source={require('../../assets/icons/Icon_Profile.png')}
            style={styles.imgPlaceholder}
            resizeMode={'contain'}
          />
        </View>
      )}
    </View>
  );
};

export default StyledProfileImage;
```

**Styles file:** [frontend/app/components/styledProfileImage/styles.ts](../frontend/app/components/styledProfileImage/styles.ts)
```typescript
const styles = StyleSheet.create({
  container: {},
  img: {
    width: 80,
    height: 80,
    borderRadius: 100,
  },
  overlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    backgroundColor: 'grey',
  },
  imgPlaceholder: {width: '100%', height: '100%', borderRadius: 100},
});
```

### expo-image Available Features (Not Used)

According to [Expo Image Documentation](https://docs.expo.dev/versions/latest/sdk/image/):

| Feature | Prop | Our Code | Optimal |
|---------|------|----------|---------|
| Caching | `cachePolicy` | Not set | `"memory-disk"` |
| Priority | `priority` | Not set | `"high"` for visible, `"low"` for below fold |
| Placeholder | `placeholder` | Custom overlay | Blurhash string |
| Transition | `transition` | Not set | `200` (ms) |
| Content Fit | `contentFit` | Not set | `"cover"` |
| Prefetch | `Image.prefetch()` | Not used | Pre-load visible images |

### expo-image Cache Policy Details

From [expo-image documentation](https://docs.expo.dev/versions/latest/sdk/image/):

| Policy | Memory Cache | Disk Cache | Best For |
|--------|--------------|------------|----------|
| `"none"` | No | No | Debug only |
| `"disk"` | No | Yes | Large images, save memory |
| `"memory"` | Yes | No | Fast access, limited images |
| `"memory-disk"` | Yes | Yes | **Best for profile images** |

**Known Issue:** There's a [reported memory leak](https://github.com/expo/expo/issues/40544) with `memory` and `memory-disk` when rendering many different images rapidly. For profile images (80x80, limited count), this is acceptable.

### Blurhash for Placeholders

Blurhash is a compact representation of a placeholder image. Instead of loading a separate placeholder image, you encode the blur as a short string.

**Example blurhash for a person silhouette:** `L6PZfSi_.AyE_3t7t7R**0o#DgR4`

Benefits:
- ~20-30 bytes vs loading another image
- Instant display (no network request)
- Smooth transition to real image

You can generate blurhashes server-side when photos are uploaded, or use a generic one for all profile images.

### Solution

**Updated StyledProfileImage:**

```typescript
// frontend/app/components/styledProfileImage/index.tsx

import { Image } from 'expo-image';
import { useMemo } from 'react';
import { View, ViewStyle } from 'react-native';
import styles from './styles';

// Generic blurhash for person silhouette placeholder
// Generate custom ones server-side for better UX
const DEFAULT_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

// Fallback image for when no URL provided
const FALLBACK_IMAGE = require('../../assets/icons/Icon_Profile.png');

type Props = {
  url?: string;
  containerStyle?: ViewStyle;
  size?: number;
  priority?: 'low' | 'normal' | 'high';
  blurhash?: string;  // Optional custom blurhash per image
};

const StyledProfileImage = ({
  url,
  containerStyle,
  size,
  priority = 'normal',
  blurhash,
}: Props) => {
  // Memoize style to prevent recreating on every render
  const imageStyle = useMemo(() => {
    if (!size) return styles.img;
    return {
      ...styles.img,
      width: size,
      height: size,
      borderRadius: size,
    };
  }, [size]);

  // Determine source - fallback if no URL
  const source = url ? { uri: url } : FALLBACK_IMAGE;

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        style={imageStyle}
        source={source}
        placeholder={blurhash || DEFAULT_BLURHASH}
        placeholderContentFit="cover"
        cachePolicy="memory-disk"
        priority={priority}
        transition={200}
        contentFit="cover"
      />
    </View>
  );
};

export default StyledProfileImage;
```

**Key changes:**
1. ❌ Removed `useState` for loading state (expo-image handles this internally)
2. ❌ Removed custom overlay component
3. ❌ Removed unnecessary event handlers
4. ✅ Added `cachePolicy="memory-disk"`
5. ✅ Added `placeholder` with blurhash
6. ✅ Added `priority` prop
7. ✅ Added `transition` for smooth loading
8. ✅ Memoized style calculation

### Usage Updates

**In ChefCard (with index for priority):**
```typescript
// Parent passes index to ChefCard, or use intersection observer
<StyledProfileImage
  url={getImageURL(chefInfo.photo)}
  size={80}
  priority={index < 3 ? 'high' : 'low'}  // First 3 get priority
/>
```

**In Home - Add prefetching:**
```typescript
// frontend/app/screens/customer/home/index.tsx

import { Image } from 'expo-image';
import { getImageURL } from '../../../utils/functions';

// After chefs data loads, prefetch first few images
useEffect(() => {
  if (chefs.length > 0) {
    // Prefetch first 5 visible chef images
    const imagesToPrefetch = chefs
      .slice(0, 5)
      .map(chef => chef.photo ? getImageURL(chef.photo) : null)
      .filter((url): url is string => url !== null);

    if (imagesToPrefetch.length > 0) {
      Image.prefetch(imagesToPrefetch, { cachePolicy: 'memory-disk' })
        .catch(err => console.warn('Image prefetch failed:', err));
    }
  }
}, [chefs]);
```

### Server-Side Optimization (Bonus)

For even better UX, generate blurhash on the backend when photos are uploaded:

```php
// backend - when processing uploaded photos
use Bepsvpt\Blurhash\Facades\Blurhash;

$blurhash = Blurhash::encode($imagePath);
// Store with user record: user.photo_blurhash = $blurhash

// Return in API response:
// "photo_blurhash": "L6PZfSi_.AyE_3t7t7R**0o#DgR4"
```

Then use it in frontend:
```typescript
<StyledProfileImage
  url={getImageURL(chefInfo.photo)}
  blurhash={chefInfo.photo_blurhash}
  size={80}
/>
```

### Files to Modify

| File | Changes |
|------|---------|
| `frontend/app/components/styledProfileImage/index.tsx` | Complete rewrite with caching |
| `frontend/app/screens/customer/home/index.tsx` | Add prefetch useEffect |
| `frontend/app/screens/customer/home/components/chefCard.tsx` | Pass priority prop |

### Testing Checklist

- [x] Images load with blurhash placeholder visible first
- [x] Images fade in smoothly (200ms transition)
- [x] Return visits load images instantly (from cache)
- [ ] Memory usage doesn't grow unboundedly (check with Profiler)
- [ ] No network requests for cached images (check Network tab)
- [x] Fallback shows when no URL provided
- [x] Different sizes work correctly

### Impact

| Metric | Before | After |
|--------|--------|-------|
| Initial load experience | Gray box → sudden appear | Blurhash → smooth fade |
| Cache hits on return | 0% (depends on default) | 90%+ |
| Time to first image visible | 800-1500ms | 50-100ms (blurhash) |
| Time to real image | 800-1500ms | 200-400ms (cached) |
| All images visible | 2000-3000ms | 500-1000ms |
| Network requests on return | 10 | 0-2 |
| Component re-renders during load | 2-3 per image | 0 |
| Memory overhead | Custom overlay components | Native image caching |

### Effort: 1.5 hours

### References

- [Expo Image Documentation](https://docs.expo.dev/versions/latest/sdk/image/)
- [Caching images in React Native (LogRocket)](https://blog.logrocket.com/caching-images-react-native-tutorial-with-examples/)
- [expo-image cachePolicy issues (GitHub)](https://github.com/expo/expo/issues/40544)

---

## Issue #6: Inline Function Props Causing Re-renders

### Problem

The parent component passes **new function references** on every render, defeating `React.memo` even when data hasn't changed. This is a classic React anti-pattern that wastes the benefits of memoization.

### Architecture Overview

**How Inline Functions Break Memoization:**
```
Render #1:
  ChefCard receives: { gotoOrder: () => handleChefDetail(1) }  ← Function A

Render #2 (parent re-renders):
  ChefCard receives: { gotoOrder: () => handleChefDetail(1) }  ← Function B (NEW!)

React.memo comparison:
  Function A === Function B  →  false (different references)
  Result: ChefCard re-renders even though behavior is identical
```

### Primary Location

**File:** [frontend/app/screens/customer/home/index.tsx](../frontend/app/screens/customer/home/index.tsx)

**Lines 293-304 - Inline function in map:**
```typescript
{filteredChefs.map((item, index) => {
  return (
    <ChefCard
      chefInfo={item}
      reviews={item.reviews}
      menus={item.menus}
      gotoChefDetail={handleChefDetail}  // ✅ OK - useCallback in parent
      gotoOrder={() => handleChefDetail(item.id)}  // ❌ NEW FUNCTION EVERY RENDER
      key={`cc_${index}`}
    />
  );
})}
```

**Also in ChefCard (line 86):**
```typescript
// Inside ChefCard component
<ChefMenuItem
  item={item}
  onPress={() => gotoOrder(item, chefInfo, reviews, menus)}  // ❌ NEW FUNCTION
  key={`menuItem_${index}`}
/>
```

### Why This Defeats React.memo

React's default prop comparison uses `Object.is()` (referential equality):

```javascript
// How React.memo compares props
function shallowEqual(prev, next) {
  for (let key in prev) {
    if (!Object.is(prev[key], next[key])) {
      return false;  // Props changed, re-render!
    }
  }
  return true;
}

// Inline functions ALWAYS fail this check
const fn1 = () => doSomething();
const fn2 = () => doSomething();
Object.is(fn1, fn2);  // false - different memory addresses
```

### All Inline Functions in Home Screen

| Location | Code | Problem |
|----------|------|---------|
| Line 300 | `gotoOrder={() => handleChefDetail(item.id)}` | New function per chef, per render |
| Line 208 | `onPress={() => navigate.toCustomer.account(...)}` | Location press handler |
| Line 233 | `onPress={() => navigate.toCustomer.account(...)}` | Duplicate location handler |
| Line 266 | `onPress={() => handleTimeSlotChange(item.id)}` | Time slot buttons |
| Line 278 | `onPress={() => handleCategoryChange(0)}` | "All" category button |
| Line 286 | `onPress={() => handleCategoryChange(item.id ?? 0)}` | Category buttons |

### Solution Options

**Option A: Pass data, let child create callback (Recommended)**

The cleanest solution is to pass the data needed to construct the callback, and let the child component create its own stable callback using `useCallback`:

```typescript
// Parent (home/index.tsx)
{filteredChefs.map((item) => (
  <ChefCard
    chefInfo={item}
    reviews={item.reviews}
    menus={item.menus}
    onChefDetailPress={handleChefDetail}  // Stable reference
    key={`chef_${item.id}`}
  />
))}

// Child (chefCard.tsx)
const ChefCard = memo(({ chefInfo, reviews, menus, onChefDetailPress }: Props) => {
  // Child creates its own stable callback
  const handlePress = useCallback(() => {
    onChefDetailPress(chefInfo.id);
  }, [chefInfo.id, onChefDetailPress]);

  const handleMenuItemPress = useCallback((menuItem: IMenu) => {
    // Navigate to order flow with menu item
    onChefDetailPress(chefInfo.id, menuItem);
  }, [chefInfo.id, onChefDetailPress]);

  return (
    <TouchableOpacity onPress={handlePress}>
      {/* ... */}
    </TouchableOpacity>
  );
});
```

**Option B: Pre-memoize handler map**

If you must keep the callback in the parent, create a memoized map of handlers:

```typescript
// Parent (home/index.tsx)
const chefPressHandlers = useMemo(() => {
  return new Map(
    filteredChefs.map(chef => [
      chef.id,
      () => handleChefDetail(chef.id)
    ])
  );
}, [filteredChefs, handleChefDetail]);

// In render
<ChefCard
  gotoOrder={chefPressHandlers.get(item.id)}
/>
```

**Option C: Use custom comparison in React.memo**

Skip function comparison entirely in the memo check (least ideal):

```typescript
export default memo(ChefCard, (prevProps, nextProps) => {
  // Only compare data props, ignore function props
  return (
    prevProps.chefInfo.id === nextProps.chefInfo.id &&
    prevProps.reviews.length === nextProps.reviews.length
    // Intentionally omitting gotoOrder comparison
  );
});
```

### Complete Implementation

**Updated home/index.tsx:**
```typescript
// Remove gotoOrder prop entirely, use simpler interface
{filteredChefs.map((item) => (
  <ChefCard
    chefInfo={item}
    reviews={item.reviews}
    menus={item.menus}
    onNavigate={handleChefDetail}  // Single stable function
    key={`chef_${item.id}`}
  />
))}
```

**Updated ChefCard props:**
```typescript
type Props = {
  chefInfo: IUser;
  reviews: Array<IReview>;
  menus: Array<IMenu>;
  onNavigate: (chefId: number, menu?: IMenu) => void;  // Simplified
};
```

### Files to Modify

| File | Changes |
|------|---------|
| `home/index.tsx` | Remove inline `gotoOrder`, pass `onNavigate` |
| `chefCard.tsx` | Add `useCallback` for press handlers |
| `chefMenuItem.tsx` | Use callback from props instead of inline |

### Testing Checklist

- [ ] React DevTools shows stable function references across renders
- [ ] Clicking chef card navigates correctly
- [ ] Clicking menu item navigates correctly
- [ ] Filter changes don't cause ChefCard re-renders (with React.memo)
- [ ] No regression in navigation flow

### Impact

| Metric | Before | After |
|--------|--------|-------|
| Function references per render | 10+ new | 0 new |
| React.memo effectiveness | 0% (always fails) | 100% (when data unchanged) |
| Wasted re-renders per filter | 10 ChefCards | 0 ChefCards |
| **Synergy with Issue #4** | memo useless | memo works perfectly |

### Effort: 30 minutes

### Relationship to Other Issues

This fix is **required** for Issue #4 (React.memo) to be effective. Without stable function references, wrapping components in `memo()` provides no benefit.

### Status: COMPLETED ✓

Implemented on 2025-12-26. Changes made:
- `home/index.tsx`: Simplified ChefCard props from `gotoChefDetail` + `gotoOrder` to single `onNavigate` callback
- `chefCard.tsx`: Added `useCallback` for `handleChefPress` and `handleToggleMenu`
- `chefMenuItem.tsx`: Updated to receive data props and create stable `handlePress` callback with `useCallback`

---

## Issue #7: Non-Stable List Keys

### Problem

List items use array indices as keys, which causes React to unmount and remount components when the list is filtered, sorted, or reordered. This loses component state (like `menuOpen` in ChefCard) and causes unnecessary DOM operations.

### Architecture Overview

**How React Uses Keys:**
```
Initial render: [ChefA, ChefB, ChefC]
  key="cc_0" → ChefA component instance
  key="cc_1" → ChefB component instance
  key="cc_2" → ChefC component instance

After filtering (ChefB removed): [ChefA, ChefC]
  key="cc_0" → ChefA (reused ✓)
  key="cc_1" → ChefC (React thinks this is ChefB, reconciles wrong props!)
                    ChefC's state is lost, ChefB's state applied incorrectly

With stable keys: [ChefA, ChefC]
  key="chef_1" → ChefA (reused ✓)
  key="chef_3" → ChefC (reused ✓, correct state preserved)
```

### All Index-Based Keys in Home Screen

**File:** [frontend/app/screens/customer/home/index.tsx](../frontend/app/screens/customer/home/index.tsx)

| Line | Current Key | Should Be |
|------|-------------|-----------|
| 267 | `key={\`time_${index}\`}` | `key={\`time_${item.id}\`}` |
| 288 | `key={\`category_${index}\`}` | `key={\`category_${item.id}\`}` |
| 301 | `key={\`cc_${index}\`}` | `key={\`chef_${item.id}\`}` |

**File:** [frontend/app/screens/customer/home/components/chefCard.tsx](../frontend/app/screens/customer/home/components/chefCard.tsx)

| Line | Current Key | Should Be |
|------|-------------|-----------|
| 87 | `key={\`menuItem_${index}\`}` | `key={\`menu_${item.id}\`}` |

### Why Index-Based Keys Cause Problems

1. **State Corruption:**
   - ChefCard has `menuOpen` state
   - If user expands Chef #3's menu, then filters remove Chef #2
   - Chef #3 moves to index 2
   - React sees key `cc_2` and thinks it's the old Chef #2
   - ChefCard at index 2 now shows Chef #3's data but with wrong state

2. **Wasted Reconciliation:**
   - React can't identify which items moved/changed
   - Must diff all props on all components
   - With stable keys, React can skip unchanged items entirely

3. **Animation Issues:**
   - If using layout animations, wrong keys cause items to animate incorrectly
   - Item A appears to morph into Item B instead of B sliding in

### React's Key Reconciliation Algorithm

From [React documentation](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key):

> "Keys tell React which array item each component corresponds to, so that it can match them up later. This becomes important if your array items can move (e.g. due to sorting), get inserted, or get deleted."

**With index keys:**
```
O(n) comparison needed for all items
State may be incorrectly preserved
Animation glitches
```

**With stable keys:**
```
O(1) lookup per item
State correctly preserved
Smooth animations
```

### Data Structure Analysis

Each entity has a unique `id` field that should be used:

```typescript
// IUser (chef)
interface IUser {
  id?: number;  // ← Use this
  first_name?: string;
  // ...
}

// IMenu
interface IMenu {
  id?: number;  // ← Use this
  title?: string;
  // ...
}

// ICategory
interface ICategory {
  id?: number;  // ← Use this
  name?: string;
  // ...
}

// TimeSlots (already have id in the useMemo)
const timeSlots = useMemo(() => [
  { id: 0, label: 'All' },
  { id: 1, label: 'Breakfast' },
  // ...
], []);
```

### Solution

**home/index.tsx - Line 261-270 (TimeSlots):**
```typescript
{timeSlots.map((item) => (
  <StyledTabButton
    title={item.label}
    disabled={timeSlotId != item.id}
    onPress={() => handleTimeSlotChange(item.id)}
    key={`time_${item.id}`}  // ← Stable key
  />
))}
```

**home/index.tsx - Line 281-290 (Categories):**
```typescript
{categories.map((item) => (
  <StyledTabButton
    title={item.name}
    disabled={item.id != categoryId}
    onPress={() => handleCategoryChange(item.id ?? 0)}
    key={`category_${item.id}`}  // ← Stable key
  />
))}
```

**home/index.tsx - Line 293-304 (ChefCards):**
```typescript
{filteredChefs.map((item) => (
  <ChefCard
    chefInfo={item}
    reviews={item.reviews}
    menus={item.menus}
    onNavigate={handleChefDetail}
    key={`chef_${item.id}`}  // ← Stable key
  />
))}
```

**chefCard.tsx - Line 82-89 (MenuItems):**
```typescript
{menus.map((item) => (
  <ChefMenuItem
    item={item}
    onPress={() => gotoOrder(item, chefInfo, reviews, menus)}
    key={`menu_${item.id}`}  // ← Stable key
  />
))}
```

### Edge Case: Missing IDs

If `id` could be undefined, add a fallback:

```typescript
key={`chef_${item.id ?? `fallback_${index}`}`}
```

But this indicates a data integrity issue that should be fixed on the backend.

### Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `home/index.tsx` | 267 | `time_${index}` → `time_${item.id}` |
| `home/index.tsx` | 288 | `category_${index}` → `category_${item.id}` |
| `home/index.tsx` | 301 | `cc_${index}` → `chef_${item.id}` |
| `chefCard.tsx` | 87 | `menuItem_${index}` → `menu_${item.id}` |

### Testing Checklist

- [ ] Expand a chef's menu, then filter - menu stays expanded for correct chef
- [ ] Filter by category - correct chefs remain visible
- [ ] No console warnings about duplicate keys
- [ ] React DevTools shows components reusing correctly

### Impact

| Metric | Before | After |
|--------|--------|-------|
| Component remounts on filter | 100% | 0% |
| State preserved on filter | No | Yes |
| React reconciliation work | O(n) full diff | O(1) key lookup |
| `menuOpen` state integrity | Corrupted | Preserved |

### Effort: 15 minutes

### Status: COMPLETED ✓

Implemented on 2025-12-26. Changed all index-based keys to stable ID-based keys in:
- `home/index.tsx`: timeSlots, categories, and ChefCard lists
- `chefCard.tsx`: ChefMenuItem list

### Why This Is Low-Hanging Fruit

This is a simple find-replace fix that:
- Takes ~15 minutes
- Zero risk of breaking functionality
- Improves state management reliability
- Works synergistically with React.memo (Issue #4)

---

## Issue #8: Backend API Performance

### Status: COMPLETED ✓

Implemented on 2025-12-12. All four optimizations have been applied:
- Database indexes migration: `2025_12_12_000001_add_chef_search_performance_indexes.php`
- Bounding box pre-filter: `MapiController.php:3212-3235`
- Batch loading (N+1 fix): `MapiController.php:3251-3288`
- Response caching (5 min TTL): `MapiController.php:3088-3103, 3363`

### Problem (RESOLVED)

The `get_search_chefs` API takes 700-2800ms to respond, which is the **single largest contributor** to slow load times. This delay occurs before any frontend optimizations can help—users must wait for the network response before any content appears.

### Architecture Overview

**API Request Flow:**
```
Frontend                    Network                 Backend
────────                    ───────                 ───────
loadData() called
    │
    ├── dispatch(showLoading())
    │
    └── fetch('/mapi/get_search_chefs/123')  ──────►  MapiController
                                                          │
         [User sees spinner for 700-2800ms]               ├── Query users table
                                                          ├── Filter by user_type, verified
                                                          ├── Calculate Haversine for EACH row
                                                          ├── Filter by distance
                                                          ├── Apply time slot filtering
                                                          ├── Load menus for each chef
                                                          ├── Load reviews for each chef
                                                          ├── Load customizations for each menu
                                                          │
    ◄───────────────────────────────────────────────── JSON Response
    │
    ├── Parse JSON (~50ms)
    ├── Redux dispatches (~200ms)
    ├── Component renders (~300ms)
    └── Image loading (~1000ms)
```

### Primary Location

**Backend:** [backend/app/Http/Controllers/MapiController.php](../backend/app/Http/Controllers/MapiController.php)

**Lines ~2918-3195:** The `get_search_chefs` method

### Already Documented

A full backend performance analysis exists at:
**[CHEF_SEARCH_PERFORMANCE_PLAN.md](./CHEF_SEARCH_PERFORMANCE_PLAN.md)**

This section provides a summary focused on frontend impact.

### Key Backend Bottlenecks

| Bottleneck | Current Behavior | Impact |
|------------|------------------|--------|
| **No indexes** | Full table scans on `users`, `menus`, `reviews` | O(n) instead of O(log n) |
| **Haversine on all rows** | Distance calc before filtering | 1000+ calculations per request |
| **No bounding box** | Checks distance for chefs worldwide | 90% wasted computation |
| **N+1 queries** | Separate query for each chef's menus/reviews | 30+ queries per request |
| **No caching** | Fresh query every time, even for same params | Redundant DB load |
| **Complex time filtering** | 105 lines of repeated logic | Hard to optimize |

### Response Time Breakdown (Estimated)

| Operation | Time | % of Total |
|-----------|------|------------|
| Database query (users) | 200-400ms | 20% |
| Haversine calculations | 300-800ms | 35% |
| Menu loading (N+1) | 200-600ms | 25% |
| Review loading (N+1) | 100-400ms | 15% |
| Time slot filtering | 50-100ms | 5% |
| **Total** | **850-2300ms** | **100%** |

### Quick Win Solutions

**1. Add Database Indexes (30 min, 50-70% faster)**

```sql
-- Migration: add_chef_search_indexes
ALTER TABLE users ADD INDEX idx_chef_search (user_type, is_pending, verified, status);
ALTER TABLE users ADD INDEX idx_chef_location (latitude, longitude);
ALTER TABLE menus ADD INDEX idx_menu_chef_status (user_id, status);
ALTER TABLE reviews ADD INDEX idx_review_chef (to_user_id);
```

**2. Add Bounding Box Pre-Filter (15 min, 30-50% faster)**

```php
// Before Haversine, filter to rough geographic box
$lat_range = 0.5;  // ~35 miles
$lng_range = 0.5;

$query->whereBetween('latitude', [$user_lat - $lat_range, $user_lat + $lat_range])
      ->whereBetween('longitude', [$user_lng - $lng_range, $user_lng + $lng_range]);
```

**3. Eager Load Relationships (30 min, 20-40% faster)**

```php
// Instead of N+1 queries
$chefs = User::where(...)
    ->with(['menus' => function($q) {
        $q->where('status', 2)->with('customizations');
    }, 'reviews'])
    ->get();
```

**4. Add Response Caching (1-2 hrs, 90%+ faster on hit)**

```php
// Cache key based on search parameters
$cacheKey = "chef_search:{$zip}:{$date}:{$time_slot}:{$category}";

return Cache::remember($cacheKey, 300, function() use (...) {
    // Existing query logic
});
```

### Frontend Mitigation (While Backend Fix Pending)

Even before backend fixes, frontend can mitigate perceived slowness:

1. **Skeleton screens** instead of spinner
2. **Optimistic UI** showing cached previous results
3. **Progressive loading** showing chefs as they load
4. **Background refresh** updating stale data silently

### Measurement

Add timing to API calls:

```php
// Backend logging
$start = microtime(true);
// ... query logic ...
\Log::info('Chef search took: ' . (microtime(true) - $start) . 's');
```

```typescript
// Frontend logging
const start = performance.now();
const response = await GetSearchChefAPI(params, dispatch);
console.log(`API response time: ${performance.now() - start}ms`);
```

### Impact of Combined Fixes

| Scenario | Response Time |
|----------|---------------|
| **Current (no optimization)** | 700-2800ms |
| After indexes only | 300-800ms |
| After indexes + bounding box | 150-500ms |
| After indexes + bounding box + eager load | 100-300ms |
| Cache hit | 10-50ms |

### Files to Modify (Backend)

| File | Changes |
|------|---------|
| `database/migrations/xxx_add_chef_search_indexes.php` | New migration for indexes |
| `app/Http/Controllers/MapiController.php` | Add bounding box, eager loading, caching |
| `app/Models/User.php` | Add `menus()` and `reviews()` relationships if missing |

### Testing Checklist

- [ ] API response time < 500ms for typical search
- [ ] Cache hits return < 100ms
- [ ] No regression in search results accuracy
- [ ] Time slot filtering still works correctly
- [ ] Distance calculations still accurate

### Effort

| Fix | Time | Impact |
|-----|------|--------|
| Database indexes | 30 min | High |
| Bounding box | 15 min | Medium |
| Eager loading | 30 min | Medium |
| Response caching | 1-2 hrs | Very High |
| **Total** | **2.5-3.5 hrs** | **3-5x faster** |

### Priority

Backend optimization should be **Phase 4** because:
1. Frontend fixes (Phase 1-3) improve perceived performance immediately
2. Backend fixes require deployment and migration
3. Frontend fixes mask slow backend (spinner timing, skeletons)
4. Backend fixes provide the largest absolute improvement

However, if backend response time exceeds 3 seconds regularly, consider prioritizing backend work earlier.

---

## Implementation Priority

### Phase 1: Immediate UX Fix (Day 1)

| Task | File | Lines | Time | Status |
|------|------|-------|------|--------|
| Fix spinner timing | home/index.tsx | 104-131 | 1 hr | ⏳ Pending |
| Batch Redux dispatches | api.ts | 338-353 | 30 min | ✅ **Done** |

**Expected result:** Spinner stays visible until content ready

### Phase 2: Component Optimization (Day 1-2)

| Task | File | Lines | Time | Status |
|------|------|-------|------|--------|
| Memoize ChefCard | chefCard.tsx | all | 30 min | ⏳ Pending |
| Memoize rating calculation | chefCard.tsx | 34-37 | 15 min | ✅ **Done** |
| Fix inline function props | home/index.tsx | 293-304 | 30 min | ✅ **Done** |
| Fix list keys | home/index.tsx, chefCard.tsx | various | 15 min | ✅ **Done** |

**Expected result:** 50-70% fewer re-renders

### Phase 3: Image Optimization (Day 2)

| Task | File | Lines | Time |
|------|------|-------|------|
| Add caching to StyledProfileImage | styledProfileImage/index.tsx | all | 1 hr |
| Add image prefetching | home/index.tsx | new | 30 min |

**Expected result:** 60-80% faster image loading, cached on return visits

### Phase 4: Backend (Day 3+)

See [CHEF_SEARCH_PERFORMANCE_PLAN.md](./CHEF_SEARCH_PERFORMANCE_PLAN.md)

---

## Measurement Plan

### Before Starting

Add timing logs to measure current performance:

```typescript
// In loadData()
const startTime = performance.now();

const searchChefs = await GetSearchChefAPI(/* ... */);
console.log(`API took: ${performance.now() - startTime}ms`);

setChefs(searchChefs.data);
console.log(`State update took: ${performance.now() - startTime}ms`);

// After render in useEffect
useEffect(() => {
  if (chefs.length > 0) {
    console.log(`First render with chefs: ${performance.now()}ms`);
  }
}, [chefs]);
```

### Key Metrics to Track

1. **Time to spinner hide** (currently: API response time)
2. **Time to first ChefCard visible** (currently: +500-800ms after spinner)
3. **Time to all images loaded** (currently: +1000-2000ms after cards)
4. **Total time from navigation to fully loaded** (currently: 2-5 seconds)

### After Each Fix

Re-measure and document improvement in percentage.

---

## Summary

| Issue | Severity | Fix Time | Impact | Status |
|-------|----------|----------|--------|--------|
| Spinner timing | Critical | 1 hr | Eliminates blank screen | ⏳ Pending |
| N+1 Redux dispatches | High | 30 min | 70% faster state updates | ✅ **Done** |
| Non-memoized components | High | 45 min | 50% fewer re-renders | ⏳ Pending |
| Image loading | High | 1.5 hrs | 60% faster image display | ✅ **Done** |
| Inline functions | Medium | 30 min | Enables memo benefits | ✅ **Done** |
| List keys | Low | 15 min | Prevents subtle bugs | ✅ **Done** |
| Backend API | High | 3-4 hrs | 3-5x faster API | ✅ **Done** |

**Total frontend fixes:** ~4-5 hours
**Expected improvement:** From 2-5 seconds to 0.5-1.5 seconds perceived load time

---

## References

- [Expo Image Documentation](https://docs.expo.dev/versions/latest/sdk/image/)
- [React.memo Documentation](https://react.dev/reference/react/memo)
- [React Native Performance Optimization 2025](https://danielsarney.com/blog/react-native-performance-optimization-2025-making-mobile-apps-fast/)
- [Redux Persist Configuration](https://github.com/rt2zz/redux-persist)
