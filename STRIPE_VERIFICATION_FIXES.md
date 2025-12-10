# Stripe Connect Verification Fixes

## Summary
Fixed three critical bugs causing Stripe Connect Express account verification failures. These bugs were causing invalid personal details to be sent to Stripe during account creation.

## Date
December 10, 2025

## Bugs Fixed

### 1. 🚨 CRITICAL: Date of Birth Bug
**Location:** `backend/app/Http/Controllers/MapiController.php:3846-3849`

**Problem:**
```php
// BEFORE (BROKEN)
'dob' => $user->birthday ? [
    'day' => (int) date('j', strtotime($user->birthday)),  // ❌ BUG
    'month' => (int) date('n', strtotime($user->birthday)),
    'year' => (int) date('Y', strtotime($user->birthday)),
] : null,
```

- Database stores birthday as Unix timestamp integer (e.g., `479692800` = March 15, 1985)
- Code incorrectly called `strtotime()` on the integer
- `strtotime()` expects a date string, not a timestamp, so it returned `false`
- `date()` with `false` defaults to timestamp `0` = **January 1, 1970**
- Result: All users were being sent to Stripe with DOB of Jan 1, 1970

**Fix:**
```php
// AFTER (FIXED)
'dob' => $user->birthday ? [
    'day' => (int) date('j', $user->birthday),    // ✅ Use timestamp directly
    'month' => (int) date('n', $user->birthday),
    'year' => (int) date('Y', $user->birthday),
] : null,
```

### 2. 🚨 Phone Number Format Issue
**Location:** `backend/app/Http/Controllers/MapiController.php:3845`

**Problem:**
```php
// BEFORE (BROKEN)
'phone' => $user->phone,  // ❌ Missing country code
```

- Database stores: `2245351031` (10 digits only)
- Stripe requires: E.164 format with country code
- Result: Invalid phone number format sent to Stripe

**Fix:**
```php
// AFTER (FIXED)
'phone' => \App\Helpers\AppHelper::formatPhoneE164($user->phone),  // ✅ +12245351031
```

**Helper Function Added:**
```php
// backend/app/Helpers/AppHelper.php
public static function formatPhoneE164($phone) {
    if (empty($phone)) return null;

    $cleaned = preg_replace('/[^0-9]/', '', $phone);
    if (empty($cleaned)) return null;

    // Handle 11 digits starting with 1
    if (strlen($cleaned) === 11 && substr($cleaned, 0, 1) === '1') {
        return '+' . $cleaned;
    }

    // Handle 10 digit US numbers
    if (strlen($cleaned) === 10) {
        return '+1' . $cleaned;
    }

    if (substr($phone, 0, 1) !== '+') {
        return '+' . $cleaned;
    }

    return $phone;
}
```

### 3. ⚠️ State Format Issue
**Location:** `backend/app/Http/Controllers/MapiController.php:3854`

**Problem:**
```php
// BEFORE (INCORRECT)
'state' => $user->state,  // ❌ Sends full name "Illinois"
```

- Database stores: `Illinois` (full state name)
- Stripe expects: `IL` (2-letter state code for US addresses)
- Result: Invalid state format sent to Stripe

**Fix:**
```php
// AFTER (FIXED)
'state' => \App\Helpers\AppHelper::getStateAbbreviation($user->state),  // ✅ IL
```

**Helper Function Added:**
```php
// backend/app/Helpers/AppHelper.php
public static function getStateAbbreviation($state) {
    if (empty($state)) return $state;

    // If already 2 characters, assume it's already abbreviated
    if (strlen(trim($state)) === 2) {
        return strtoupper(trim($state));
    }

    $states = [
        'alabama' => 'AL', 'alaska' => 'AK', 'arizona' => 'AZ', 'arkansas' => 'AR',
        'california' => 'CA', 'colorado' => 'CO', 'connecticut' => 'CT', 'delaware' => 'DE',
        'florida' => 'FL', 'georgia' => 'GA', 'hawaii' => 'HI', 'idaho' => 'ID',
        'illinois' => 'IL', 'indiana' => 'IN', 'iowa' => 'IA', 'kansas' => 'KS',
        // ... all 50 states + DC + Puerto Rico
    ];

    $stateLower = strtolower(trim($state));
    return $states[$stateLower] ?? $state;
}
```

## Testing

Created comprehensive test suite: `backend/test_stripe_data_formatting.php`

**Test Results:**
```
✓ Date of birth now uses direct timestamp (no strtotime bug)
✓ Phone numbers are formatted to E.164 standard
✓ State names are converted to 2-letter abbreviations
```

**Example Test Case:**
```
Original User Data:
  Phone: 2245351031
  Birthday: 479692800 (Unix timestamp)
  State: Illinois

BEFORE (What Stripe was receiving):
  Phone: 2245351031 (missing +1) ❌
  DOB: 1970-01-01 (always Jan 1, 1970) ❌
  State: Illinois (full name) ❌

AFTER (What Stripe now receives):
  Phone: +12245351031 ✅
  DOB: 1985-03-15 (correct date) ✅
  State: IL ✅
```

## Impact

- **Critical**: DOB bug affected ALL users - everyone was sent with Jan 1, 1970 birthday
- **High**: Phone number format could cause validation failures
- **Medium**: State format could cause validation failures for some states

## Files Modified

1. `backend/app/Http/Controllers/MapiController.php`
   - Fixed line 3845: Phone formatting
   - Fixed lines 3847-3849: Date of birth calculation
   - Fixed line 3854: State abbreviation

2. `backend/app/Helpers/AppHelper.php`
   - Added `formatPhoneE164()` method
   - Added `getStateAbbreviation()` method

## Commit

Commit: `15b60b7` - "Clean up codebase: documentation, formatting, and helper utilities"
Date: December 10, 2025

## Next Steps

1. Test the Stripe Connect onboarding flow with a new user
2. Verify that personal details are now accepted by Stripe
3. Monitor for any validation errors in Stripe webhooks
4. Consider adding validation at the point of user data entry to ensure correct formats

## References

- [Stripe Connect Express accounts documentation](https://stripe.com/docs/connect/express-accounts)
- [Stripe Account Creation API Reference](https://docs.stripe.com/api/accounts/create)
- [Phone number requirements for US Stripe accounts](https://support.stripe.com/questions/phone-number-requirements-for-us-stripe-accounts)
