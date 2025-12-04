# How To Do It Screens - Post-Mortem & Fixes

## Date
December 2, 2025

## Issue Report
User reported critical visibility issues on the "How To Do It" tutorial screens:
1. Logo appearing white on white background (invisible)
2. Button text appearing orange on orange background (invisible)

## Root Cause Analysis

### Issue #1: Logo Visibility Problem ❌ → ✅ FIXED

**Affected File**: `frontend/app/screens/chef/howToDo/index.tsx`

**Root Cause**:
- The component displays tutorial pages with either actual images or a fallback logo
- When an actual image exists (`page.img`), a white background is applied: `page.img && {backgroundColor: '#ffffff'}`
- When NO image exists (pages 2-5: "Before the Order", "The Order", "Necessary", "Food Safety"), the logo.png is shown as fallback
- **BUG**: The white background condition only applied when `page.img` existed
- Result: White/light logo displayed on white page background = invisible

**Fix Applied**:
```tsx
// BEFORE
<View
  style={[
    styles.imgContainer,
    {height: page.imgHeight},
    page.img && {backgroundColor: '#ffffff'},
  ]}>

// AFTER
<View
  style={[
    styles.imgContainer,
    {height: page.imgHeight},
    // Add white background when displaying actual images
    page.img && {backgroundColor: '#ffffff'},
    // Add light gray background when displaying logo for contrast
    !page.img && {backgroundColor: '#f5f5f5'},
  ]}>
```

**Impact**: 
- Affects 4 out of 6 tutorial pages (pages 2-5)
- Logo now has proper contrast on light gray (#f5f5f5) background

---

### Issue #2: Button Text Visibility Problem ❌ → ✅ FIXED

**Affected Files**: 
1. `frontend/app/screens/chef/howToDo/styles.ts`
2. `frontend/app/screens/chef/onboarding/styles.ts`

**Root Cause**:
- Button background color: `AppColors.primary` (#fa4616 - orange)
- Button text color: **INCORRECTLY** set to `AppColors.primary` (#fa4616 - orange)
- Should be: `AppColors.textOnPrimary` (#ffffff - white)
- Result: Orange text on orange button = invisible

**Fix Applied**:
```typescript
// BEFORE
buttonText: {
  color: AppColors.primary,  // ❌ Orange on orange
  fontSize: 18,
  textAlign: 'center',
}

// AFTER
buttonText: {
  color: AppColors.textOnPrimary,  // ✅ White on orange
  fontSize: 18,
  textAlign: 'center',
}
```

**Impact**:
- Affects all 6 tutorial pages in "How To Do It" screen
- Affects chef onboarding flow
- Button text now properly visible with white text on orange background

---

## Files Modified

1. ✅ `frontend/app/screens/chef/howToDo/index.tsx` - Added conditional background for logo
2. ✅ `frontend/app/screens/chef/howToDo/styles.ts` - Fixed button text color
3. ✅ `frontend/app/screens/chef/onboarding/styles.ts` - Fixed button text color

## Prevention Measures

### Why These Bugs Occurred:

1. **Incomplete Conditional Styling**: Only handling one branch of the condition (when image exists) but not the else case (when logo is shown)

2. **Copy-Paste Error**: Using the same color constant for both background and text, likely from copying the background color line

3. **Lack of Design System Usage**: The `AppColors.textOnPrimary` constant exists specifically for this use case but wasn't consistently used

### Recommendations:

1. **Design System Enforcement**: 
   - Always use `AppColors.textOnPrimary` for text on primary colored backgrounds
   - Never use `AppColors.primary` for text color unless the background is guaranteed to contrast

2. **Visual Testing**: 
   - Add visual regression testing for all onboarding/tutorial screens
   - Test both light and dark theme scenarios

3. **Code Review Checklist**:
   - ✅ Are all conditional style branches handled?
   - ✅ Is text color contrasting with background?
   - ✅ Are design system constants used correctly?

4. **Style Audit**:
   - Audit all button styles across the app for similar issues
   - Create reusable Button component with proper defaults

## Verification Checklist

- [x] Logo visible on all tutorial pages without actual images
- [x] Button text visible and readable on all screens
- [x] No linter errors introduced
- [x] Consistent with AppColors design system
- [x] All similar patterns across codebase fixed

## Related Screens Status

✅ `frontend/app/screens/common/signup/onBoarding/styles.ts` - Already correct (uses `AppColors.textOnPrimary`)

## Color Reference

From `frontend/constants/theme.ts`:
```typescript
AppColors.primary = '#fa4616'           // Orange - for buttons
AppColors.textOnPrimary = '#ffffff'     // White - for text on orange
AppColors.surface = '#f5f5f5'           // Light gray - for surfaces
AppColors.background = '#ffffff'        // White - main background
```





