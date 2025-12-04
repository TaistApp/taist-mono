# TMA-008: Profile Photo Now Mandatory

**Date**: December 2, 2025  
**Change**: Made profile photo mandatory during chef signup

---

## What Changed

### Before ❌
- Profile photo was **optional** during chef signup
- "Skip for Now" button allowed skipping photo upload
- Could complete signup without a photo
- Had to add photo later in Account screen

### After ✅
- Profile photo is now **required** during chef signup
- No skip option - must add photo to proceed
- Continue button disabled until photo is selected
- Clear warning message when photo missing

---

## Changes Made

### 1. StepChefPhoto.tsx

**Removed:**
- `onSkip` prop from interface
- Skip button UI and logic
- Optional skip functionality

**Added:**
- "Required" indicator in subtitle
- Disabled state for Continue button when no photo
- Warning message: "⚠️ Profile photo is required to continue"

**Updated:**
- Error message: "Please add a profile photo to continue"
- Button logic: Single Continue button, disabled when no photo

### 2. signup/index.tsx

**Updated:**
- Removed `onSkip={handleChefCompleteSignup}` from StepChefPhoto usage
- Added comment: `{/* Step 7: Photo (Chef only) - REQUIRED */}`

---

## UI Changes

### Before:
```
┌─────────────────────────┐
│  Add your profile photo │
│  [Photo Preview]        │
│                         │
│  📸 Photo Tips:         │
│  • Use clear photo      │
│  • Show face clearly    │
│                         │
│  [Continue with Photo]  │
│  [Skip for Now]         │ ← Could skip!
│  [Back]                 │
└─────────────────────────┘
```

### After:
```
┌─────────────────────────┐
│  Add your profile photo │
│  Required - builds trust│ ← Shows "Required"
│  [Photo Preview]        │
│  Tap to add photo       │
│                         │
│  📸 Photo Tips:         │
│  • Use clear photo      │
│  • Show face clearly    │
│                         │
│  [Continue] (disabled)  │ ← Disabled until photo added
│  ⚠️ Profile photo is    │ ← Warning message
│     required to continue│
│  [Back]                 │
└─────────────────────────┘
```

---

## Validation

### During Signup:
- `handleContinue()` checks if photo exists
- Shows error toast: "Please add a profile photo to continue"
- Cannot proceed to registration without photo

### In Account Screen (Already Existing):
```typescript
if (userInfo.user_type === 2) {
  if (userInfo.photo == undefined || userInfo.photo.length == 0) {
    return 'Please add your photo';
  }
}
```

**Result**: Chefs cannot save account info without a photo ✅

---

## User Experience

### Flow Now:
1. Chef reaches Step 7 (Photo)
2. Sees "Required" in subtitle
3. Continue button is **disabled** (grayed out)
4. Warning message shown below button
5. Taps photo picker
6. Selects/takes photo
7. Continue button **enabled** (orange)
8. Can now proceed to complete signup

### Benefits:
✅ **Clear expectations** - "Required" is explicitly stated  
✅ **Visual feedback** - Disabled button shows can't proceed  
✅ **Helpful messaging** - Warning explains what's needed  
✅ **Better quality** - All chefs have profile photos  
✅ **Builds trust** - Customers can see who's cooking  

---

## Code Changes

### StepChefPhoto.tsx

**Interface:**
```typescript
// BEFORE
interface StepChefPhotoProps {
  onSkip: () => void;  // ❌ Removed
}

// AFTER
interface StepChefPhotoProps {
  // onSkip removed - photo is mandatory
}
```

**Subtitle:**
```typescript
// BEFORE
subtitle="This helps customers recognize you and builds trust"

// AFTER
subtitle="Required - This helps customers recognize you and builds trust"
```

**Button Logic:**
```typescript
// BEFORE
{hasPhoto ? (
  <StyledButton title="Continue" />
) : (
  <>
    <StyledButton title="Continue with Photo" />
    <Pressable onPress={onSkip}>Skip for Now</Pressable>
  </>
)}

// AFTER
<StyledButton
  title="Continue"
  onPress={handleContinue}
  disabled={!hasPhoto}  // Disabled until photo added
/>

{!hasPhoto && (
  <Text style={styles.requirementText}>
    ⚠️ Profile photo is required to continue
  </Text>
)}
```

**Styles:**
```typescript
// REMOVED (no longer needed):
skipButton: {...}
skipButtonText: {...}
skipSubtext: {...}

// ADDED:
requirementText: {
  fontSize: 14,
  color: AppColors.textSecondary,
  textAlign: 'center',
  fontStyle: 'italic',
}
```

---

## Why This Change?

### Business Reasons:
1. **Trust & Safety**: Customers want to know who's cooking in their home
2. **Professional Image**: Profile photos make chefs look more professional
3. **Completion**: Better to collect all info upfront than have incomplete profiles
4. **Consistency**: Most service apps require profile photos for service providers

### Technical Reasons:
1. **Data Quality**: Ensures all chef profiles are complete
2. **User Experience**: No incomplete profiles showing to customers
3. **Admin Review**: Easier for admins to verify chef identity with photo
4. **Compliance**: May be needed for background check/verification

---

## Testing Checklist

- [x] Continue button disabled when no photo
- [x] Continue button enabled after photo selected
- [x] Warning message shows when no photo
- [x] Warning message hides after photo selected
- [x] Error toast shows if trying to continue without photo
- [x] Photo picker opens on tap
- [x] Camera option works
- [x] Gallery option works
- [x] Can change photo after selecting
- [x] Back button works
- [x] Photo persists through completion
- [x] No linter errors

---

## Impact

### Users Affected:
- **New chef signups** - Must add photo during signup
- **Existing chefs** - No impact (already have accounts)
- **Customers** - Will only see chefs with profile photos

### Breaking Changes:
- ❌ None - Only affects new signups, not existing users

### Database Changes:
- ❌ None - Photo field already exists and is validated

---

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `StepChefPhoto.tsx` | Removed skip, made mandatory | ~30 lines |
| `signup/index.tsx` | Removed onSkip prop | 1 line |

**Total**: 2 files, ~31 lines changed

---

## Related Validation

The Account screen already enforces photo requirement for chefs:

```typescript
// account/index.tsx - checkEmptyFieldInUserInfo()
if (userInfo.user_type === 2) {
  if (userInfo.photo == undefined || userInfo.photo.length == 0) {
    return 'Please add your photo';
  }
}
```

**Consistency**: ✅ Both signup and account editing require photos for chefs

---

## Alternative Considered

### Option 1: Keep Skip, Nag Later
- Allow skip during signup
- Show banner/notification to add photo later
- **Rejected**: Creates incomplete profiles, poor UX

### Option 2: Auto-Generate Avatar
- Create avatar from initials if no photo
- **Rejected**: Doesn't build trust like real photos do

### Option 3: Make Mandatory (CHOSEN)
- Require during signup
- Clear messaging
- **Benefits**: Complete profiles, better trust, simpler logic

---

## Success Metrics

**Expected Outcomes:**
- ✅ 100% of new chefs have profile photos
- ✅ Better customer trust and booking rates
- ✅ Cleaner admin panel (no missing photos)
- ✅ Faster admin approval (can verify identity)

**To Monitor:**
- Chef signup completion rate (ensure not dropping)
- Average time on photo step
- Photo quality (manual review)
- Customer feedback on chef profiles

---

*Update completed: December 2, 2025*  
*Profile photo now mandatory for all new chef signups!* ✅





