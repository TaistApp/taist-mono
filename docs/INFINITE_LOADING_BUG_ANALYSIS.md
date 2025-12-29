# Infinite Loading Bug Analysis: Account Switch Flow

## User Report
> "Last I remember, I was logging out of my customer to log back into my chef to accept the order request" - then stuck on splash screen with infinite spinner.

---

## Executive Summary

The infinite loading occurs due to **race conditions** and **missing error handling** in the logout → auto-login flow. When switching from customer to chef account, multiple async operations compete without proper synchronization, and there's no timeout fallback.

---

## The Problem Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Customer Mode  │────▶│     Logout      │────▶│  Splash Screen  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  ClearStorage() │     │   2s delay...   │
                        │    (async)      │     │   autoLogin()   │
                        └─────────────────┘     └─────────────────┘
                               │                        │
                               │    RACE CONDITION      │
                               └────────────────────────┘
                                         │
                                         ▼
                               ┌─────────────────┐
                               │  LoginAPI()     │
                               │  (no timeout)   │──▶ HANGS FOREVER
                               └─────────────────┘
```

---

## Root Causes

### 1. No Timeout on Auto-Login (Critical)

**File:** `frontend/app/screens/common/splash/index.tsx`

The `autoLogin()` function has NO maximum time limit:

```typescript
// Lines 153-217
const autoLogin = async () => {
  // Version check...
  const loginData = await ReadLoginData();  // Can hang
  if (loginData) {
    await performAutoLogin(loginData);       // Can hang forever
  }
};

// Called with only a 2-second startup delay, no timeout
useEffect(() => {
  setTimeout(() => {
    autoLogin();  // No timeout wrapper!
  }, 2000);
}, []);
```

**Impact:** If any API call within `LoginAPI()` hangs (network issue, slow backend), the user is stuck forever.

---

### 2. Race Condition Between Logout and Storage Read

**File:** `frontend/app/components/DrawerModal/index.tsx`

```typescript
// Lines 108-115
const handleLogOut = () => {
  handleClose();
  setTimeout(() => {
    ClearStorage();                          // Async - starts clearing
    store.dispatch({ type: 'USER_LOGOUT' }); // Immediate
    navigate.toCommon.splash();              // Navigates immediately
  }, 150);
};
```

**Problem:** `ClearStorage()` is async but not awaited. Navigation to splash happens immediately, creating a race:

| Time | ClearStorage() | Splash Screen |
|------|---------------|---------------|
| 0ms | Starts clearing AsyncStorage | Component mounts |
| 50ms | Still clearing... | Waiting... |
| 150ms | Still clearing... | Waiting... |
| 500ms | Maybe done? | PersistGate rehydrating |
| 2000ms | Should be done | `ReadLoginData()` called |

If timing is unlucky, `ReadLoginData()` could read:
- Old customer credentials (partially cleared)
- Corrupt/empty data
- Previously stored chef credentials

---

### 3. Chef-Specific API Calls Without Error Handling

**File:** `frontend/app/services/api.ts`

When logging in as a chef, additional API calls are made:

```typescript
// Lines 230-244
if (response.data.user.user_type == 2) {
  await GetChefProfileAPI({ user_id: response.data.user.id }, dispatch);
  await GetChefMenusAPI({ user_id: response.data.user.id }, dispatch);
  const paymentResp = await GetPaymentMethodAPI({ user_id: response.data.user.id }, dispatch);
  // ...
}

// Then FCM token update
const token = await GetFCMToken();  // Can hang!
if (token !== "") {
  await UpdateFCMTokenAPI(token);   // Can hang!
}
```

**Problem:** None of these have try-catch or timeouts. If any one hangs:
- `GetChefProfileAPI()` - backend slow
- `GetChefMenusAPI()` - many menus to load
- `GetPaymentMethodAPI()` - Stripe API slow
- `GetFCMToken()` - Firebase issues
- `UpdateFCMTokenAPI()` - network timeout

The entire login flow stalls.

---

### 4. Redux Persist Rehydration Conflict

**File:** `frontend/app/_layout.tsx`

```typescript
<PersistGate loading={null} persistor={persistor}>
  {children}
