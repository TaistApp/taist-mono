# Admin Panel

Documentation of the administrative dashboard for platform management.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Dashboard Features](#dashboard-features)
4. [User Management](#user-management)
5. [Order Management](#order-management)
6. [Discount Codes](#discount-codes)
7. [Data Exports](#data-exports)

---

## Overview

The admin panel provides platform oversight and management capabilities.

**URL:** `https://api.taist.com/admin/`

**Related Files:**
- Controller: `backend/app/Http/Controllers/Admin/AdminController.php`
- Controller: `backend/app/Http/Controllers/AdminapiController.php`
- Routes: `backend/routes/admin.php`
- Views: `backend/resources/views/admin/`

---

## Authentication

### Login

Admin authentication uses Laravel session-based auth.

**Route:** `GET /admin/login`

```php
// LoginController@login
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

    return back()->withErrors(['email' => 'Invalid credentials']);
}
```

### Creating Admin Users

```bash
php artisan admin:create
# Prompts for name, email, password
```

Or manually:
```php
Admins::create([
    'name' => 'Admin Name',
    'email' => 'admin@taist.com',
    'password' => bcrypt('secure_password'),
]);
```

---

## Dashboard Features

### Available Routes

| Route | Description |
|-------|-------------|
| `/admin/chefs` | Approved chefs list |
| `/admin/pendings` | Pending chef applications |
| `/admin/customers` | Customer list |
| `/admin/orders` | All orders |
| `/admin/menus` | Menu items |
| `/admin/categories` | Cuisine categories |
| `/admin/customizations` | Menu customizations |
| `/admin/reviews` | Customer reviews |
| `/admin/transactions` | Payment transactions |
| `/admin/earnings` | Chef earnings |
| `/admin/chats` | Conversations |
| `/admin/contacts` | Support tickets |
| `/admin/notifications` | Notification management |
| `/admin/zipcodes` | Service areas |
| `/admin/discount-codes` | Promo codes |

---

## User Management

### Chef Approval

View and approve pending chef applications.

**Route:** `GET /admin/pendings`

```php
// AdminController@pendings
public function pendings()
{
    $pendingChefs = Listener::where('user_type', 2)
        ->where('is_pending', 1)
        ->orderBy('created_at', 'desc')
        ->get();

    return view('admin.pendings', compact('pendingChefs'));
}
```

### Approve/Reject Chef

**API:** `GET /adminapi/change_chef_status`

```php
// AdminapiController@changeChefStatus
public function changeChefStatus(Request $request)
{
    $user = Listener::find($request->user_id);

    if ($request->action === 'approve') {
        $user->is_pending = 0;
        $message = 'Your chef application has been approved!';
    } else {
        $user->is_pending = 2; // Rejected
        $message = 'Your chef application was not approved.';
    }

    $user->save();

    // Send notification
    $this->notifyUser($user, $message);

    return response()->json(['success' => true]);
}
```

### Edit Chef Profile

**Route:** `GET /admin/profiles/{id}`

Allows editing:
- Personal information
- Approval status
- Account status

```php
// AdminController@editProfiles
public function editProfiles($id)
{
    $user = Listener::find($id);
    return view('admin.profile_edit', compact('user'));
}

// AdminController@updateProfiles
public function updateProfiles(Request $request, $id)
{
    $user = Listener::find($id);
    $user->fill($request->only([
        'first_name', 'last_name', 'email', 'phone',
        'address', 'city', 'state', 'zip', 'bio'
    ]));
    $user->save();

    return redirect()->route('profiles_edit', $id)
        ->with('success', 'Profile updated');
}
```

---

## Order Management

### View All Orders

**Route:** `GET /admin/orders`

```php
// AdminController@orders
public function orders(Request $request)
{
    $query = Orders::with(['chef', 'customer', 'menu'])
        ->orderBy('created_at', 'desc');

    // Filter by status
    if ($request->status) {
        $query->where('status', $request->status);
    }

    // Filter by date range
    if ($request->start_date && $request->end_date) {
        $query->whereBetween('created_at', [
            $request->start_date,
            $request->end_date
        ]);
    }

    $orders = $query->paginate(50);

    return view('admin.orders', compact('orders'));
}
```

### Cancel Order (Admin)

**API:** `POST /adminapi/orders/{id}/cancel`

```php
// AdminapiController@adminCancelOrder
public function adminCancelOrder(Request $request, $id)
{
    $order = Orders::find($id);

    // Process refund if paid
    if ($order->payment_token) {
        $this->processRefund($order);
    }

    $order->update([
        'status' => 4,
        'cancelled_by_role' => 'admin',
        'cancellation_reason' => $request->reason ?? 'Cancelled by admin',
        'cancelled_at' => now(),
    ]);

    return response()->json(['success' => true]);
}
```

---

## Discount Codes

### List Codes

**Route:** `GET /admin/discount-codes`

```php
// AdminController@discountCodes
public function discountCodes()
{
    $codes = DiscountCodes::withCount('usages')
        ->orderBy('created_at', 'desc')
        ->paginate(50);

    return view('admin.discount_codes', compact('codes'));
}
```

### Create Code

**Route:** `POST /admin/discount-codes`

```php
// AdminController@createDiscountCode
public function createDiscountCode(Request $request)
{
    $validated = $request->validate([
        'code' => 'required|unique:tbl_discount_codes,code',
        'discount_type' => 'required|in:fixed,percentage',
        'discount_value' => 'required|numeric|min:0',
        'max_uses' => 'nullable|integer|min:1',
        'max_uses_per_customer' => 'integer|min:1',
        'valid_from' => 'nullable|date',
        'valid_until' => 'nullable|date|after:valid_from',
        'minimum_order_amount' => 'nullable|numeric|min:0',
        'maximum_discount_amount' => 'nullable|numeric|min:0',
    ]);

    DiscountCodes::create([
        ...$validated,
        'code' => strtoupper($validated['code']),
        'is_active' => true,
        'created_by_admin_id' => Auth::guard('admin')->id(),
    ]);

    return redirect()->route('discount_codes')
        ->with('success', 'Code created');
}
```

### Activate/Deactivate

```php
// Deactivate
Route::post('discount-codes/{id}/deactivate', function($id) {
    DiscountCodes::find($id)->update(['is_active' => false]);
    return back()->with('success', 'Code deactivated');
});

// Activate
Route::post('discount-codes/{id}/activate', function($id) {
    DiscountCodes::find($id)->update(['is_active' => true]);
    return back()->with('success', 'Code activated');
});
```

### View Usage

**Route:** `GET /admin/discount-codes/{id}/usage`

```php
// AdminController@viewDiscountCodeUsage
public function viewDiscountCodeUsage($id)
{
    $code = DiscountCodes::with(['usages.customer', 'usages.order'])->find($id);

    $stats = [
        'total_uses' => $code->current_uses,
        'total_discount_given' => $code->orders->sum('discount_amount'),
        'unique_customers' => $code->usages->unique('customer_user_id')->count(),
    ];

    return view('admin.discount_code_usage', compact('code', 'stats'));
}
```

---

## Data Exports

### Export Chefs

**Route:** `GET /admin/export_chefs`

```php
// AdminController@exportChefs
public function exportChefs()
{
    $chefs = Listener::where('user_type', 2)
        ->where('is_pending', 0)
        ->get();

    $filename = 'chefs_' . date('Y-m-d') . '.csv';

    $headers = [
        'Content-Type' => 'text/csv',
        'Content-Disposition' => "attachment; filename=\"$filename\"",
    ];

    $callback = function() use ($chefs) {
        $file = fopen('php://output', 'w');

        // Header row
        fputcsv($file, ['ID', 'Name', 'Email', 'Phone', 'City', 'State', 'Created']);

        // Data rows
        foreach ($chefs as $chef) {
            fputcsv($file, [
                $chef->id,
                $chef->first_name . ' ' . $chef->last_name,
                $chef->email,
                $chef->phone,
                $chef->city,
                $chef->state,
                $chef->created_at,
            ]);
        }

        fclose($file);
    };

    return response()->stream($callback, 200, $headers);
}
```

### Export Customers

**Route:** `GET /admin/export_customers`

### Export Pending Applications

**Route:** `GET /admin/export_pendings`

---

## Category Management

### View Categories

**Route:** `GET /admin/categories`

### Toggle Category Status

**API:** `GET /adminapi/change_category_status`

```php
// AdminapiController@changeCategoryStatus
public function changeCategoryStatus(Request $request)
{
    $category = Categories::find($request->category_id);
    $category->status = $category->status == 1 ? 2 : 1;
    $category->save();

    return response()->json(['success' => true]);
}
```

---

## Zipcode Management

### View/Edit Service Areas

**Route:** `GET /admin/zipcodes`

```php
// AdminController@zipcodes
public function zipcodes()
{
    $zipcodes = Zipcodes::orderBy('zipcode')->get();
    return view('admin.zipcodes', compact('zipcodes'));
}

// AdminController@updateZipcodes
public function updateZipcodes(Request $request)
{
    foreach ($request->zipcodes as $id => $data) {
        Zipcodes::find($id)->update([
            'delivery_fee' => $data['delivery_fee'],
            'tax_rate' => $data['tax_rate'],
            'is_active' => $data['is_active'] ?? 0,
        ]);
    }

    return back()->with('success', 'Zipcodes updated');
}
```

---

## Support Tickets

### View Tickets

**Route:** `GET /admin/contacts`

```php
// AdminController@contacts
public function contacts()
{
    $tickets = Tickets::with('user')
        ->orderBy('created_at', 'desc')
        ->paginate(50);

    return view('admin.contacts', compact('tickets'));
}
```

### Update Ticket Status

**API:** `GET /adminapi/change_ticket_status`

```php
// AdminapiController@changeTicketStatus
public function changeTicketStatus(Request $request)
{
    $ticket = Tickets::find($request->ticket_id);
    $ticket->status = $request->status;
    $ticket->save();

    return response()->json(['success' => true]);
}
```
