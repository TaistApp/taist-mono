# TMA-007: Discount Codes Implementation Plan

**Status**: 📋 Planning Phase  
**Priority**: Standard discount codes with **primary focus on $ off** (e.g., $3 off)  
**Secondary**: Percentage off (only if easy to implement)  
**Date**: December 2, 2025

---

## 🎯 Overview

Implement a discount code system that allows customers to apply promotional codes at checkout. Admin panel functionality to create, manage, and cancel discount codes. Primary requirement is fixed dollar amount discounts (e.g., $3 off), with percentage discounts as a nice-to-have if straightforward.

---

## 📋 Requirements Summary

### Must Have (Priority 1)
1. ✅ **Fixed Dollar Amount Discounts** - $3 off, $5 off, $10 off, etc.
2. ✅ **Customer Application** - Apply discount code at checkout
3. ✅ **Admin Management Panel** - Create, view, edit, cancel/deactivate codes
4. ✅ **Code Validation** - Check validity, expiration, usage limits
5. ✅ **Order Integration** - Store discount info with orders
6. ✅ **Price Calculation** - Adjust total_price correctly

### Nice to Have (Priority 2 - Only if Easy)
1. ⚡ **Percentage Discounts** - 10% off, 20% off (if simple to add)
2. ⚡ **Usage Analytics** - Track how many times code was used

### Out of Scope
- Complex promotional rules (buy X get Y, tiered discounts)
- Customer-specific codes (can be added later)
- Automatic code suggestions
- Referral codes (separate feature)

---

## 🗄️ Database Schema

### New Table: `tbl_discount_codes`

```sql
CREATE TABLE `tbl_discount_codes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Discount code (e.g., WELCOME10, SAVE5)',
  `description` VARCHAR(255) DEFAULT NULL COMMENT 'Admin note about this code',
  
  -- Discount Configuration
  `discount_type` ENUM('fixed', 'percentage') NOT NULL DEFAULT 'fixed' COMMENT 'Type of discount',
  `discount_value` DECIMAL(10,2) NOT NULL COMMENT 'Dollar amount or percentage value',
  
  -- Usage Limits
  `max_uses` INT DEFAULT NULL COMMENT 'Maximum total uses (NULL = unlimited)',
  `max_uses_per_customer` INT DEFAULT 1 COMMENT 'Max uses per customer (default 1)',
  `current_uses` INT NOT NULL DEFAULT 0 COMMENT 'Current number of times used',
  
  -- Validity Period
  `valid_from` TIMESTAMP NULL DEFAULT NULL COMMENT 'When code becomes active (NULL = immediately)',
  `valid_until` TIMESTAMP NULL DEFAULT NULL COMMENT 'When code expires (NULL = never)',
  
  -- Constraints (Optional - for future)
  `minimum_order_amount` DECIMAL(10,2) DEFAULT NULL COMMENT 'Minimum order total required',
  `maximum_discount_amount` DECIMAL(10,2) DEFAULT NULL COMMENT 'Cap for percentage discounts',
  
  -- Status
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Active, 0 = Cancelled/Disabled',
  
  -- Metadata
  `created_by_admin_id` INT DEFAULT NULL COMMENT 'Admin who created this code',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_code` (`code`),
  KEY `idx_active_valid` (`is_active`, `valid_from`, `valid_until`),
  KEY `idx_created_by` (`created_by_admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### New Table: `tbl_discount_code_usage`

Track individual uses of discount codes for analytics and usage limits.

```sql
CREATE TABLE `tbl_discount_code_usage` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `discount_code_id` INT NOT NULL COMMENT 'FK to tbl_discount_codes',
  `order_id` INT NOT NULL COMMENT 'FK to tbl_orders',
  `customer_user_id` INT NOT NULL COMMENT 'FK to tbl_users',
  `discount_amount` DECIMAL(10,2) NOT NULL COMMENT 'Actual discount applied',
  `order_total_before_discount` DECIMAL(10,2) NOT NULL COMMENT 'Original order total',
  `order_total_after_discount` DECIMAL(10,2) NOT NULL COMMENT 'Final order total',
  `used_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `idx_discount_code` (`discount_code_id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_customer` (`customer_user_id`),
  FOREIGN KEY (`discount_code_id`) REFERENCES `tbl_discount_codes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`order_id`) REFERENCES `tbl_orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`customer_user_id`) REFERENCES `tbl_users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Modify Existing Table: `tbl_orders`

Add discount tracking fields to orders table.

```sql
ALTER TABLE `tbl_orders`
  ADD COLUMN `discount_code_id` INT DEFAULT NULL COMMENT 'FK to tbl_discount_codes' AFTER `total_price`,
  ADD COLUMN `discount_code` VARCHAR(50) DEFAULT NULL COMMENT 'Code used (denormalized for history)' AFTER `discount_code_id`,
  ADD COLUMN `discount_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Discount applied to this order' AFTER `discount_code`,
  ADD COLUMN `subtotal_before_discount` DECIMAL(10,2) DEFAULT NULL COMMENT 'Original price before discount' AFTER `discount_amount`,
  ADD KEY `idx_discount_code` (`discount_code_id`);
```

