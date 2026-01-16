# Discount Code System

Documentation of promotional discount codes, validation, and usage tracking.

---

## Table of Contents

1. [Overview](#overview)
2. [Discount Types](#discount-types)
3. [Data Model](#data-model)
4. [Validation Logic](#validation-logic)
5. [API Endpoints](#api-endpoints)
6. [Admin Management](#admin-management)
7. [Frontend Integration](#frontend-integration)

---

## Overview

The discount code system allows promotional pricing through:
- Fixed amount discounts ($5 off)
- Percentage discounts (10% off)
- Usage limits (total and per-customer)
- Date-based validity windows
- Minimum order requirements

**Related Files:**
- Model: `backend/app/Models/DiscountCodes.php`
- Model: `backend/app/Models/DiscountCodeUsage.php`
- Controller: `backend/app/Http/Controllers/MapiController.php`
- Admin: `backend/app/Http/Controllers/Admin/AdminController.php`

---

## Discount Types

### Fixed Amount

Subtracts a fixed dollar amount from the order.

```
Order Total: $30.00
Discount:    -$5.00
─────────────────────
Final:       $25.00
```

### Percentage

Subtracts a percentage of the order total.

```
Order Total: $30.00
Discount (10%): -$3.00
─────────────────────
Final:       $27.00
```

With maximum cap:
```
Order Total: $100.00
Discount (20%, max $10): -$10.00
─────────────────────────────────
Final:       $90.00
```

---

## Data Model

### DiscountCodes Table

```sql
CREATE TABLE tbl_discount_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type ENUM('fixed', 'percentage') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    max_uses INT NULL,
    max_uses_per_customer INT DEFAULT 1,
    current_uses INT DEFAULT 0,
    valid_from DATETIME NULL,
    valid_until DATETIME NULL,
    minimum_order_amount DECIMAL(10,2) NULL,
    maximum_discount_amount DECIMAL(10,2) NULL,
    is_active TINYINT DEFAULT 1,
    created_by_admin_id INT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### DiscountCodeUsage Table

```sql
CREATE TABLE tbl_discount_code_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discount_code_id INT NOT NULL,
    customer_user_id INT NOT NULL,
    order_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_usage_code (discount_code_id),
    INDEX idx_usage_customer (customer_user_id)
);
```

### Field Descriptions

| Field | Description |
|-------|-------------|
| code | Unique code string (e.g., "SAVE10") |
| discount_type | 'fixed' or 'percentage' |
| discount_value | Amount ($) or percentage (%) |
| max_uses | Total uses allowed (null = unlimited) |
| max_uses_per_customer | Uses per customer (default 1) |
| current_uses | Counter of total uses |
| valid_from | Start date (null = immediate) |
| valid_until | End date (null = no expiry) |
| minimum_order_amount | Min order to qualify (null = none) |
| maximum_discount_amount | Cap for percentage discounts |
| is_active | Admin can deactivate |

---

## Validation Logic

### Model Methods

```php
// DiscountCodes.php

/**
 * Check if code is currently valid
 */
public function isValid()
{
    // Check active status
    if (!$this->is_active) {
        return ['valid' => false, 'reason' => 'This code is no longer active'];
    }

    $now = Carbon::now();

    // Check start date
    if ($this->valid_from && $now->lt($this->valid_from)) {
        return ['valid' => false, 'reason' => 'This code is not yet active'];
    }

    // Check end date
    if ($this->valid_until && $now->gt($this->valid_until)) {
        return ['valid' => false, 'reason' => 'This code has expired'];
    }

    // Check total uses
    if ($this->max_uses && $this->current_uses >= $this->max_uses) {
        return ['valid' => false, 'reason' => 'This code has reached its maximum uses'];
    }

    return ['valid' => true];
}

/**
 * Check if specific customer can use code
 */
public function canCustomerUse($customerId)
{
    $codeValidation = $this->isValid();
    if (!$codeValidation['valid']) {
        return $codeValidation;
    }

    // Check customer's usage count
    $customerUses = $this->usages()
        ->where('customer_user_id', $customerId)
        ->count();

    if ($customerUses >= $this->max_uses_per_customer) {
        return [
            'valid' => false,
            'reason' => 'You have already used this code the maximum number of times'
        ];
    }

    return ['valid' => true];
}

/**
 * Calculate discount for order amount
 */
public function calculateDiscount($orderAmount)
{
    // Check minimum order
    if ($this->minimum_order_amount && $orderAmount < $this->minimum_order_amount) {
        return [
            'valid' => false,
            'reason' => 'Minimum order of $' . number_format($this->minimum_order_amount, 2) . ' required'
        ];
    }

    $discountAmount = 0;

    if ($this->discount_type === 'fixed') {
        $discountAmount = min($this->discount_value, $orderAmount);
    }
    else if ($this->discount_type === 'percentage') {
        $discountAmount = ($orderAmount * $this->discount_value) / 100;

        // Apply cap if set
        if ($this->maximum_discount_amount && $discountAmount > $this->maximum_discount_amount) {
            $discountAmount = $this->maximum_discount_amount;
        }

        // Don't exceed order total
        $discountAmount = min($discountAmount, $orderAmount);
    }

    return [
        'valid' => true,
        'discount_amount' => round($discountAmount, 2),
        'final_amount' => round($orderAmount - $discountAmount, 2),
    ];
}
```

---

## API Endpoints

### Validate Discount Code

```
POST /discount-codes/validate
```

**Request:**
```json
{
  "code": "SAVE10",
  "order_amount": 30.00,
  "customer_user_id": 123
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "discount_amount": 3.00,
    "final_amount": 27.00,
    "discount_type": "percentage",
    "discount_value": 10,
    "description": "10% off your order"
  }
}
```

**Response (Invalid):**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "reason": "This code has expired"
  }
}
```

### Backend Implementation

```php
// MapiController@validateDiscountCode
public function validateDiscountCode(Request $request)
{
    $code = DiscountCodes::where('code', strtoupper($request->code))->first();

    if (!$code) {
        return response()->json([
            'success' => true,
            'data' => [
                'valid' => false,
                'reason' => 'Invalid discount code',
            ],
        ]);
    }

    // Check customer eligibility
    $validation = $code->canCustomerUse($request->customer_user_id);
    if (!$validation['valid']) {
        return response()->json([
            'success' => true,
            'data' => $validation,
        ]);
    }

    // Calculate discount
    $calculation = $code->calculateDiscount($request->order_amount);
    if (!$calculation['valid']) {
        return response()->json([
            'success' => true,
            'data' => $calculation,
        ]);
    }

    return response()->json([
        'success' => true,
        'data' => [
            'valid' => true,
            'discount_amount' => $calculation['discount_amount'],
            'final_amount' => $calculation['final_amount'],
            'discount_type' => $code->discount_type,
            'discount_value' => $code->discount_value,
            'description' => $code->getFormattedDiscount(),
        ],
    ]);
}
```

---

## Admin Management

### Admin Routes

```php
// backend/routes/admin.php
Route::get('discount-codes', 'AdminController@discountCodes');
Route::post('discount-codes', 'AdminController@createDiscountCode');
Route::put('discount-codes/{id}', 'AdminController@updateDiscountCode');
Route::post('discount-codes/{id}/deactivate', 'AdminController@deactivateDiscountCode');
Route::post('discount-codes/{id}/activate', 'AdminController@activateDiscountCode');
Route::get('discount-codes/{id}/usage', 'AdminController@viewDiscountCodeUsage');
```

### Create Discount Code

```php
// AdminController@createDiscountCode
public function createDiscountCode(Request $request)
{
    $validated = $request->validate([
        'code' => 'required|unique:tbl_discount_codes,code',
        'description' => 'nullable|string',
        'discount_type' => 'required|in:fixed,percentage',
        'discount_value' => 'required|numeric|min:0',
        'max_uses' => 'nullable|integer|min:1',
        'max_uses_per_customer' => 'integer|min:1',
        'valid_from' => 'nullable|date',
        'valid_until' => 'nullable|date|after:valid_from',
        'minimum_order_amount' => 'nullable|numeric|min:0',
        'maximum_discount_amount' => 'nullable|numeric|min:0',
    ]);

    $code = DiscountCodes::create([
        ...$validated,
        'code' => strtoupper($validated['code']),
        'is_active' => true,
        'created_by_admin_id' => Auth::guard('admin')->id(),
    ]);

    return redirect()->route('discount_codes')
        ->with('success', 'Discount code created');
}
```

### View Usage Statistics

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

## Frontend Integration

### Discount Code Input Component

**File:** `frontend/app/components/DiscountCodeInput.tsx`

```typescript
interface DiscountCodeInputProps {
  orderAmount: number;
  onApply: (discountData: DiscountResult) => void;
}

const DiscountCodeInput = ({ orderAmount, onApply }: DiscountCodeInputProps) => {
  const self = useAppSelector(x => x.user.user);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState<DiscountResult | null>(null);

  const handleValidate = async () => {
    if (!code.trim()) return;

    setLoading(true);
    setError('');

    const resp = await ValidateDiscountCodeAPI({
      code: code.trim().toUpperCase(),
      order_amount: orderAmount,
      customer_user_id: self.id,
    });

    setLoading(false);

    if (resp.success && resp.data.valid) {
      setApplied(resp.data);
      onApply(resp.data);
    } else {
      setError(resp.data.reason || 'Invalid code');
    }
  };

  const handleRemove = () => {
    setApplied(null);
    setCode('');
    onApply(null);
  };

  if (applied) {
    return (
      <View style={styles.appliedContainer}>
        <View style={styles.appliedInfo}>
          <Text style={styles.codeText}>{code}</Text>
          <Text style={styles.discountText}>
            -{formatCurrency(applied.discount_amount)}
          </Text>
        </View>
        <TouchableOpacity onPress={handleRemove}>
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="Enter promo code"
        autoCapitalize="characters"
        style={styles.input}
      />
      <TouchableOpacity
        onPress={handleValidate}
        disabled={loading || !code.trim()}
        style={styles.applyButton}
      >
        {loading ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text style={styles.applyText}>Apply</Text>
        )}
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};
```

### Checkout Integration

```typescript
// In checkout screen
const [discount, setDiscount] = useState<DiscountResult | null>(null);

const subtotal = calculateSubtotal(cartItems);
const discountAmount = discount?.discount_amount || 0;
const total = subtotal - discountAmount;

// Pass discount code to order creation
const handleCheckout = async () => {
  const orderData = {
    // ... other order data
    discount_code: discount?.code,
  };

  const resp = await CreateOrderAPI(orderData);
  // ...
};

return (
  <View>
    {/* Cart items */}

    <DiscountCodeInput
      orderAmount={subtotal}
      onApply={setDiscount}
    />

    {/* Price summary */}
    <View style={styles.summary}>
      <Row label="Subtotal" value={formatCurrency(subtotal)} />
      {discount && (
        <Row
          label={`Discount (${discount.code})`}
          value={`-${formatCurrency(discountAmount)}`}
          valueStyle={styles.discountValue}
        />
      )}
      <Row label="Total" value={formatCurrency(total)} bold />
    </View>
  </View>
);
```

---

## Order Discount Tracking

When an order uses a discount:

```php
// In createOrder
if ($request->discount_code) {
    $discount = DiscountCodes::where('code', $request->discount_code)->first();
    $calculation = $discount->calculateDiscount($subtotal);

    $order->discount_code_id = $discount->id;
    $order->discount_code = $request->discount_code;
    $order->discount_amount = $calculation['discount_amount'];
    $order->subtotal_before_discount = $subtotal;
    $order->total_price = $calculation['final_amount'];

    // Record usage
    DiscountCodeUsage::create([
        'discount_code_id' => $discount->id,
        'customer_user_id' => $customerId,
        'order_id' => $order->id,
    ]);

    // Increment counter
    $discount->incrementUsage();
}
```
