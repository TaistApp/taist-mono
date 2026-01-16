# Chef Onboarding Flow

Complete documentation of the chef registration and onboarding process.

---

## Table of Contents

1. [Overview](#overview)
2. [Onboarding Steps](#onboarding-steps)
3. [Registration](#registration)
4. [Profile Setup](#profile-setup)
5. [Menu Creation](#menu-creation)
6. [Stripe Connect Setup](#stripe-connect-setup)
7. [Background Check](#background-check)
8. [Safety Quiz](#safety-quiz)
9. [Approval Process](#approval-process)
10. [Status Tracking](#status-tracking)

---

## Overview

New chefs must complete a multi-step onboarding process before they can receive orders:

```
Registration → Profile → Menu → Stripe → Background Check → Safety Quiz → Approval
```

**Key Requirements:**
- Complete profile with photo
- At least one menu item
- Stripe Connect account for payouts
- Background check initiated
- Safety quiz passed
- Admin approval (for pending status)

**Related Files:**
- Frontend screens: `frontend/app/screens/chef/`
- Backend: `backend/app/Http/Controllers/MapiController.php`

---

## Onboarding Steps

### Visual Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHEF ONBOARDING                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │    1     │    │    2     │    │    3     │    │    4     │  │
│  │ Profile  │───>│  Menu    │───>│ Profile  │───>│ Payment  │  │
│  │  Setup   │    │ Creation │    │ Complete │    │  Setup   │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                       │         │
│                                                       ▼         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │    8     │    │    7     │    │    6     │    │    5     │  │
│  │  ACTIVE  │<───│ Approved │<───│  Safety  │<───│Background│  │
│  │  CHEF    │    │ by Admin │    │   Quiz   │    │  Check   │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step Completion Tracking

| Step | Requirement | Database Field |
|------|-------------|----------------|
| Profile Setup | Name, photo uploaded | `photo != null` |
| Menu Creation | At least 1 menu item | `menus.count >= 1` |
| Profile Complete | Bio + availability | `availabilities.exists` |
| Payment Setup | Stripe Connect | `stripe_account_id != null` |
| Background Check | Check initiated | `applicant_guid != null` |
| Safety Quiz | Quiz passed | `quiz_completed = 1` |
| Approval | Admin approved | `is_pending = 0` |

---

## Registration

### Customer → Chef Conversion

Existing customers can become chefs through "Earn by Cooking".

**Frontend:** `frontend/app/screens/customer/earnByCooking/`

**Flow:**
1. Customer taps "Earn by Cooking" in account
2. Information screen explains the process
3. User confirms intent to become chef
4. `user_type` updated from 1 to 2
5. `is_pending` set to 1 (pending approval)
6. Redirect to chef onboarding

### New User Registration

New users can register directly as chefs.

**Frontend:** `frontend/app/screens/common/signup/`

**API Call:**
```typescript
// frontend/app/services/api.ts
export const RegisterAPI = async (params: IUser) => {
  return await POST('/register', {
    ...params,
    user_type: 2, // Chef
  });
};
```

**Backend Response:**
```php
// Returns user with is_pending = 1
return response()->json([
    'success' => true,
    'data' => [
        'id' => $user->id,
        'user_type' => 2,
        'is_pending' => 1,
        'token' => $token,
    ],
]);
```

---

## Profile Setup

### Screen: `frontend/app/screens/chef/profile/`

Chefs must complete their profile with:

### Required Fields

| Field | Requirement |
|-------|-------------|
| Profile Photo | Required - camera only (no gallery) |
| First Name | Required |
| Last Name | Required |
| Phone | Required |
| Address | Required |
| Bio | Minimum characters required |

### Availability Schedule

Chefs set their weekly recurring availability:

```typescript
// Each day has start/end times
interface IChefProfile {
  monday_start: string;    // "09:00"
  monday_end: string;      // "17:00"
  tuesday_start: string;
  tuesday_end: string;
  // ... all 7 days
  minimum_order_amount: number;
  max_order_distance: number;
}
```

**Component:** `frontend/app/screens/chef/profile/component/dayRowComponent.tsx`

### Profile Validation

```typescript
const isProfileComplete = () => {
  return (
    user.photo &&
    user.first_name &&
    user.last_name &&
    user.phone &&
    user.address &&
    user.bio?.length >= MIN_BIO_LENGTH &&
    hasAtLeastOneAvailabilityDay()
  );
};
```

---

## Menu Creation

### Screen: `frontend/app/screens/chef/addMenuItem/`

Multi-step menu item creation wizard:

### Steps

1. **Name** (`StepMenuItemName.tsx`)
   - Enter dish name
   - Required field

2. **Description** (`StepMenuItemDescription.tsx`)
   - Enter/edit description
   - AI generation available
   - AI enhancement available

3. **Categories** (`StepMenuItemCategories.tsx`)
   - Select cuisine categories
   - Multiple selection allowed

4. **Allergens** (`StepMenuItemAllergens.tsx`)
   - Select allergens present
   - Important for customer safety

5. **Kitchen Appliances** (`StepMenuItemKitchen.tsx`)
   - Select required appliances
   - Customer must have these

6. **Pricing** (`StepMenuItemPricing.tsx`)
   - Set price
   - Set serving size

7. **Customizations** (`StepMenuItemCustomizations.tsx`)
   - Add customization options
   - Link to add-on creation

8. **Review** (`StepMenuItemReview.tsx`)
   - Review all information
   - Save to menu

### AI Features

```typescript
// Generate description from dish name
const handleGenerateDescription = async () => {
  const resp = await GenerateMenuDescriptionAPI({ dish_name: title });
  if (resp.success) {
    setDescription(resp.data.description);
  }
};

// Enhance existing description
const handleEnhanceDescription = async () => {
  const resp = await EnhanceMenuDescriptionAPI({ description });
  if (resp.success) {
    setDescription(resp.data.description);
  }
};
```

### Menu Item Data Structure

```typescript
interface IMenu {
  id?: number;
  user_id: number;
  title: string;
  description: string;
  price: number;
  serving_size: string;
  meals: string;           // Comma-separated meal types
  category_ids: string;    // Comma-separated category IDs
  allergens: string;       // Comma-separated allergen IDs
  appliances: string;      // Comma-separated appliance IDs
  estimated_time: number;
  is_live: number;         // 1 = available, 0 = hidden
  photo?: string;
  customizations?: IMenuCustomization[];
}
```

---

## Stripe Connect Setup

### Screen: `frontend/app/screens/chef/setupStrip/`

Chefs must set up Stripe Connect to receive payouts.

### Flow

1. **Initiate Setup**
   ```typescript
   const handleSetupStripe = async () => {
     const resp = await AddStripAccountAPI({ email: user.email });
     if (resp.success) {
       // Open Stripe Connect onboarding URL
       Linking.openURL(resp.data.onboarding_url);
     }
   };
   ```

2. **Stripe Onboarding** (External)
   - User completes Stripe's onboarding flow
   - Provides bank account info
   - Verifies identity

3. **Return to App**
   - App detects return via deep link
   - Verifies account status
   - Updates user record

### Backend Implementation

```php
// MapiController@addStripeAccount
public function addStripeAccount(Request $request)
{
    $user = Listener::find($request->user_id);

    // Create Express account
    $account = $stripe->accounts->create([
        'type' => 'express',
        'country' => 'US',
        'email' => $user->email,
        'capabilities' => [
            'card_payments' => ['requested' => true],
            'transfers' => ['requested' => true],
        ],
    ]);

    $user->stripe_account_id = $account->id;
    $user->save();

    // Create onboarding link
    $accountLink = $stripe->accountLinks->create([
        'account' => $account->id,
        'refresh_url' => $returnUrl . '?refresh=true',
        'return_url' => $returnUrl . '?success=true',
        'type' => 'account_onboarding',
    ]);

    return response()->json([
        'success' => true,
        'data' => [
            'account_id' => $account->id,
            'onboarding_url' => $accountLink->url,
        ],
    ]);
}
```

### Return Handler

```typescript
// frontend/app/hooks/useStripeReturnHandler.ts
export const useStripeReturnHandler = () => {
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      if (event.url.includes('stripe/return')) {
        // Verify account status
        verifyStripeAccount();
      }
    };

    Linking.addEventListener('url', handleDeepLink);
    return () => Linking.removeEventListener('url', handleDeepLink);
  }, []);
};
```

---

## Background Check

### Screen: `frontend/app/screens/chef/backgroundCheck/`

Chefs must initiate a background check before approval.

### Required Information

| Field | Description |
|-------|-------------|
| Full Legal Name | First, middle, last |
| Date of Birth | Must be 18+ |
| SSN | Last 4 digits |
| Address | Current residence |
| State | Dropdown selection |

### Flow

1. **Collect Information**
   ```typescript
   const [bgInfo, setBgInfo] = useState({
     first_name: user.first_name,
     last_name: user.last_name,
     birthday: user.birthday,
     ssn: '',
     address: user.address,
     state: user.state,
   });
   ```

2. **Submit for Check**
   ```typescript
   const handleSubmit = async () => {
     const resp = await BackgroundCheckAPI({
       id: user.id,
       ...bgInfo,
     });

     if (resp.success) {
       // User's applicant_guid is set
       dispatch(setUser(resp.data));
     }
   };
   ```

3. **Backend Processing**
   ```php
   // MapiController@backgroundCheck
   public function backgroundCheck(Request $request, $id)
   {
       $user = Listener::find($id);

       // Call background check service
       // (Integration with third-party service)

       $user->applicant_guid = $responseGuid;
       $user->save();

       return response()->json([
           'success' => true,
           'data' => $user,
       ]);
   }
   ```

### Status Check

```php
// Check background check status
Route::get('background_check_order_status', 'MapiController@backgroundCheckOrderStatus');
```

---

## Safety Quiz

### Screen: `frontend/app/screens/chef/safetyQuiz/`

Chefs must pass a food safety quiz before going live.

### Quiz Structure

**File:** `frontend/app/screens/chef/safetyQuiz/quizData.ts`

```typescript
interface QuizQuestion {
  id: string;
  question: string;
  answers: QuizAnswer[];
  explanation: string;
}

interface QuizAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
}

export const CHEF_SAFETY_QUIZ: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'What temperature should hot food be kept at?',
    answers: [
      { id: 'a', text: '120°F', isCorrect: false },
      { id: 'b', text: '140°F', isCorrect: true },
      { id: 'c', text: '100°F', isCorrect: false },
    ],
    explanation: 'Hot food must be kept at 140°F or above to prevent bacterial growth.',
  },
  // More questions...
];
```

### Quiz Flow

1. **Display Question**
   - Show question text
   - Display multiple choice answers
   - Progress bar shows completion

2. **Answer Selection**
   - Correct: Show explanation, enable "Next"
   - Incorrect: Brief feedback, allow retry

3. **Completion**
   ```typescript
   const handleCompleteQuiz = async () => {
     const resp = await CompleteChefQuizAPI({ user_id: user.id });

     if (resp.success) {
       // quiz_completed = 1 in database
       dispatch(setUser(resp.data));
       navigate.toChef.tabs();
     }
   };
   ```

### Backend

```php
// MapiController@completeChefQuiz
public function completeChefQuiz(Request $request)
{
    $user = Listener::find($request->user_id);
    $user->quiz_completed = 1;
    $user->save();

    return response()->json([
        'success' => true,
        'data' => $user,
    ]);
}
```

---

## Approval Process

### Pending Status

New chefs start with `is_pending = 1` and cannot receive orders.

### Admin Approval

**Admin Panel:** `backend/app/Http/Controllers/Admin/AdminController.php`

```php
// View pending chefs
Route::get('pendings', 'AdminController@pendings');

// Approve/Reject via API
Route::get('change_chef_status', 'AdminapiController@changeChefStatus');
```

### Approval Flow

1. Admin reviews pending applications
2. Checks:
   - Profile completeness
   - Menu items
   - Background check status
   - Stripe account status
3. Approves or rejects

```php
// AdminapiController@changeChefStatus
public function changeChefStatus(Request $request)
{
    $user = Listener::find($request->user_id);

    if ($request->action === 'approve') {
        $user->is_pending = 0;
    } else if ($request->action === 'reject') {
        // Handle rejection
    }

    $user->save();

    // Send notification to chef

    return response()->json(['success' => true]);
}
```

---

## Status Tracking

### User Fields

| Field | Type | Description |
|-------|------|-------------|
| user_type | int | 1=Customer, 2=Chef |
| is_pending | int | 0=Active, 1=Pending |
| quiz_completed | int | 0=Not done, 1=Completed |
| stripe_account_id | string | Stripe Connect account |
| applicant_guid | string | Background check ID |
| verified | int | Email verified |

### Checking Onboarding Status

```typescript
// Frontend check
const getOnboardingStatus = (user: IUser) => {
  return {
    profileComplete: !!user.photo && !!user.bio,
    hasMenu: user.menus?.length > 0,
    stripeSetup: !!user.stripe_account_id,
    backgroundCheckStarted: !!user.applicant_guid,
    quizCompleted: user.quiz_completed === 1,
    isApproved: user.is_pending === 0,
  };
};

const canReceiveOrders = (user: IUser) => {
  const status = getOnboardingStatus(user);
  return (
    status.profileComplete &&
    status.hasMenu &&
    status.stripeSetup &&
    status.quizCompleted &&
    status.isApproved
  );
};
```

### Navigation Based on Status

```typescript
// frontend/app/screens/chef/_layout.tsx
const ChefLayout = () => {
  const user = useAppSelector(x => x.user.user);

  useEffect(() => {
    if (user.is_pending === 1) {
      // Show onboarding or pending message
    }
    if (!user.quiz_completed) {
      navigate.toChef.safetyQuiz();
    }
  }, [user]);

  return <Stack />;
};
```

---

## Cancel Application

### Screen: `frontend/app/screens/chef/cancelApplication/`

Pending chefs can cancel their application.

```typescript
const handleCancelApplication = async () => {
  const resp = await RemoveUserAPI(user);

  if (resp.success) {
    // Clear local state
    dispatch(clearUser());
    navigate.toCommon.login();
  }
};
```

---

## Welcome Screen

### Screen: `frontend/app/screens/chef/chefWelcome/`

Shown after completing all onboarding steps.

Features:
- Welcome message
- Quick tips for success
- Link to help/how-to guides

---

## How-To Guides

### Screen: `frontend/app/screens/chef/howToDo/`

Educational content for new chefs:
- How to manage orders
- Best practices for photos
- Tips for descriptions
- Availability management