**Rationale for denormalization:**
- Store `discount_code` as text in orders for historical record (even if code is deleted later)
- Store `discount_amount` for accurate financial records
- Store `subtotal_before_discount` to show customer savings

---

## 🏗️ Backend Implementation

### 1. Create Eloquent Model

**File**: `/backend/app/Models/DiscountCodes.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiscountCodes extends Model
{
    protected $table = 'tbl_discount_codes';
    
    protected $fillable = [
        'code',
        'description',
        'discount_type',
        'discount_value',
        'max_uses',
        'max_uses_per_customer',
        'current_uses',
        'valid_from',
        'valid_until',
        'minimum_order_amount',
        'maximum_discount_amount',
        'is_active',
        'created_by_admin_id',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'minimum_order_amount' => 'decimal:2',
        'maximum_discount_amount' => 'decimal:2',
        'is_active' => 'boolean',
        'valid_from' => 'datetime',
        'valid_until' => 'datetime',
    ];

    /**
     * Relationship to usage records
     */
    public function usages()
    {
        return $this->hasMany(DiscountCodeUsage::class, 'discount_code_id');
    }

    /**
     * Relationship to admin who created it
     */
    public function createdBy()
    {
        return $this->belongsTo(Admins::class, 'created_by_admin_id');
    }

    /**
     * Check if code is currently valid
     */
    public function isValid()
    {
        if (!$this->is_active) {
            return ['valid' => false, 'reason' => 'Code is no longer active'];
        }

        $now = now();

        if ($this->valid_from && $now->lt($this->valid_from)) {
            return ['valid' => false, 'reason' => 'Code is not yet active'];
        }

        if ($this->valid_until && $now->gt($this->valid_until)) {
            return ['valid' => false, 'reason' => 'Code has expired'];
        }

        if ($this->max_uses && $this->current_uses >= $this->max_uses) {
            return ['valid' => false, 'reason' => 'Code has reached maximum uses'];
        }

        return ['valid' => true];
    }

    /**
     * Check if customer can use this code
     */
    public function canCustomerUse($customerId)
    {
        $customerUses = $this->usages()
            ->where('customer_user_id', $customerId)
            ->count();

        if ($customerUses >= $this->max_uses_per_customer) {
            return ['valid' => false, 'reason' => 'You have already used this code'];
        }

        return ['valid' => true];
    }

    /**
     * Calculate discount for given order amount
     */
    public function calculateDiscount($orderAmount)
    {
        // Check minimum order requirement
        if ($this->minimum_order_amount && $orderAmount < $this->minimum_order_amount) {
            return [
                'valid' => false, 
                'reason' => "Minimum order of $" . number_format($this->minimum_order_amount, 2) . " required"
            ];
        }

        $discountAmount = 0;

        if ($this->discount_type === 'fixed') {
            $discountAmount = $this->discount_value;
            
            // Don't allow discount to exceed order amount
            if ($discountAmount > $orderAmount) {
                $discountAmount = $orderAmount;
            }
        } 
        else if ($this->discount_type === 'percentage') {
            $discountAmount = ($orderAmount * $this->discount_value) / 100;
            
            // Apply maximum discount cap if set
            if ($this->maximum_discount_amount && $discountAmount > $this->maximum_discount_amount) {
                $discountAmount = $this->maximum_discount_amount;
            }
        }

        return [
            'valid' => true,
            'discount_amount' => round($discountAmount, 2),
            'final_amount' => round($orderAmount - $discountAmount, 2)
        ];
    }

    /**
     * Increment usage counter
     */
    public function incrementUsage()
    {
        $this->increment('current_uses');
    }
}
```

**File**: `/backend/app/Models/DiscountCodeUsage.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiscountCodeUsage extends Model
{
    protected $table = 'tbl_discount_code_usage';
    
    public $timestamps = false; // Using custom used_at field
    
    protected $fillable = [
        'discount_code_id',
        'order_id',
        'customer_user_id',
        'discount_amount',
        'order_total_before_discount',
        'order_total_after_discount',
    ];

    protected $casts = [
        'discount_amount' => 'decimal:2',
        'order_total_before_discount' => 'decimal:2',
        'order_total_after_discount' => 'decimal:2',
        'used_at' => 'datetime',
    ];

    public function discountCode()
    {
        return $this->belongsTo(DiscountCodes::class, 'discount_code_id');
    }

    public function order()
    {
        return $this->belongsTo(Orders::class, 'order_id');
    }

    public function customer()
    {
        return $this->belongsTo(Listener::class, 'customer_user_id');
    }
}
```

