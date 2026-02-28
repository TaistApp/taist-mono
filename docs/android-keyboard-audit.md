# Android Keyboard Input Visibility Audit

Screens where the Android soft keyboard may cover TextInput fields. All identified issues have been fixed.

## Fixed Screens

| # | Screen | File | Fix | Verified |
|---|--------|------|-----|----------|
| 1 | Add to Order | `screens/customer/addToOrder/index.tsx` | `KeyboardAwareScrollView` + `scrollToEnd` on focus | Maestro Android |
| 2 | Chat | `screens/common/chat/index.tsx` | `KeyboardAvoidingView` with `behavior='height'` on Android | Maestro Android |
| 3 | Order Detail (review) | `screens/customer/orderDetail/index.tsx` | `KeyboardAwareScrollView` + `scrollToEnd` on focus | View hierarchy inspection |
| 4 | Chef Feedback | `screens/chef/feedback/index.tsx` | `KeyboardAwareScrollView` (replaced plain ScrollView) | Maestro Android |
| 5 | Background Check | `screens/chef/backgroundCheck/index.tsx` | `KeyboardAwareScrollView` + `scrollToEnd` on SSN/Phone focus | Maestro Android |

## Already Safe (no changes needed)

- `login/index.tsx` — KeyboardAwareScrollView
- `signup/index.tsx` — KeyboardAwareScrollView
- `forgot/index.tsx` — KeyboardAwareScrollView
- `reportIssue/index.tsx` — KeyboardAwareScrollView
- `contactUs/index.tsx` — KeyboardAwareScrollView
- `account/index.tsx` — KeyboardAwareScrollView + manual scroll-to-address
- `chef/profile/index.tsx` — KeyboardAvoidingView + Keyboard.dismiss coordination
- Signup step screens — wrappers use KeyboardAvoidingView + ScrollView

## Fix Patterns

### Pattern A: Input inside a scrollable form (most screens)
1. Replace `ScrollView` with `KeyboardAwareScrollView`
2. Add a `ref` to the scroll view
3. On the TextInput's `onFocus`, call `scrollRef.current?.scrollToEnd({ animated: true })` after a 300ms delay
4. For inputs NOT at the bottom, use `scrollTo` with a measured offset instead

Component: `frontend/app/components/KeyboardAwareScrollView/index.tsx`

### Pattern B: Fixed input outside scroll area (chat screen)
1. Wrap the container in `KeyboardAvoidingView`
2. Use `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`
3. Set appropriate `keyboardVerticalOffset` for iOS header height
