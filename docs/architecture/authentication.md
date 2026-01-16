# Authentication & Authorization

Complete documentation of user authentication, token management, and role-based access control.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Methods](#authentication-methods)
3. [Laravel Passport (OAuth2)](#laravel-passport-oauth2)
4. [User Types & Roles](#user-types--roles)
5. [Token Management](#token-management)
6. [Frontend Authentication](#frontend-authentication)
7. [Admin Authentication](#admin-authentication)
8. [Security Best Practices](#security-best-practices)

---

## Overview

Taist uses multiple authentication systems:

| System | Method | Users |
|--------|--------|-------|
| Mobile API | Laravel Passport (OAuth2) | Customers & Chefs |
| Admin Panel | Session-based | Administrators |

**Related Files:**
- Backend: `backend/app/Http/Controllers/MapiController.php`
- Middleware: `backend/app/Http/Middleware/`
- Frontend: `frontend/app/services/api.ts`

---

## Authentication Methods

### Mobile API (MAPI)

Bearer token authentication via Laravel Passport.

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

### Admin Panel

Session-based authentication with CSRF protection.

---

## Laravel Passport (OAuth2)

### Setup

Passport is configured in `backend/config/auth.php`:

```php
'guards' => [
    'mapi' => [
        'driver' => 'passport',
        'provider' => 'listeners',
    ],
],

'providers' => [
    'listeners' => [
        'driver' => 'eloquent',
        'model' => App\Listener::class,
    ],
],
```

### Token Generation

**Registration:**
```php
// MapiController@register
public function register(Request $request)
{
    // Validate input
    $validator = Validator::make($request->all(), [
        'email' => 'required|email|unique:tbl_users',
        'password' => 'required|min:6',
        'first_name' => 'required',
        'last_name' => 'required',
        'user_type' => 'required|in:1,2',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'error' => $validator->errors()->first(),
        ], 400);
    }

    // Create user
    $user = new Listener();
    $user->email = $request->email;
    $user->password = bcrypt($request->password);
    $user->first_name = $request->first_name;
    $user->last_name = $request->last_name;
    $user->user_type = $request->user_type;
    $user->is_pending = $request->user_type == 2 ? 1 : 0;
    $user->save();

    // Generate token
    $token = $user->createToken('TaistApp')->accessToken;

    return response()->json([
        'success' => true,
        'data' => [
            'id' => $user->id,
            'email' => $user->email,
            'user_type' => $user->user_type,
            'token' => 'Bearer ' . $token,
        ],
    ]);
}
```

**Login:**
```php
// MapiController@login
public function login(Request $request)
{
    // Validate
    $validator = Validator::make($request->all(), [
        'email' => 'required|email',
        'password' => 'required',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'error' => 'Invalid credentials',
        ], 400);
    }

    // Find user
    $user = Listener::where('email', $request->email)->first();

    if (!$user || !Hash::check($request->password, $user->password)) {
        return response()->json([
            'success' => false,
            'error' => 'Invalid email or password',
        ], 401);
    }

    // Generate token
    $token = $user->createToken('TaistApp')->accessToken;

    return response()->json([
        'success' => true,
        'data' => [
            ...$user->toArray(),
            'token' => 'Bearer ' . $token,
        ],
    ]);
}
```

### Protected Routes

Routes requiring authentication use the `auth:mapi` middleware:

```php
// backend/routes/mapi.php
Route::group(['middleware' => ['auth:mapi']], function () {
    Route::get('logout', 'MapiController@logout');
    Route::get('get_orders', 'MapiController@getOrders');
    // ... all protected routes
});
```

### Logout

```php
// MapiController@logout
public function logout(Request $request)
{
    $request->user()->token()->revoke();

    return response()->json([
        'success' => true,
        'message' => 'Successfully logged out',
    ]);
}
```

---

## User Types & Roles

### User Types

| Type | Value | Description |
|------|-------|-------------|
| Customer | 1 | Can browse chefs, place orders |
| Chef | 2 | Can create menus, receive orders |

### Status Flags

| Flag | Field | Description |
|------|-------|-------------|
| Pending | `is_pending` | Chef awaiting approval |
| Verified | `verified` | Email verified |
| Quiz Done | `quiz_completed` | Safety quiz passed |
| Online | `is_online` | Chef accepting orders |

### Role-Based Access

**Customers can:**
- Browse chefs and menus
- Place orders
- Leave reviews
- Message chefs about orders
- Manage payment methods

**Chefs can:**
- Create/edit menus
- Accept/reject orders
- Set availability
- View earnings
- Message customers

**Admins can:**
- Approve/reject chefs
- Manage categories
- View all orders
- Create discount codes
- Export data

### Frontend Role Detection

```typescript
// frontend/app/utils/navigation.ts
export const navigate = {
  toAuthorizedStacks: {
    byUserType: (user: IUser) => {
      if (user.user_type === 1) {
        navigate.toCustomer.tabs();
      } else if (user.user_type === 2) {
        if (user.is_pending === 1) {
          navigate.toChef.onboarding();
        } else {
          navigate.toChef.tabs();
        }
      }
    },
  },
};
```

---

## Token Management

### Token Storage (Frontend)

```typescript
// frontend/app/utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveToken = async (token: string) => {
  await AsyncStorage.setItem('auth_token', token);
};

export const getToken = async () => {
  return await AsyncStorage.getItem('auth_token');
};

export const clearToken = async () => {
  await AsyncStorage.removeItem('auth_token');
};
```

### API Client with Token

```typescript
// frontend/app/services/api.ts
const getHeaders = async () => {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && { 'Authorization': token }),
  };
};

export const GET = async (endpoint: string) => {
  const headers = await getHeaders();
  const response = await fetch(API_URL + endpoint, {
    method: 'GET',
    headers,
  });
  return response.json();
};

export const POST = async (endpoint: string, body: any) => {
  const headers = await getHeaders();
  const response = await fetch(API_URL + endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return response.json();
};
```

### Auto-Login

```typescript
// frontend/app/screens/common/splash/index.tsx
const checkAutoLogin = async () => {
  const token = await getToken();
  const userData = await AsyncStorage.getItem('user_data');

  if (token && userData) {
    const user = JSON.parse(userData);
    dispatch(setUser(user));
    navigate.toAuthorizedStacks.byUserType(user);
  } else {
    navigate.toCommon.login();
  }
};
```

### Token Refresh

Passport tokens have configurable expiration. Handle expired tokens:

```typescript
// frontend/app/services/api.ts
const handleResponse = async (response: Response) => {
  if (response.status === 401) {
    // Token expired
    await clearToken();
    navigate.toCommon.login();
    return { success: false, error: 'Session expired' };
  }
  return response.json();
};
```

---

## Frontend Authentication

### Login Flow

```typescript
// frontend/app/services/api.ts
export const LoginAPI = async (params: { email: string; password: string }) => {
  const resp = await POST('/login', params);

  if (resp.success) {
    // Save token
    await saveToken(resp.data.token);

    // Save user data
    await AsyncStorage.setItem('user_data', JSON.stringify(resp.data));

    // Fetch related data
    await fetchUserData(resp.data);
  }

  return resp;
};

const fetchUserData = async (user: IUser) => {
  // Parallel data fetching
  await Promise.all([
    GetCategoriesAPI(),
    GetAllergensAPI(),
    GetZipCodes(),
    user.user_type === 2 ? GetChefProfileAPI({ user_id: user.id }) : null,
  ]);
};
```

### Registration Flow

```typescript
export const RegisterAPI = async (params: IUser) => {
  const resp = await POST('/register', params);

  if (resp.success) {
    await saveToken(resp.data.token);
    await AsyncStorage.setItem('user_data', JSON.stringify(resp.data));
  }

  return resp;
};
```

### Logout Flow

```typescript
export const LogOutAPI = async () => {
  try {
    await GET('/logout');
  } finally {
    // Always clear local data
    await clearToken();
    await AsyncStorage.removeItem('user_data');
    dispatch(clearUser());
    dispatch(clearCustomer());
    dispatch(clearChef());
  }
};
```

### Password Reset

```typescript
// Step 1: Request reset code
export const ForgotAPI = async (email: string) => {
  return await POST('/forgot', { email });
};

// Step 2: Reset with code
export const ResetPasswordAPI = async (params: {
  code: string;
  password: string;
}) => {
  return await POST('/reset_password', params);
};
```

### Phone Verification

```typescript
export const VerifyPhoneAPI = async (phone: string) => {
  return await POST('/verify_phone', { phone });
  // Sends SMS verification code via Twilio
};
```

---

## Admin Authentication

### Session-Based Auth

Admin panel uses Laravel's session authentication.

**Routes:** `backend/routes/admin.php`

```php
// Public routes
Route::get('login', 'LoginController@viewLogin')->name('viewlogin');
Route::post('login', 'LoginController@login')->name('login');

// Protected routes
Route::group(['middleware' => ['auth:admin']], function () {
    Route::get('logout', 'LoginController@logout');
    Route::get('chefs', 'AdminController@chefs');
    // ...
});
```

### Login Controller

```php
// backend/app/Http/Controllers/Admin/LoginController.php
public function login(Request $request)
{
    $credentials = $request->validate([
        'email' => 'required|email',
        'password' => 'required',
    ]);

    if (Auth::guard('admin')->attempt($credentials)) {
        $request->session()->regenerate();
        return redirect()->route('admin.chefs');
    }

    return back()->withErrors([
        'email' => 'Invalid credentials.',
    ]);
}

public function logout(Request $request)
{
    Auth::guard('admin')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return redirect()->route('viewlogin');
}
```

### Admin Guard Configuration

```php
// config/auth.php
'guards' => [
    'admin' => [
        'driver' => 'session',
        'provider' => 'admins',
    ],
],

'providers' => [
    'admins' => [
        'driver' => 'eloquent',
        'model' => App\Models\Admins::class,
    ],
],
```

### Creating Admin Users

```bash
php artisan admin:create --email=admin@taist.com --password=secret
```

Or via command:
```php
// backend/app/Console/Commands/CreateAdminUser.php
Admins::create([
    'name' => $name,
    'email' => $email,
    'password' => bcrypt($password),
]);
```

---

## Security Best Practices

### Password Security

- **Bcrypt hashing** - All passwords hashed with bcrypt
- **Minimum length** - 6 characters required
- **No plain text** - Never store or log plain passwords

### Token Security

- **Bearer tokens** - Passed in Authorization header
- **Token revocation** - Logout invalidates tokens
- **HTTPS only** - All API calls over TLS

### CSRF Protection

Admin panel includes CSRF tokens:
```php
// In forms
@csrf
```

### Input Validation

All endpoints validate input:
```php
$validator = Validator::make($request->all(), [
    'email' => 'required|email',
    'password' => 'required|min:6',
]);
```

### Rate Limiting

Consider adding rate limiting to auth endpoints:
```php
Route::middleware('throttle:5,1')->group(function () {
    Route::post('login', 'MapiController@login');
    Route::post('forgot', 'MapiController@forgot');
});
```

### Secure Headers

```php
// Middleware for API responses
$response->headers->set('X-Content-Type-Options', 'nosniff');
$response->headers->set('X-Frame-Options', 'DENY');
```