### 2. Update Orders Model

**File**: `/backend/app/Models/Orders.php` (add to existing fillable array)

```php
protected $fillable = [
    // ... existing fields ...
    'discount_code_id',
    'discount_code',
    'discount_amount',
    'subtotal_before_discount',
];

/**
 * Relationship to discount code
 */
public function discountCode()
{
    return $this->belongsTo(DiscountCodes::class, 'discount_code_id');
}
```

---

## 🔌 API Endpoints

### Mobile API (Customer-facing)

#### 1. Validate Discount Code

**Endpoint**: `POST /mapi/discount-codes/validate`  
**Purpose**: Check if code is valid and calculate discount  
**Auth**: Required (customer)

**Request Body**:
```json
{
  "code": "SAVE5",
  "order_amount": 25.00
}
```

**Response (Success)**:
```json
{
  "success": 1,
  "data": {
    "code": "SAVE5",
    "discount_type": "fixed",
    "discount_amount": 5.00,
    "final_amount": 20.00,
    "description": "$5 off your order"
  }
}
```

**Response (Invalid)**:
```json
{
  "success": 0,
  "error": "Code has expired"
}
```

#### 2. Apply Discount to Order

This happens during order creation - integrate into existing `createOrder` endpoint.

**Modified Endpoint**: `POST /mapi/createOrder`  
**Additional Parameters**:
```json
{
  // ... existing order fields ...
  "discount_code": "SAVE5" // Optional
}
```

**Logic**:
1. If `discount_code` provided, validate it
2. Calculate discount amount
3. Update `total_price` to reflect discount
4. Store discount info in order
5. Create usage record
6. Increment code usage counter

---

### Admin API

#### 1. List All Discount Codes

**Endpoint**: `GET /admin/discount-codes`  
**Purpose**: View all discount codes in admin panel  
**Auth**: Admin only

**Response**:
```json
{
  "success": 1,
  "data": [
    {
      "id": 1,
      "code": "WELCOME10",
      "description": "New customer welcome offer",
      "discount_type": "fixed",
      "discount_value": 10.00,
      "current_uses": 45,
      "max_uses": 100,
      "is_active": true,
      "valid_until": "2025-12-31T23:59:59Z",
      "created_at": "2025-12-01T10:00:00Z"
    }
  ]
}
```

#### 2. Create Discount Code

**Endpoint**: `POST /admin/discount-codes`  
**Purpose**: Create new discount code  
**Auth**: Admin only

**Request Body**:
```json
{
  "code": "SAVE5",
  "description": "$5 off any order",
  "discount_type": "fixed",
  "discount_value": 5.00,
  "max_uses": 500,
  "max_uses_per_customer": 1,
  "valid_from": "2025-12-01T00:00:00Z",
  "valid_until": "2025-12-31T23:59:59Z",
  "minimum_order_amount": 15.00
}
```

#### 3. Update Discount Code

**Endpoint**: `PUT /admin/discount-codes/{id}`  
**Purpose**: Edit existing code  
**Auth**: Admin only

#### 4. Deactivate/Cancel Discount Code

**Endpoint**: `POST /admin/discount-codes/{id}/deactivate`  
**Purpose**: Cancel a code (set is_active = 0)  
**Auth**: Admin only

#### 5. View Code Usage Stats

**Endpoint**: `GET /admin/discount-codes/{id}/usage`  
**Purpose**: See who used the code and when  
**Auth**: Admin only

---

## 🎨 Frontend Implementation

### Mobile App (React Native)

#### 1. Checkout Screen Modifications

**File**: `/frontend/app/screens/customer/checkout/index.tsx`

**New State Variables**:
```typescript
const [discountCode, setDiscountCode] = useState<string>('');
const [appliedDiscount, setAppliedDiscount] = useState<{
  code: string;
  discount_amount: number;
  final_amount: number;
} | null>(null);
const [discountError, setDiscountError] = useState<string>('');
const [isValidatingCode, setIsValidatingCode] = useState(false);
```

**New UI Components**:
1. **Discount Code Input Section** (above payment method)
   - Text input for code
   - "Apply" button
   - Loading indicator during validation
   - Success message showing discount amount
   - Error message if invalid

2. **Price Breakdown Update**
   - Show "Subtotal: $XX.XX"
   - Show "Discount (CODE): -$X.XX" (if applied)
   - Show "Total: $XX.XX" (bold)

