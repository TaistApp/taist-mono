# TMA-007 Discount Codes - Quick Start Guide

## 🚀 Getting Started

### Step 1: Run Database Migrations

```bash
cd backend
php artisan migrate
```

Expected output:
```
Migrating: 2025_12_02_100001_create_discount_codes_table
Migrated:  2025_12_02_100001_create_discount_codes_table
Migrating: 2025_12_02_100002_create_discount_code_usage_table
Migrated:  2025_12_02_100002_create_discount_code_usage_table
Migrating: 2025_12_02_100003_add_discount_fields_to_orders
Migrated:  2025_12_02_100003_add_discount_fields_to_orders
```

### Step 2: Clear Laravel Caches

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

### Step 3: Access Admin Panel

1. Navigate to: `http://your-domain/admin/discount-codes`
2. You should see an empty discount codes list
3. Click "Create New Code" button

---

## 🎯 Create Your First Discount Code

### Example 1: Simple $5 Off Code

1. Click "Create New Code"
2. Fill in:
   - **Code**: `SAVE5`
   - **Description**: `$5 off any order`
   - **Discount Type**: `Fixed Amount ($)`
   - **Discount Value**: `5.00`
   - **Max Uses**: Leave empty (unlimited)
   - **Max Uses Per Customer**: `1`
3. Click "Save Code"

### Example 2: 10% Off Code

1. Click "Create New Code"
2. Fill in:
   - **Code**: `WELCOME10`
   - **Description**: `10% off for new customers`
   - **Discount Type**: `Percentage (%)`
   - **Discount Value**: `10`
   - **Max Discount Amount**: `10.00` (caps at $10)
   - **Max Uses**: `100`
   - **Max Uses Per Customer**: `1`
   - **Minimum Order Amount**: `20.00`
3. Click "Save Code"

---

## 📱 Test in Mobile App

### Customer Flow:

1. **Add items to cart** (make sure total > $20 if testing WELCOME10)
2. **Go to checkout**
3. **Scroll to "Discount Code" section**
4. **Enter code**: `SAVE5` or `WELCOME10`
5. **Click "Apply"**
6. **See discount applied**:
   - Subtotal: $XX.XX
   - Discount (SAVE5): -$5.00 ✅
   - **Total: $XX.XX**
7. **Complete checkout**

### Expected Results:

✅ Code validates instantly  
✅ Discount shows in green  
✅ Total updates correctly  
✅ Order completes with discount  
✅ Admin panel shows usage

---

## 🧪 Quick Tests

### Test 1: Valid Code
```
Code: SAVE5
Order Total: $25.00
Expected: -$5.00 discount, Final: $20.00
```

### Test 2: Invalid Code
```
Code: INVALID
Expected: Error message "Invalid discount code"
```

### Test 3: Expired Code
```
1. Create code with valid_until = yesterday
2. Try to apply
Expected: Error "This code has expired"
```

### Test 4: Max Uses Reached
```
1. Create code with max_uses = 1
2. Use it once
3. Try to use again
Expected: Error "This code has reached its maximum number of uses"
```

### Test 5: Below Minimum Order
```
Code: WELCOME10 (min $20)
Order Total: $15.00
Expected: Error "Minimum order of $20.00 required"
```

### Test 6: Percentage with Cap
```
Code: WELCOME10 (10% off, max $10)
Order Total: $150.00
Expected: -$10.00 discount (capped), Final: $140.00
```

---

## 👨‍💼 Admin Panel Features

### View All Codes
- Navigate to `/admin/discount-codes`
- See list of all codes with status

### View Usage History
1. Click "View Usage" on any code
2. See:
   - Customer name and email
   - Order ID
   - Discount amount
   - Date/time used

### Deactivate Code
1. Click "Deactivate" on any active code
2. Code immediately stops working
3. Status changes to "Inactive"

### Reactivate Code
1. Click "Activate" on any inactive code
2. Code starts working again
3. Status changes to "Active"

---

## 🐛 Troubleshooting

### Code Not Validating

**Check:**
1. Is code active? (Admin panel)
2. Has it expired? (valid_until date)
3. Has it reached max uses? (current_uses vs max_uses)
4. Is order above minimum? (minimum_order_amount)

**Fix:**
- Deactivate and reactivate code
- Update valid_until date
- Increase max_uses
- Lower minimum_order_amount

### Discount Not Applying to Order

**Check:**
1. Is discount_code being passed to CreateOrderAPI?
2. Check browser console for errors
3. Check Laravel logs: `storage/logs/laravel.log`

**Fix:**
- Verify API endpoint is working: `POST /mapi/discount-codes/validate`
- Check network tab in browser dev tools
- Ensure user is authenticated

### Admin Panel Not Loading

**Check:**
1. Are routes registered? `php artisan route:list | grep discount`
2. Are migrations run? Check database tables
3. Are caches cleared?

**Fix:**
```bash
php artisan route:clear
php artisan config:clear
php artisan cache:clear
```

---

## 📊 Verify Everything Works

### Checklist:

- [ ] Migrations ran successfully
- [ ] Admin panel loads at `/admin/discount-codes`
- [ ] Can create new discount code
- [ ] Code appears in list
- [ ] Can deactivate/activate code
- [ ] Mobile app shows discount input on checkout
- [ ] Can apply valid code
- [ ] Discount shows correctly
- [ ] Can remove applied code
- [ ] Order completes with discount
- [ ] Usage shows in admin panel
- [ ] Invalid code shows error
- [ ] Expired code shows error

---

## 🎉 You're Done!

Your discount code system is now fully operational!

### Next Steps:

1. **Create production codes** for your marketing campaigns
2. **Monitor usage** in admin panel
3. **Track performance** - which codes work best
4. **Iterate** - create new codes based on data

### Need Help?

- See full documentation: `TMA-007-IMPLEMENTATION-SUMMARY.md`
- See planning document: `TMA-007-DISCOUNT-CODES-PLAN.md`
- Check Laravel logs: `backend/storage/logs/laravel.log`
- Check mobile app console for errors

---

**Happy Discounting! 🎊**





