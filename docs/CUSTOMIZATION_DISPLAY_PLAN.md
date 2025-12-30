# Order Customization Display - Fix Plan

## Problem Statement

Order customizations (add-ons) are not displaying consistently across the app. The chef order detail screen shows "Special: Spicy please!" for special instructions but does NOT show paid add-on customizations (like "Extra Cheese +$2.50").

## Current State Analysis

### Data Model

**Order fields:**
- `addons`: Comma-separated customization IDs (e.g., "1,3,5")
- `notes`: Free-form special instructions text (e.g., "Spicy please!")

**Menu field:**
- `customizations`: Array of `MenuCustomizationInterface` objects with `id`, `name`, `upcharge_price`

### Current Display by Screen

| Screen | File | Customizations | Special Instructions |
|--------|------|----------------|---------------------|
| Chef Order Detail | `chef/orderDetail/index.tsx` | Separate lines with `+ ` prefix | `Special: {notes}` |
| Customer Order Detail | `customer/orderDetail/index.tsx` | Separate lines (NO prefix) | `Special: {notes}` |
| Checkout Summary | `checkout/components/orderItem.tsx` | Inline `Add-ons: X & Y` | `Special Instructions: {notes}` |
| Cart | `cart/index.tsx` | Inline `Add-ons: X & Y` | `Note: {notes}` |

### Root Cause

The customization parsing code exists but may fail if:
1. `menu.customizations` array is not loaded from API
2. `orderInfo.addons` is empty/null
3. Customization IDs don't match between order and menu

## Proposed Solution

### Goal
Standardize customization display across ALL order-related screens using a consistent format.

### Recommended Format

**Customizations (paid add-ons):**
- Show as separate indented line items with `+ ` prefix
- Include price when relevant
- Example: `  + Extra Cheese` or `  + Extra Cheese ($2.50)`

**Special Instructions (notes):**
- Show with consistent label: `Special Instructions: {text}`
- Keep as single line below items

### Implementation Steps

#### Step 1: Verify Backend API Returns Customizations

Check that `GetOrderDataAPI` response includes `menu.customizations` array.

**File:** `backend/app/Http/Controllers/` (order controller)

If not included, update the API to eager-load menu customizations when returning order data.

#### Step 2: Fix Chef Order Detail Screen

**File:** `frontend/app/screens/chef/orderDetail/index.tsx`

Current code (lines 220-243) should work IF `menu.customizations` is populated.

Tasks:
- Add debug logging to verify `menu.customizations` is loaded
- Ensure customizations display with `+ ` prefix (already implemented)
- Change notes label from `Special:` to `Special Instructions:`

#### Step 3: Fix Customer Order Detail Screen

**File:** `frontend/app/screens/customer/orderDetail/index.tsx`

Current issues:
- Missing `isCustomization` flag in items array
- No `+ ` prefix for customizations

Changes needed:
```typescript
// Line 256-260: Add isCustomization flag
items.push({
  name: customize.name,
  qty: 1,
  price: customize.upcharge_price ?? 0,
  isCustomization: true,  // ADD THIS
});

// Line 351-353: Add prefix to display
<Text style={styles.text} key={`name_${idx}`}>
  {item.isCustomization ? '  + ' : ''}{item.name}  // ADD PREFIX
</Text>
```

Also update notes label from `Special:` to `Special Instructions:`.

#### Step 4: Update Checkout OrderItem Component

**File:** `frontend/app/screens/customer/checkout/components/orderItem.tsx`

Option A (Recommended): Keep inline format for compact display
- Change label from `Add-ons:` to match style
- Already shows `Special Instructions:` correctly

Option B: Switch to line-item format
- More consistent with order detail screens
- Takes more vertical space

#### Step 5: Update Cart Screen

**File:** `frontend/app/screens/customer/cart/index.tsx`

Changes:
- Update notes label from `Note:` to `Special Instructions:`
- Keep inline add-ons format for compact cart display

### Files to Modify

1. **`frontend/app/screens/chef/orderDetail/index.tsx`**
   - Line 423: Change `Special:` to `Special Instructions:`
   - Add debug logging if customizations not showing

2. **`frontend/app/screens/customer/orderDetail/index.tsx`**
   - Lines 256-260: Add `isCustomization: true` to pushed items
   - Lines 351-353: Add `{item.isCustomization ? '  + ' : ''}` prefix
   - Lines 382-383: Change `Special:` to `Special Instructions:`

3. **`frontend/app/screens/customer/cart/index.tsx`**
   - Line 173: Change `Note:` to `Special Instructions:`

4. **Backend (if needed):** Ensure order API includes `menu.customizations`

### Testing Checklist

- [ ] Create order with add-on customizations selected
- [ ] Create order with special instructions entered
- [ ] Create order with BOTH customizations and special instructions
- [ ] Verify chef order detail shows customizations with `+ ` prefix
- [ ] Verify customer order detail shows customizations with `+ ` prefix
- [ ] Verify checkout summary shows customizations
- [ ] Verify cart shows customizations
- [ ] Verify all screens show special instructions consistently

### Final Expected Display

**Chef/Customer Order Detail:**
```
Item                    Qty    Price
Macaroni Cheese          2    $52.00
  + Extra Cheese         1     $3.00
  + Spicy Sauce          1     $1.50

Special Instructions: Spicy please! No onions.

Order Total                   $56.50
```

**Cart/Checkout (compact):**
```
Macaroni Cheese
Add-ons: Extra Cheese & Spicy Sauce
Special Instructions: Spicy please! No onions.
                              2    $56.50
```