**New Functions**:
```typescript
const handleApplyDiscount = async () => {
  if (!discountCode.trim()) {
    setDiscountError('Please enter a discount code');
    return;
  }

  setIsValidatingCode(true);
  setDiscountError('');

  try {
    const response = await ValidateDiscountCodeAPI({
      code: discountCode.toUpperCase(),
      order_amount: calculateOrderTotal()
    });

    if (response.success === 1) {
      setAppliedDiscount(response.data);
      ShowSuccessToast(`${response.data.code} applied! You saved $${response.data.discount_amount}`);
    } else {
      setDiscountError(response.error || 'Invalid code');
      setAppliedDiscount(null);
    }
  } catch (error) {
    setDiscountError('Failed to validate code');
    setAppliedDiscount(null);
  } finally {
    setIsValidatingCode(false);
  }
};

const handleRemoveDiscount = () => {
  setDiscountCode('');
  setAppliedDiscount(null);
  setDiscountError('');
};

const calculateFinalTotal = () => {
  const subtotal = calculateOrderTotal();
  if (appliedDiscount) {
    return appliedDiscount.final_amount;
  }
  return subtotal;
};
```

**Update Order Creation**:
```typescript
const handleCheckoutProcess = async (day: Moment) => {
  // ... existing code ...
  
  const newOrder: IOrder = {
    ...o, 
    order_date: order_datetime,
    discount_code: appliedDiscount?.code || null, // Add discount code
    subtotal_before_discount: appliedDiscount ? calculateOrderTotal() : null,
    total_price: calculateFinalTotal() // Use discounted total
  };
  
  // ... rest of order creation ...
};
```

#### 2. New API Service

**File**: `/frontend/app/services/api.ts` (add new function)

```typescript
export const ValidateDiscountCodeAPI = async (data: {
  code: string;
  order_amount: number;
}) => {
  try {
    const response = await axios.post(
      `${API_URL}/mapi/discount-codes/validate`,
      data,
      {
        headers: {
          apiKey: API_KEY,
          Authorization: `Bearer ${getAuthToken()}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('ValidateDiscountCodeAPI error:', error);
    return {
      success: 0,
      error: error.response?.data?.error || 'Failed to validate code',
    };
  }
};
```

#### 3. UI Component: Discount Code Input

**File**: `/frontend/app/screens/customer/checkout/components/discountCodeInput.tsx`

```tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTag, faTimes, faCheck } from '@fortawesome/free-solid-svg-icons';
import { styles } from './styles';

interface DiscountCodeInputProps {
  code: string;
  onCodeChange: (code: string) => void;
  onApply: () => void;
  onRemove: () => void;
  appliedDiscount: {
    code: string;
    discount_amount: number;
  } | null;
  error: string;
  isLoading: boolean;
}