</PersistGate>
```

**File:** `frontend/app/store/index.ts`

```typescript
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,  // Same AsyncStorage being cleared!
};
```

**Problem:**
1. Logout clears AsyncStorage
2. New splash mounts
3. PersistGate tries to rehydrate from AsyncStorage
4. AsyncStorage is empty/partially cleared
5. Redux state becomes inconsistent (mix of old customer + new chef data)

---

### 5. Loading State Not Guaranteed to Clear

**File:** `frontend/app/screens/common/login/index.tsx`

```typescript
// Lines 38-54
const handleLogin = async () => {
  // validation...
  dispatch(showLoading());            // Show spinner
  const res = await LoginAPI(...);    // If this throws...
  dispatch(hideLoading());            // This never runs!
  // navigation...
};
```

If `LoginAPI()` throws an exception, `hideLoading()` is never called.

---

## Specific Scenario Analysis

### Customer → Chef Switch Timeline

1. **T+0ms**: User taps "Logout" in drawer
2. **T+150ms**: `ClearStorage()` starts (async), `USER_LOGOUT` dispatched, navigate to splash
3. **T+200ms**: Splash component mounts, starts 2-second timer
4. **T+300ms**: `ClearStorage()` completes, Redux persist sees empty storage
5. **T+500ms**: PersistGate tries to rehydrate, gets empty/undefined state
6. **T+2200ms**: `autoLogin()` runs
7. **T+2250ms**: `ReadLoginData()` - returns null (storage was cleared)
8. **T+2300ms**: `setSplash(false)` should be called...

**But wait!** The user said they were logging in as chef. This means:
- Either they had "Remember Me" enabled for chef account
- Or they were about to manually enter credentials

If "Remember Me" was on for BOTH accounts, the stored `@login` data might contain:
- Customer credentials (overwritten chef credentials)
- Or chef credentials (if chef was logged in with remember me previously)

The race condition means unpredictable credential state.

---

## Recommended Fixes

### Fix 1: Add Timeout Wrapper to Auto-Login (High Priority)

```typescript
// In splash/index.tsx
const autoLogin = async () => {
  const TIMEOUT_MS = 15000; // 15 seconds max

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Auto-login timeout')), TIMEOUT_MS);
  });

  try {
    await Promise.race([
      performActualAutoLogin(),
      timeoutPromise
    ]);
  } catch (error) {
    console.warn('Auto-login failed or timed out:', error);
    setSplash(false); // Show login buttons
  }
};
```

### Fix 2: Await ClearStorage Before Navigation (High Priority)

```typescript
// In DrawerModal/index.tsx
const handleLogOut = async () => {
  handleClose();
  await new Promise(resolve => setTimeout(resolve, 150)); // Wait for animation
  await ClearStorage();  // Wait for storage to clear
  store.dispatch({ type: 'USER_LOGOUT' });
  navigate.toCommon.splash();
};
```

### Fix 3: Add Try-Finally to Loading States (Medium Priority)

```typescript
// In login/index.tsx
const handleLogin = async () => {
  if (!isValidSubmission()) return;

  dispatch(showLoading());
  try {
    const res = await LoginAPI(email, password, remember);
    if (res.success === 1) {
      // Navigate based on user type
    } else {
      Alert.alert('Error', res.message);
    }
  } catch (error) {
    Alert.alert('Error', 'Login failed. Please try again.');
  } finally {
    dispatch(hideLoading()); // ALWAYS runs
  }
};
```

### Fix 4: Add Timeouts to Chef API Calls (Medium Priority)

```typescript
// In api.ts
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), ms);
  });
  return Promise.race([promise, timeout]);
};

// Usage
if (response.data.user.user_type == 2) {
  try {
    await withTimeout(GetChefProfileAPI(...), 10000);
    await withTimeout(GetChefMenusAPI(...), 10000);
    await withTimeout(GetPaymentMethodAPI(...), 10000);
  } catch (error) {
    console.warn('Chef data fetch failed:', error);
    // Continue with login anyway - data can be fetched later
  }
}
```

### Fix 5: Clear Redux Persist Properly on Logout (Medium Priority)

```typescript
// In DrawerModal/index.tsx or create a logout utility
import { persistor } from '../store';

const handleLogOut = async () => {
  handleClose();
  await new Promise(resolve => setTimeout(resolve, 150));

  // Purge persisted state first
  await persistor.purge();

  // Then clear other storage
  await ClearStorage();

  // Reset Redux
  store.dispatch({ type: 'USER_LOGOUT' });

  navigate.toCommon.splash();
};
```

### Fix 6: Add Fallback UI After Extended Wait (Low Priority)

```typescript
// In splash/index.tsx
const [showManualLogin, setShowManualLogin] = useState(false);

useEffect(() => {
  // Fallback: Always show login buttons after 10 seconds
  const fallbackTimer = setTimeout(() => {
    setShowManualLogin(true);
  }, 10000);

  return () => clearTimeout(fallbackTimer);
}, []);

// In render:
{(splash && !showManualLogin) ? (
  <SplashView />
) : (
  <LoginButtons />
)}
```

---

## Testing Checklist

After implementing fixes, test these scenarios:

- [ ] Fresh install → Login as customer → Logout → Login as chef
- [ ] Login as chef (remember me) → Force close app → Reopen → Auto-login works
- [ ] Login as customer → Logout → Login as chef → Logout → Login as customer
- [ ] Login with slow network (use Network Link Conditioner)
- [ ] Login when backend is slow (simulate with 5-second delays)
- [ ] Login when one chef API fails (mock `GetChefProfileAPI` to throw)
- [ ] Kill app during logout → Reopen → Should show login screen
- [ ] Login → Airplane mode → Logout → Remove airplane mode → Login

---

## Priority Order

1. **Fix 1**: Timeout wrapper (prevents infinite hang)
2. **Fix 3**: Try-finally on loading (prevents stuck spinner)
3. **Fix 2**: Await ClearStorage (prevents race condition)
4. **Fix 4**: Chef API timeouts (prevents slow logins)
5. **Fix 5**: Proper persist purge (prevents state conflicts)
6. **Fix 6**: Fallback UI (graceful degradation)

---

## Quick Temporary Workaround

For immediate user relief before code fix:

1. Force close the app completely
2. Go to Settings → Apps → Taist → Clear Data (or uninstall/reinstall)
3. Login fresh with chef credentials

This clears all persisted state and AsyncStorage, avoiding the race condition.