const DiscountCodeInput: React.FC<DiscountCodeInputProps> = ({
  code,
  onCodeChange,
  onApply,
  onRemove,
  appliedDiscount,
  error,
  isLoading
}) => {
  return (
    <View style={styles.discountSection}>
      <Text style={styles.sectionTitle}>Discount Code</Text>
      
      {!appliedDiscount ? (
        <View style={styles.discountInputContainer}>
          <View style={styles.inputWrapper}>
            <FontAwesomeIcon icon={faTag} size={16} color="#666" />
            <TextInput
              style={styles.discountInput}
              placeholder="Enter code"
              value={code}
              onChangeText={onCodeChange}
              autoCapitalize="characters"
              editable={!isLoading}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.applyButton, isLoading && styles.applyButtonDisabled]}
            onPress={onApply}
            disabled={isLoading || !code.trim()}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.applyButtonText}>Apply</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.appliedDiscountContainer}>
          <View style={styles.appliedDiscountInfo}>
            <FontAwesomeIcon icon={faCheck} size={16} color="#10B981" />
            <Text style={styles.appliedDiscountText}>
              {appliedDiscount.code} applied - Save ${appliedDiscount.discount_amount.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity onPress={onRemove}>
            <FontAwesomeIcon icon={faTimes} size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

export default DiscountCodeInput;
```

---

### Admin Panel (Laravel Blade)

#### 1. Discount Codes Management Page

**File**: `/backend/resources/views/admin/discount_codes.blade.php`

```blade
@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="{{ url('assets/admin/index.css?r='.time()) }}">
   
   <div class="admin_wrapper">
      <div class="flex flex_between mb24">
         <div class="fsize24 font_bold">Discount Codes</div>
         <button class="btn btn_primary" onclick="showCreateModal()">
            + Create New Code
         </button>
      </div>
      
      <div class="div_table">
         <table class="table" id="table">
            <thead>
               <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Uses</th>
                  <th>Valid Until</th>
                  <th>Status</th>
                  <th>Actions</th>
               </tr>
            </thead>
            <tbody>
               @foreach ($codes as $code)
                  <tr id="code-{{ $code->id }}">
                     <td>
                        <strong>{{ $code->code }}</strong>
                        @if($code->description)
                           <br><small class="text_muted">{{ $code->description }}</small>
                        @endif
                     </td>
                     <td>
                        @if($code->discount_type == 'fixed')
                           <span class="badge badge_blue">Fixed Amount</span>
                        @else
                           <span class="badge badge_purple">Percentage</span>
                        @endif
                     </td>
                     <td>
                        @if($code->discount_type == 'fixed')
                           ${{ number_format($code->discount_value, 2) }}
                        @else
                           {{ $code->discount_value }}%
                        @endif
                     </td>
                     <td>
                        {{ $code->current_uses }}
                        @if($code->max_uses)
                           / {{ $code->max_uses }}
                        @else
                           / ∞
                        @endif
                     </td>
                     <td>
                        @if($code->valid_until)
                           {{ date('M d, Y', strtotime($code->valid_until)) }}
                        @else
                           <span class="text_muted">Never</span>
                        @endif
                     </td>
                     <td>
                        @if($code->is_active)
                           <span class="badge badge_green">Active</span>
                        @else
                           <span class="badge badge_red">Inactive</span>
                        @endif
                     </td>
                     <td>
                        <button class="btn btn_sm btn_secondary" onclick="viewUsage({{ $code->id }})">
                           View Usage
                        </button>
                        <button class="btn btn_sm btn_secondary" onclick="editCode({{ $code->id }})">
                           Edit
                        </button>
                        @if($code->is_active)
                           <button class="btn btn_sm btn_danger" onclick="deactivateCode({{ $code->id }})">
                              Deactivate
                           </button>
                        @else
                           <button class="btn btn_sm btn_success" onclick="activateCode({{ $code->id }})">
                              Activate
                           </button>
                        @endif
                     </td>
                  </tr>
               @endforeach
            </tbody>
         </table>
      </div>
   </div>

   <!-- Create/Edit Modal -->
   <div id="codeModal" class="modal" style="display: none;">
      <!-- Modal content for creating/editing codes -->
   </div>

@endsection
@section('page-scripts')
   <script src="{{ url('assets/admin/discount_codes.js?r='.time()) }}"></script>
@endsection
```

#### 2. Admin Controller Methods

**File**: `/backend/app/Http/Controllers/Admin/AdminController.php` (add methods)

```php
public function discountCodes(Request $request) {
    $data['title'] = "Taist - Discount Codes";
    $user = $this->guard()->user();
    $data['user'] = $user;
    $data['codes'] = app(DiscountCodes::class)->orderBy('created_at', 'desc')->get();

    return view("admin.discount_codes", $data);
}

public function createDiscountCode(Request $request) {
    $request->validate([
        'code' => 'required|string|max:50|unique:tbl_discount_codes,code',
        'discount_type' => 'required|in:fixed,percentage',
        'discount_value' => 'required|numeric|min:0',
    ]);

    $code = app(DiscountCodes::class)->create([
        'code' => strtoupper($request->code),
        'description' => $request->description,
        'discount_type' => $request->discount_type,
        'discount_value' => $request->discount_value,
        'max_uses' => $request->max_uses,
        'max_uses_per_customer' => $request->max_uses_per_customer ?? 1,
        'valid_from' => $request->valid_from,
        'valid_until' => $request->valid_until,
        'minimum_order_amount' => $request->minimum_order_amount,
        'maximum_discount_amount' => $request->maximum_discount_amount,
        'is_active' => 1,
        'created_by_admin_id' => $this->guard()->user()->id,
    ]);

    return response()->json(['success' => 1, 'data' => $code]);
}

public function updateDiscountCode(Request $request, $id) {
    $code = app(DiscountCodes::class)->findOrFail($id);
    
    $code->update($request->only([
        'description',
        'max_uses',
        'max_uses_per_customer',
        'valid_from',
        'valid_until',
        'minimum_order_amount',
        'maximum_discount_amount',
    ]));

    return response()->json(['success' => 1, 'data' => $code]);
}

public function deactivateDiscountCode(Request $request, $id) {
    $code = app(DiscountCodes::class)->findOrFail($id);
    $code->update(['is_active' => 0]);

    return response()->json(['success' => 1, 'message' => 'Code deactivated']);
}

public function activateDiscountCode(Request $request, $id) {
    $code = app(DiscountCodes::class)->findOrFail($id);
    $code->update(['is_active' => 1]);

    return response()->json(['success' => 1, 'message' => 'Code activated']);
}

public function viewDiscountCodeUsage(Request $request, $id) {
    $code = app(DiscountCodes::class)->findOrFail($id);
    $usages = app(DiscountCodeUsage::class)
        ->where('discount_code_id', $id)
        ->with(['customer', 'order'])
        ->orderBy('used_at', 'desc')
        ->get();

    return response()->json(['success' => 1, 'data' => $usages]);
}
```

#### 3. Admin Routes

**File**: `/backend/routes/admin.php` (add routes)

```php
Route::group(['middleware' => ['auth:admin']], function () {
    // ... existing routes ...
    
    Route::get('discount-codes', 'AdminController@discountCodes')->name('discount_codes');
    Route::post('discount-codes', 'AdminController@createDiscountCode')->name('discount_codes_create');
    Route::put('discount-codes/{id}', 'AdminController@updateDiscountCode')->name('discount_codes_update');
    Route::post('discount-codes/{id}/deactivate', 'AdminController@deactivateDiscountCode')->name('discount_codes_deactivate');
    Route::post('discount-codes/{id}/activate', 'AdminController@activateDiscountCode')->name('discount_codes_activate');
    Route::get('discount-codes/{id}/usage', 'AdminController@viewDiscountCodeUsage')->name('discount_codes_usage');
});
```

---

## 🔄 Integration with Existing Order Flow

### Modified Order Creation Process

**File**: `/backend/app/Http/Controllers/MapiController.php` - `createOrder()` method

**Current Flow**:
1. Validate chef payment method
2. Create order record
3. Create payment intent
4. Return success

**New Flow with Discount Codes**:
1. Validate chef payment method
2. **[NEW] If discount_code provided, validate and calculate discount**
3. **[NEW] Update total_price to reflect discount**
4. Create order record **[with discount fields]**
5. **[NEW] Create discount usage record**
6. **[NEW] Increment code usage counter**
7. Create payment intent **[with discounted amount]**
8. Return success

**Implementation**:

```php
public function createOrder(Request $request)
{
    if ($this->_checktaistApiKey($request->header('apiKey')) === false)
        return response()->json(['success' => 0, 'error' => "Access denied. Api key is not valid."]);

    // ... existing chef payment validation ...

    // NEW: Handle discount code
    $discountCodeId = null;
    $discountCode = null;
    $discountAmount = 0;
    $subtotalBeforeDiscount = null;
    
    if ($request->has('discount_code') && !empty($request->discount_code)) {
        $code = app(DiscountCodes::class)
            ->where('code', strtoupper($request->discount_code))
            ->first();
        
        if (!$code) {
            return response()->json(['success' => 0, 'error' => 'Invalid discount code']);
        }
        
        // Validate code
        $validationResult = $code->isValid();
        if (!$validationResult['valid']) {
            return response()->json(['success' => 0, 'error' => $validationResult['reason']]);
        }
        
        // Check customer usage
        $customerCheck = $code->canCustomerUse($request->customer_user_id);
        if (!$customerCheck['valid']) {
            return response()->json(['success' => 0, 'error' => $customerCheck['reason']]);
        }
        
        // Calculate discount
        $discountResult = $code->calculateDiscount($request->total_price);
        if (!$discountResult['valid']) {
            return response()->json(['success' => 0, 'error' => $discountResult['reason']]);
        }
        
        $discountCodeId = $code->id;
        $discountCode = $code->code;
        $discountAmount = $discountResult['discount_amount'];
        $subtotalBeforeDiscount = $request->total_price;
        
        // Update total price
        $request->merge(['total_price' => $discountResult['final_amount']]);
    }

    // Create order with discount fields
    $ary = [
        'chef_user_id' => $request->chef_user_id,
        'menu_id' => $request->menu_id,
        'customer_user_id' => $request->customer_user_id,
        'amount' => $request->amount,
        'total_price' => $request->total_price, // Now includes discount
        'addons' => isset($request->addons) ? $request->addons : '',
        'address' => $request->address,
        'order_date' => $request->order_date,
        'status' => isset($request->status) ? $request->status : 1,
        'notes' => isset($request->notes) ? $request->notes : '',
        // NEW: Discount fields
        'discount_code_id' => $discountCodeId,
        'discount_code' => $discountCode,
        'discount_amount' => $discountAmount,
        'subtotal_before_discount' => $subtotalBeforeDiscount,
        'created_at' => time(),
        'updated_at' => now(),
    ];

    $id = app(Orders::class)->insertGetId($ary);

    // NEW: Record discount usage
    if ($discountCodeId) {
        app(DiscountCodeUsage::class)->create([
            'discount_code_id' => $discountCodeId,
            'order_id' => $id,
            'customer_user_id' => $request->customer_user_id,
            'discount_amount' => $discountAmount,
            'order_total_before_discount' => $subtotalBeforeDiscount,
            'order_total_after_discount' => $request->total_price,
        ]);
        
        // Increment usage counter
        app(DiscountCodes::class)->where('id', $discountCodeId)->increment('current_uses');
    }

    // ... rest of existing order creation logic ...
    // Payment intent will use the discounted total_price
    
    return response()->json(['success' => 1, 'data' => $data]);
}
```

---

## 📊 Display & Reporting

### Customer Order Receipt

Show discount information clearly:

```
Order #12345
------------------
2x Chicken Tacos    $20.00
Add: Extra Cheese    $2.00
------------------
Subtotal:           $22.00
Discount (SAVE5):   -$5.00
------------------
Total:              $17.00
```

### Admin Order View

Display discount info in order details:
- Discount code used
- Discount amount
- Original subtotal

### Admin Analytics (Future Enhancement)

- Total discounts given (by code, by date range)
- Most popular codes
- Revenue impact
- Customer acquisition via codes

---

## 🧪 Testing Plan

### Unit Tests

1. **DiscountCodes Model**
   - `isValid()` method with various scenarios
   - `canCustomerUse()` with usage limits
   - `calculateDiscount()` for fixed and percentage

2. **Order Creation**
   - Order with valid discount code
   - Order with invalid code
   - Order with expired code
   - Order with max usage reached

### Integration Tests

1. **Complete Checkout Flow**
   - Apply code → Validate → Create order → Verify discount applied
   - Payment intent has correct (discounted) amount

2. **Admin Management**
   - Create code → Activate → Deactivate → Delete
   - View usage stats

### Manual Testing Checklist

**Customer Side:**
- [ ] Apply valid fixed discount code ($5 off)
- [ ] Apply valid percentage discount code (10% off)
- [ ] Try expired code (should fail)
- [ ] Try code at max uses (should fail)
- [ ] Try code below minimum order amount (should fail)
- [ ] Try code already used (if max_uses_per_customer = 1)
- [ ] Remove applied code and reapply
- [ ] Complete order with discount applied
- [ ] Verify order receipt shows discount

**Admin Side:**
- [ ] Create new fixed discount code
- [ ] Create new percentage discount code
- [ ] Edit existing code
- [ ] Deactivate code
- [ ] Reactivate code
- [ ] View usage statistics
- [ ] Verify codes appear in list with correct status

**Edge Cases:**
- [ ] Discount amount > order total (should cap at order total)
- [ ] Percentage discount with max cap
- [ ] Code valid_from in future (should fail)
- [ ] Code with NULL valid_until (never expires)
- [ ] Code with NULL max_uses (unlimited)

---

## 🚀 Implementation Phases

### Phase 1: Database & Models (Day 1)
1. Create migration for `tbl_discount_codes`
2. Create migration for `tbl_discount_code_usage`
3. Alter `tbl_orders` table
4. Create `DiscountCodes` model
5. Create `DiscountCodeUsage` model
6. Update `Orders` model

**Deliverable**: Database schema ready, models functional

---

### Phase 2: Backend API (Day 2-3)
1. Implement validation endpoint (`POST /mapi/discount-codes/validate`)
2. Modify `createOrder` to handle discount codes
3. Add admin CRUD endpoints
4. Test API endpoints with Postman/Insomnia

**Deliverable**: Fully functional backend API

---

### Phase 3: Mobile App UI (Day 4-5)
1. Create `DiscountCodeInput` component
2. Modify checkout screen
3. Add API service function
4. Update price calculation logic
5. Test on iOS and Android

**Deliverable**: Customer can apply discount codes at checkout

---

### Phase 4: Admin Panel (Day 6-7)
1. Create discount codes management view
2. Add create/edit modal
3. Implement JavaScript for AJAX calls
4. Add usage statistics view
5. Test admin workflows

**Deliverable**: Admin can manage discount codes

---

### Phase 5: Testing & Polish (Day 8)
1. Run through testing checklist
2. Fix bugs
3. Add loading states and error handling
4. Update documentation
5. Deploy to staging

**Deliverable**: Feature ready for production

---

## 📝 Migration Files

### Migration 1: Create discount_codes table

**File**: `/backend/database/migrations/2025_12_02_000001_create_discount_codes_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateDiscountCodesTable extends Migration
{
    public function up()
    {
        Schema::create('tbl_discount_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('description', 255)->nullable();
            
            $table->enum('discount_type', ['fixed', 'percentage'])->default('fixed');
            $table->decimal('discount_value', 10, 2);
            
            $table->integer('max_uses')->nullable();
            $table->integer('max_uses_per_customer')->default(1);
            $table->integer('current_uses')->default(0);
            
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            
            $table->decimal('minimum_order_amount', 10, 2)->nullable();
            $table->decimal('maximum_discount_amount', 10, 2)->nullable();
            
            $table->boolean('is_active')->default(true);
            
            $table->unsignedBigInteger('created_by_admin_id')->nullable();
            $table->timestamps();
            
            $table->index(['is_active', 'valid_from', 'valid_until']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('tbl_discount_codes');
    }
}
```

### Migration 2: Create discount_code_usage table

**File**: `/backend/database/migrations/2025_12_02_000002_create_discount_code_usage_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateDiscountCodeUsageTable extends Migration
{
    public function up()
    {
        Schema::create('tbl_discount_code_usage', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('discount_code_id');
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('customer_user_id');
            $table->decimal('discount_amount', 10, 2);
            $table->decimal('order_total_before_discount', 10, 2);
            $table->decimal('order_total_after_discount', 10, 2);
            $table->timestamp('used_at')->useCurrent();
            
            $table->foreign('discount_code_id')
                ->references('id')
                ->on('tbl_discount_codes')
                ->onDelete('cascade');
            
            $table->foreign('order_id')
                ->references('id')
                ->on('tbl_orders')
                ->onDelete('cascade');
            
            $table->index('discount_code_id');
            $table->index('order_id');
            $table->index('customer_user_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('tbl_discount_code_usage');
    }
}
```

### Migration 3: Add discount fields to orders

**File**: `/backend/database/migrations/2025_12_02_000003_add_discount_fields_to_orders.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddDiscountFieldsToOrders extends Migration
{
    public function up()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('discount_code_id')->nullable()->after('total_price');
            $table->string('discount_code', 50)->nullable()->after('discount_code_id');
            $table->decimal('discount_amount', 10, 2)->default(0)->after('discount_code');
            $table->decimal('subtotal_before_discount', 10, 2)->nullable()->after('discount_amount');
            
            $table->index('discount_code_id');
        });
    }

    public function down()
    {
        Schema::table('tbl_orders', function (Blueprint $table) {
            $table->dropColumn([
                'discount_code_id',
                'discount_code',
                'discount_amount',
                'subtotal_before_discount'
            ]);
        });
    }
}
```

---

## 🎯 Success Criteria

### Functional Requirements Met
- ✅ Customers can apply discount codes at checkout
- ✅ Fixed dollar discounts work correctly
- ✅ (Optional) Percentage discounts work correctly
- ✅ Codes validate properly (expiration, usage limits, etc.)
- ✅ Admin can create new codes
- ✅ Admin can deactivate/cancel codes
- ✅ Admin can view code usage

### Technical Requirements Met
- ✅ Database schema properly designed
- ✅ API endpoints secure and validated
- ✅ Mobile app UI intuitive and responsive
- ✅ Admin panel easy to use
- ✅ No breaking changes to existing order flow
- ✅ Proper error handling and user feedback

### Business Requirements Met
- ✅ Discount correctly applied to order total
- ✅ Payment intent uses discounted amount
- ✅ Order history shows discount information
- ✅ Usage limits enforced
- ✅ Codes can be time-limited

---

## 🔒 Security Considerations

1. **Code Validation**: Always validate on backend, never trust client
2. **Usage Limits**: Enforce max uses to prevent abuse
3. **Admin Only**: Only admins can create/manage codes
4. **SQL Injection**: Use parameterized queries (Eloquent handles this)
5. **Rate Limiting**: Consider rate limiting validation endpoint to prevent brute force
6. **Case Insensitive**: Store and compare codes in uppercase for consistency

---

## 📚 Documentation Updates Needed

1. **API Documentation**: Add new endpoints to API docs
2. **User Guide**: How to use discount codes (customer-facing)
3. **Admin Guide**: How to create and manage codes
4. **Developer Docs**: Schema changes and integration points

---

## 🤔 Open Questions / Decisions Needed

1. **Code Format**: Any restrictions on code format? (alphanumeric only, max length, etc.)
   - **Recommendation**: Alphanumeric, 4-20 characters, no special chars except dash/underscore

2. **Multiple Codes**: Can customers apply multiple codes to one order?
   - **Recommendation**: No, one code per order (simpler for MVP)

3. **Refunds**: If order is refunded, should code usage be decremented?
   - **Recommendation**: No, code is considered "used" even if refunded (prevents abuse)

4. **Chef-Specific Codes**: Should codes be limited to specific chefs?
   - **Recommendation**: Not for MVP, add later if needed

5. **Percentage Discount Cap**: Should all percentage discounts have a max cap?
   - **Recommendation**: Optional cap per code, admin decides

---

## 📊 Estimated Effort

**Total Time**: 6-8 days (1 developer)

- Database & Models: 0.5 days
- Backend API: 1.5 days
- Mobile App: 2 days
- Admin Panel: 2 days
- Testing & Polish: 1 day
- Buffer: 1 day

**Complexity**: Medium  
**Risk Level**: Low (isolated feature, minimal impact on existing code)

---

## ✅ Next Steps

1. **Review this plan** with stakeholders
2. **Confirm requirements** (percentage discounts yes/no?)
3. **Approve database schema**
4. **Begin Phase 1** (Database & Models)
5. **Set up staging environment** for testing

---

## 📞 Contact

For questions or clarifications about this implementation plan, contact the development team.

**Document Version**: 1.0  
**Last Updated**: December 2, 2025  
**Status**: Awaiting Approval ⏳





