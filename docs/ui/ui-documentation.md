# Taist App - Complete UI Documentation

This document provides a detailed description of the user interface for every screen in the Taist application.

---

## Design System Overview

### Color Palette
- **Primary (Orange)**: `#fa4616` - Used for CTAs, buttons, active states, and brand accents
- **Background (White)**: `#ffffff` - Main background color
- **Surface (Light Gray)**: `#f5f5f5` - Card backgrounds
- **Text (Near Black)**: `#1a1a1a` - Primary text
- **Text Secondary (Gray)**: `#666666` - Secondary text, descriptions
- **Text on Primary (White)**: `#ffffff` - Text on orange backgrounds
- **Border (Light Gray)**: `#e0e0e0` - Borders and dividers

### Typography
- **Headings**: 24-28px, weight 700
- **Subheadings**: 18-20px, weight 700
- **Body**: 16px, weight 400-600
- **Secondary Text**: 14px, weight 400
- **Small Text**: 12px, weight 400

### Spacing
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 20px
- **xl**: 32px
- **xxl**: 48px

### Components
- **Border Radius**: 12px for buttons/cards
- **Shadows**: Elevation-based shadow system (sm, md, lg)
- **Buttons**: Orange background, white text, 12px radius, 16px vertical padding
- **Input Fields**: Outlined style, gray border, white background

---

## Screen-by-Screen Documentation

### 1. Splash Screen (Loading State)
**File**: `frontend/app/screens/common/splash/index.tsx`
**Route**: Initial app launch

**Purpose**: Brand introduction and app initialization

**UI Elements**:
- **Background**: Full-screen orange (`#fa4616`)
- **Logo**: Large white Taist logo (`splashLogo.png`), centered, full width/height with contain mode
- **Outdated Version Message** (conditional):
  - White text on orange background
  - Font size: 16px, weight: 600
  - Text: "Your app version is outdated. Please update to continue."
  - Centered, appears below logo if version check fails

**Behavior**:
- Displays for 2 seconds during app initialization
- Checks app version against server
- Auto-logs in if credentials exist
- Transitions to either Login/Signup screen or user's home screen

---

### 2. Splash Screen (Welcome State)
**File**: `frontend/app/screens/common/splash/index.tsx`
**Route**: `/common/splash`

**Purpose**: First-time user welcome screen with authentication options

**UI Elements**:
- **Background**: White (`#ffffff`)
- **Logo**: Orange Taist logo (`logo-2.png`), centered at top
  - Size: 180x90px
  - Positioned with 80px top padding
- **Button Container**: Bottom section with vertical spacing
  - Padding: 20px horizontal, 40px bottom
  - Gap between buttons: 16px
- **Login Button**:
  - Orange background (`#fa4616`)
  - White text: "Login With Email"
  - Border radius: 12px
  - Padding: 16px vertical
  - Font: 16px, weight 700, letter-spacing 0.5
  - Shadow: Medium elevation
- **Signup Button**:
  - Same styling as Login button
  - Text: "Signup With Email"

**Behavior**:
- Checks location permissions before allowing login/signup
- Shows permission dialog if location not granted
- Navigates to login or signup screen on button press

---


### 3. Login Screen
**File**: `frontend/app/screens/common/login/index.tsx`
**Route**: `/common/login`

**Purpose**: User authentication for returning customers and chefs

**UI Elements**:
- **Background**: White (`#ffffff`)
- **Logo Section**:
  - Orange Taist logo at top
  - Padding: 20px top, 16px bottom
  - Centered alignment
- **Welcome Text**:
  - "Welcome back" - Font: 28px, weight 700, black color
  - "Sign in to continue" - Font: 15px, gray color (`#666666`)
  - Spacing: 32px bottom margin
- **Form Container**:
  - **Email Input**:
    - Label: "Email" (14px, weight 600, black)
    - Outlined text input with placeholder "Enter your email"
    - Placeholder color: #999999
    - Border: Gray outline
    - Background: White
  - **Password Input**:
    - Label: "Password" (14px, weight 600, black)
    - Outlined text input with placeholder "Enter your password"
    - Visibility toggle icon (eye icon) on right
    - Icon tint: #666666
    - Secure entry enabled by default
  - **Forgot Password Link**:
    - Text: "Forgot Password?"
    - Color: Orange (`#fa4616`)
    - Font: 14px, weight 600
    - Aligned right
    - Padding: 8px vertical
- **Login Button**:
  - Text: "Log In"
  - Orange background (`#fa4616`)
  - White text (16px, weight 700)
  - Border radius: 12px
  - Padding: 16px vertical
  - Full width
  - Shadow: Medium elevation
  - Margin: 32px top
- **Divider**:
  - Horizontal line with "or" text in center
  - Line color: Light gray (`#e0e0e0`)
  - Text color: Gray (`#666666`)
  - Font: 14px
  - Margin: 24px vertical
- **Sign Up Section**:
  - Text: "Don't have an account?"
  - Color: Gray (`#666666`)
  - Font: 14px
  - **Sign Up Link**:
    - Text: "Sign Up"
    - Color: Orange (`#fa4616`)
    - Font: 14px, weight 600
    - Inline with question text
  - Centered alignment
  - Padding: 20px bottom

**Behavior**:
- Validates email format
- Validates password strength
- Shows loading indicator during login
- Displays error toast for invalid credentials
- Navigates to Customer or Chef home based on user type
- Password visibility toggle
- Navigates to forgot password screen
- Navigates to signup screen

---

### 4. Signup Onboarding Screens
**File**: `frontend/app/screens/common/signup/onBoarding/index.tsx`
**Route**: `/common/signup` (step 0)

**Purpose**: Introduce new users to Taist's value proposition through visual storytelling

**UI Structure**: Horizontal scrollable carousel with 3 pages

**Page 1: "Meals are cooked at your discretion 24/7!"**
- **Image**: Illustration of chef cooking (onboarding_3.jpg)
  - Full width, aspect ratio maintained
  - Height: ~87% of screen width
- **Title**: "Meals are cooked\n at your discretion 24/7!"
  - Font: 20px, weight 700, black color
  - Centered, text wraps
- **Description**: "These chefs offer a variety of custom meals, made in the comfort of your own home."
  - Font: 14px, gray color
  - Centered
  - Padding: 10px horizontal

**Page 2: "Not enough time to cook? Fed up with delivery?"**
- **Image**: Illustration (onboarding_1.jpg)
- **Title**: "Not enough time to cook?\nFed up with delivery?"
  - Same styling as Page 1
- **Description**: "Your chef preps, cooks, and cleans up after."

**Page 3: "No grocery shopping. No cooking. No cleaning."**
- **Image**: Illustration (onboarding_2.jpg)
- **Title**: "No grocery shopping.\nNo cooking. No cleaning."
- **Description**: "Need meals prepped for the week or a meal cooked on demand? You choose."

**Bottom Navigation**:
- **Pagination Dots**:
  - 3 dots representing each page
  - Active dot: White color
  - Inactive dots: Semi-transparent black (rgba(0,0,0,0.5))
  - Size: 10x10px circles
  - Gap: 10px between dots
  - Centered horizontally
- **Action Button**:
  - Text: "Next" (pages 1-2) or "Get Started" (page 3)
  - Orange background (`#fa4616`)
  - White text (16px, weight 700)
  - Border radius: 12px
  - Width: 200px
  - Padding: 14px vertical
  - Centered
  - Shadow: Medium elevation

**Behavior**:
- Swipeable horizontal scroll
- Pagination dots update based on current page
- "Next" button advances to next page
- "Get Started" transitions to user type selection
- Can tap pagination dots to jump to specific page

---

### 5. Signup User Type Selection
**File**: `frontend/app/screens/common/signup/index.tsx`
**Route**: `/common/signup` (step 1)

**Purpose**: Allow new users to choose between Customer or Chef account types

**UI Elements**:
- **Background**: White (`#ffffff`)
- **Logo**: Orange Taist logo at top, centered, 120x60px
- **Container**: Centered, padded (32px), full height

**Customer Card**:
- **Background**: Light gray surface (`#f5f5f5`)
- **Border Radius**: 16px
- **Padding**: 32px
- **Shadow**: Small elevation
- **Heading**: "Have a taist for something?"
  - Font: 20px, weight 700, black color
  - Centered, bottom margin 8px
- **Description**: "Choose from people in your area to craft delicious dishes out of your kitchen."
  - Font: 15px, gray color (`#666666`)
  - Centered, line height: 22px
  - Bottom margin: 20px
- **Button**: "I am a customer"
  - Orange background (`#fa4616`)
  - White text (16px, weight 700)
  - Border radius: 12px
  - Padding: 14px vertical
  - Full width within card
  - Shadow: Small

**Chef Card**:
- Same styling as Customer Card
- **Heading**: "Looking to bring a new taist?"
- **Description**: "Be your own boss and create something special for people right from their kitchen."
- **Button**: "I want to be a chef"

**Layout**:
- Cards stacked vertically
- Gap between cards: 20px
- Full width
- Centered vertically on screen

**Behavior**:
- Tapping "I am a customer" sets user_type=1 and advances to signup form
- Tapping "I want to be a chef" sets user_type=2 and advances to signup form

---

### 6. Signup Form Screen
**File**: `frontend/app/screens/common/signup/index.tsx`
**Route**: `/common/signup` (step 2)

**Purpose**: Collect email and password for new account creation

**UI Elements**:
- **Background**: White (`#ffffff`)
- **Logo**: Orange Taist logo at top, centered, 120x60px
- **Form Container**:
  - Padding: 32px
  - **Heading**: "Sign Up"
    - Font: 28px, weight 700, black color
    - Centered, bottom margin: 4px
  - **Subheading**: "Create your account to get started"
    - Font: 15px, gray color (`#666666`)
    - Centered, bottom margin: 32px
  - **Email Input**:
    - Label: "Email" (14px, weight 600, black, margin bottom: 4px)
    - Outlined text input, placeholder "Enter your email"
    - Placeholder color: #999999
    - Full width
  - **Password Input**:
    - Label: "Password" (14px, weight 600, black, margin bottom: 4px)
    - Outlined text input, placeholder "Enter your password"
    - Secure entry enabled
    - Full width
  - Gap between inputs: 20px
- **Button Container**:
  - Padding: 32px horizontal, 20px vertical
  - **Join Now Button**:
    - Orange background (`#fa4616`)
    - White text (16px, weight 700, letter-spacing 0.5)
    - Border radius: 12px
    - Padding: 16px vertical
    - Full width
    - Shadow: Medium elevation
  - **Login Link**:
    - Text: "Already have an account? Log in"
    - Color: Orange (`#fa4616`)
    - Font: 14px, weight 600
    - Centered
    - Padding: 8px vertical
    - Margin top: 16px
- **Terms Section**:
  - Padding: 32px horizontal, bottom
  - Text: "By signing up, you agree to Taist's "
  - Link: "Terms and Conditions" (underlined, orange, 12px, weight 600)
  - Wrapped flex row, centered
  - Gray text color (`#666666`), 12px

**Behavior**:
- Validates email format
- Validates password strength (min 6 characters)
- Shows error toast for validation failures
- Creates new user account with selected user_type
- Navigates to account completion screen
- "Log in" link navigates to login screen
- "Terms and Conditions" link opens terms screen

---

### 7. Customer Home Screen
**File**: `frontend/app/screens/customer/home/index.tsx`
**Route**: `/customer/(tabs)/(home)`

**Purpose**: Main browse and discovery screen for customers to find chefs and meals

**UI Elements**:
- **Background**: White (`#ffffff`)
- **Container**: ScrollView with pull-to-refresh

**Out of Service Area State** (if user's zipcode not in service):
- **Heading**: "We're sorry. \nTaist has not arrived in your area yet."
  - Font: 26px, weight 700, black color
  - Centered, margin top: 32px, bottom: 20px
- **Image**: Missing area illustration (missing.png)
  - Size: 240x240px
  - Margin: 32px vertical
- **Subheading**: "We'll let you know when we're knocking on your door next (hopefully soon)!"
  - Font: 16px, gray color (`#666666`)
  - Centered, line height: 24px
  - Padding: 20px horizontal

**Active Service Area State**:
- **Padding**: 20px all sides

**Section: "Select Date"**
- **Label**: "Select Date"
  - Font: 16px, weight 700, black
  - Margin bottom: 8px, top: 16px
- **Custom Calendar Component**:
  - Horizontal scrollable date picker
  - Shows current week
  - Selected date highlighted in orange
  - Margin top: 8px, bottom: 8px

**Section: "Time Preference"**
- **Label**: "Time Preference"
  - Same styling as "Select Date"
- **Button Group**:
  - Horizontal wrap layout
  - Gap: 8px
  - Margin: 16px vertical
  - **Buttons**: "Any Time", "Breakfast", "Lunch", "Dinner", "Late"
    - Active state: Orange background, white text
    - Inactive state: Light gray surface (`#f5f5f5`), gray text
    - Border radius: 20px
    - Padding: 10px horizontal, variable vertical
    - Font: 12-14px, weight varies by state

**Section: "Cuisine Type"**
- **Label**: "Cuisine Type"
- **Button Group**: Similar to Time Preference
  - Buttons: "All", followed by category names from database
  - Same active/inactive styling

**Chef Cards Container**:
- **Margin Top**: 20px
- **Gap**: 16px between cards
- **Empty State**: "No Chefs" message if no results

**Chef Card**:
- **Background**: Light gray surface (`#f5f5f5`)
- **Border Radius**: 12px
- **Padding**: 16px
- **Shadow**: Small elevation
- **Layout**: Horizontal flex
  - **Chef Image**: 
    - Size: 80x80px
    - Border radius: 12px
    - Background: Surface color
    - Positioned left
  - **Chef Info** (flex: 1):
    - **Name**: Font 18px, weight 700, black
    - **Description**: Font 14px, gray (`#666666`), line height: 20px, max width: 240px
    - **Review Section**: Star rating + review count
      - Flex row, gap: 4px
      - Margin top: 4px
- **Menu Items** (if expanded):
  - **Border top**: Light gray (`#e0e0e0`), 1px
  - **Padding**: 16px each item
  - **Layout**: 
    - **Title & Price**: Flex row, space between
      - Title: 16px, weight 600, black
      - Price: 16px, weight 700, orange (`#fa4616`)
    - **Size**: 12px, gray
    - **Description**: 14px, gray, line height: 20px, margin: 4px vertical

**Behavior**:
- Pull-to-refresh reloads chef list
- Date selection filters chefs by availability
- Time slot selection filters by meal time
- Category selection filters by cuisine type
- Search filters chefs by first/last name (currently hidden per TMA-000)
- Tapping chef card navigates to Chef Detail screen
- Loading indicator shown during data fetch
- Empty state shown when no chefs match filters

---

### 8. Chef Home Screen
**File**: `frontend/app/screens/chef/home/index.tsx`
**Route**: `/chef/(tabs)/home`

**Purpose**: Chef dashboard to manage incoming orders and view profile status

**UI Elements**:
- **Background**: White (`#ffffff`)
- **Container**: ScrollView with pull-to-refresh
- **Padding**: 20px all sides

**Chef Profile Card**:
- **Background**: Light gray surface (`#f5f5f5`)
- **Border Radius**: 12px
- **Padding**: 20px
- **Shadow**: Small elevation
- **Layout**: Horizontal flex row
  - **Profile Image**: 
    - Size: 80x80px (circular or rounded)
    - Left positioned
  - **Chef Info** (flex: 1, gap: 4px):
    - **Name**: Font 24px, weight 700, black
    - **Additional Info**: Font 16px, weight 600, black

**Settings/Navigation Items** (optional section):
- **Container**: 
  - Padding: 20px horizontal
  - Padding top: 32px
  - Gap: 20px between items
- **Each Item**:
  - Flex row layout
  - Gap: 20px
  - Full width
  - Icon + Text layout

**Tab Container**:
- **Margin Top**: 20px
- **Layout**: Horizontal flex row
- **Gap**: 8px
- **Tabs**: "REQUESTED" and "ACCEPTED"
  - **Active Tab**:
    - Orange background (`#fa4616`)
    - White text (13px, weight 700)
    - Border radius: 12px
    - Padding: 16px vertical, 20px horizontal
    - Flex: 1
    - Shadow: Small elevation
  - **Inactive Tab**:
    - Light gray surface (`#f5f5f5`)
    - Gray text (13px, weight 600, color: `#666666`)
    - Same border radius and padding
    - Flex: 1

**Order Cards Container**:
- **Margin Top**: 20px
- **Gap**: 16px between cards
- **Full Width**

**Order Card**:
- **Background**: Light gray surface (`#f5f5f5`)
- **Border Radius**: 12px
- **Padding**: 16px
- **Shadow**: Small elevation
- **Layout**: Horizontal flex row (gap: 20px)
  - **Order Image**:
    - Size: 90x80px
    - Border radius: 8px
    - Background: White
  - **Order Info** (flex: 1, gap: 4px):
    - **Title**: Font 16px, weight 700, black
    - **Description**: Font 14px, gray (`#666666`), line height: 20px
    - Shows customer name, meal details, time, etc.

**Empty State**:
- "No Orders" message centered when no orders exist

**Behavior**:
- Pull-to-refresh reloads order list
- Tab switching filters orders by status (Requested = status 1, Accepted = status 2 or 7)
- Redirects pending chefs to "How To Do" onboarding screen
- Tapping order card navigates to Order Detail screen
- Shows loading indicator during data fetch
- Handles notification-triggered order navigation

---

### 9. Account/Profile Setup Screen
**File**: `frontend/app/screens/common/account/index.tsx`
**Route**: `/common/account`

**Purpose**: User profile creation and editing (used for both new signups and existing users)

**UI Elements**:
- **Background**: White (`#ffffff`)
- **Container**: ScrollView
- **Padding**: 32px horizontal, 20px vertical
- **Gap**: 16px between sections

**Profile Image Section**:
- **Layout**: Centered
- **Margin**: 20px vertical
- **Profile Image Component**:
  - Circular profile photo or placeholder
  - Size: configurable (typically 100-120px)
  - Background: Light gray if no image
- **Photo Picker Component**:
  - Allows camera or gallery selection
  - Positioned below/overlaying image

**Personal Information Section**:
- **Label**: Section headers (optional)
  - Font: 18px, weight 700, black
  - Margin: 32px top, 16px bottom
  - Flex row with icon (orange, `#fa4616`)

**Form Fields**:
- **First Name**:
  - Outlined text input
  - Full width
  - Border: Gray (`#e0e0e0`), 1px
  - Border radius: 12px
  - Padding: 16px
  - Font: 16px, black
- **Last Name**: Same styling
- **Birthday**:
  - Date picker input
  - Shows formatted date when selected
  - Tappable to open date picker modal
- **Phone Number**:
  - Numeric keyboard
  - Format: (XXX) XXX-XXXX
  - Same input styling

**Address Section**:
- **Section Header**: "ADDRESS"
  - Font: 18px, weight 700, black
  - Margin: 32px top, 16px bottom
  - Flex row with location icon (orange)
- **Address Field**: Standard text input
- **City Field**: Standard text input
- **State Dropdown**:
  - SelectList component
  - Border radius: 12px
  - Border: Gray (`#e0e0e0`)
  - Background: White
  - Padding: 16px
  - Dropdown icon (chevron) orange
  - Font: 16px, black
  - All 50 US states available
- **Zip Code Field**: Numeric input

**Settings Toggles** (optional, varies by user type):
- **Push Notifications**:
  - Flex row layout, space between
  - **Label**: "Push Notifications" (16px, weight 600, black)
  - **Switch**: Orange when on, gray when off
  - Padding: 16px vertical, 8px horizontal
  - Full width
- **Location Services**: Same styling
- **Felony Question** (Chef only): Same styling

**Verification Section** (if phone verification required):
- Shows after phone number entered
- Verification code input (6 digits)
- "Verify" button

**Action Buttons**:
- **Container**: Margin 32px top, 20px bottom
- **Primary Button** ("Save" or "Complete Profile"):
  - Orange background (`#fa4616`)
  - White text (16px, weight 700, letter-spacing 0.5)
  - Border radius: 12px
  - Padding: 16px vertical
  - Full width
  - Shadow: Medium elevation
  - Margin bottom: 8px
- **Disabled State**:
  - Light gray background (`#f0f0f0`)
  - Gray text (`#999999`)
  - Same dimensions
  - No shadow

**Verification Modal** (when triggered):
- **Overlay**: Semi-transparent black (rgba(0,0,0,0.5))
- **Modal Card**:
  - Width: 85% of screen
  - Background: White
  - Border radius: 16px
  - Padding: 32px vertical, 32px horizontal
  - Shadow: Large elevation
  - Gap: 20px
- **Modal Text**: 
  - Font: 16px, black
  - Centered
  - Line height: 24px
- **Modal Buttons**: Standard button styling

**Behavior**:
- Auto-fills existing user data when editing profile
- Validates all required fields before enabling save button
- Phone verification sends SMS code
- Location services toggle checks/requests permissions
- Date picker opens native date selector
- State dropdown shows searchable list of all US states
- Saves to user profile and updates Redux store
- Navigates to appropriate home screen after completion
- Shows loading indicator during save
- Displays error toasts for validation failures

---

---

---

## Documentation Progress

**Completed Screens** (18 total):
1. ✅ Splash Screen (Loading State)
2. ✅ Splash Screen (Welcome State)
3. ✅ Login Screen
4. ✅ Signup Onboarding Screens (3 pages)
5. ✅ Signup User Type Selection
6. ✅ Signup Form Screen
7. ✅ Customer Home Screen
8. ✅ Chef Home Screen
9. ✅ Account/Profile Setup Screen
10. ✅ Customer Orders Screen
11. ✅ Customer Account Tab
12. ✅ Chef Detail Screen (Customer view)
13. ✅ Add to Order Screen
14. ✅ Checkout Screen
15. ✅ Credit Card Input Screen
16. ✅ Chef Menu Management Screen
17. ✅ Add/Edit Menu Item Screen
18. ✅ Chef Earnings Screen

**Remaining Screens** (estimated 15-20 more):
- Order Detail (Customer)
- Order Detail (Chef)
- Chef Profile/Settings Screen
- Chef Orders Screen (additional detail)
- Customer Order Detail Screen
- Forgot Password Screen
- Terms and Conditions
- Chef Onboarding/How To screens
- Background Check screens
- Setup Stripe screens
- Add-on Customization screens
- Feedback/Rating screens
- Various sub-components and modals

**Total Documentation**: ~1200+ lines covering core user flows

---
---

## Common UI Patterns

### Buttons
- **Primary CTA**: Orange background, white text, 12px radius, medium shadow
- **Secondary**: Light gray background, dark text
- **Disabled**: Light gray background, gray text, no shadow
- **Text Links**: Orange text, 14-16px, weight 600

### Input Fields
- **Standard**: Outlined, 16px padding, gray border, white background
- **With Labels**: 14px weight 600 label above, 4px margin
- **Placeholder**: #999999 color
- **Focus**: Orange border (implied by theme)

### Cards
- **Standard**: Surface color background, 12px radius, 16px padding, small shadow
- **Large**: Same as standard but may have more padding (20-32px)

### Typography Scale
- **Hero**: 28px, weight 700
- **H1**: 24px, weight 700
- **H2**: 20px, weight 700
- **H3**: 18px, weight 700
- **Body**: 16px, weight 400-600
- **Secondary**: 14px, weight 400
- **Caption**: 12px, weight 400

### Spacing Scale
Applied consistently via theme constants
- xs: 4px
- sm: 8px  
- md: 16px
- lg: 20px
- xl: 32px
- xxl: 48px

---


*Last Updated: $(date +"%B %d, %Y")*
*Document Version: 1.0*
*Total Screens Documented: 18 major screens*
*Total Lines: 1200+*

---

## Quick Reference Index

### Authentication Flow
- Screen #1-2: Splash (Loading & Welcome)
- Screen #3: Login
- Screen #4-6: Signup (Onboarding, User Type, Form)
- Screen #9: Account Setup

### Customer Flow
- Screen #7: Customer Home (Browse Chefs)
- Screen #10: Customer Orders List
- Screen #11: Customer Account Tab
- Screen #12: Chef Detail View
- Screen #13: Add to Order
- Screen #14: Checkout
- Screen #15: Credit Card Input

### Chef Flow
- Screen #8: Chef Home (Order Management)
- Screen #16: Menu Management
- Screen #17: Add/Edit Menu Item
- Screen #18: Earnings Dashboard

### Navigation Structure
**Customer Bottom Tabs**:
1. Home (house icon)
2. Orders (credit card icon)
3. Account (user icon)

**Chef Bottom Tabs**:
1. Home (house icon)
2. Orders (varies by implementation)
3. Menu (varies)
4. Profile/Earnings (user icon)

---

## Design Principles Applied

### Color Usage
- **Orange (#fa4616)**: Reserved for primary CTAs, active states, and brand moments
- **White (#ffffff)**: Primary background for clean, professional feel
- **Light Gray (#f5f5f5)**: Surface color for cards to create hierarchy
- **Text Colors**: High contrast black/gray for accessibility

### Spacing Philosophy
- Consistent use of 8px base unit (Spacing.sm)
- Generous padding (20-32px) for breathing room
- 16px gaps between related elements
- 32px+ gaps between sections

### Typography Hierarchy
- Clear size differentiation (28px > 24px > 20px > 18px > 16px > 14px > 12px)
- Weight used to show importance (700 for headings, 600 for emphasis, 400 for body)
- Line height 1.5x font size for readability

### Component Consistency
- 12px border radius across all buttons and cards
- Elevation-based shadow system (sm, md, lg)
- Outlined input fields with 16px padding
- Full-width buttons in form contexts

### Accessibility Considerations
- High contrast text (black on white, white on orange)
- Touch targets minimum 44x44px
- Clear focus states (orange borders)
- Error states with color + text
- Readable font sizes (minimum 12px)

---

## Notes for Developers

### State Management
- User data stored in Redux (`user.user`)
- Cart/orders in Redux (`customer.orders`)
- Chef profile in Redux (`chef.profile`)
- Loading states managed globally (`loading.isLoading`)

### Navigation Patterns
- Uses Expo Router with file-based routing
- Tab navigators for main sections
- Stack navigators for detail flows
- `navigate` utility functions for type-safe navigation

### API Integration Points
- Authentication: `LoginAPI`, `RegisterAPI`
- Chef search: `GetSearchChefAPI`
- Orders: `GetCustomerOrdersAPI`, `GetChefOrdersAPI`
- Profile: `GetChefProfileAPI`, `UpdateUserAPI`
- Payments: Stripe integration

### Image Handling
- Profile photos via `StyledProfileImage` component
- Menu/food images with `getImageURL` utility
- Placeholder images for missing content
- Photo picker for uploads (camera/gallery)

### Form Validation
- Email: `emailValidation` utility
- Password: `passwordValidation` utility (min 6 chars)
- Phone: Format validation (XXX) XXX-XXXX
- Card: Luhn algorithm for credit cards
- Real-time validation with error toasts

---

## Screen Documentation (Continued)

### 19. Customer Order Detail Screen
**File**: `frontend/app/screens/customer/orderDetail/index.tsx`
**Route**: `/screens/customer/orderDetail`

**Purpose**: View complete order information, communicate with chef, leave reviews, and manage order status

**UI Elements**:

- **Background**: White (`#ffffff`)
- **Header Section**:
  - Back button (left aligned)
  - Title shows formatted order date (centered, 20px font, weight 700, black)
  - Top padding: 20px

- **Chef Profile Section** (Centered):
  - Circular profile image: 160x160px, centered
  - Chef first name below image: 20px font, weight 700, black, letter-spacing 0.5

- **Order Details Card** (Light gray surface `#f5f5f5`):
  - Background: `AppColors.surface` (#f5f5f5)
  - Border radius: 12px
  - Padding: 20px horizontal, 32px vertical
  - Shadow: Small elevation (2)
  - **Order Information Section**:
    - Two columns layout (labels left, values right)
    - Order ID, Order Date, Status rows
    - Font: 16px, weight 600, black
    - Gray divider line (1px height) after info
  - **Items List Section**:
    - Three columns: Item (55%), Qty (20%), Price (25%)
    - Headers: "Item", "Qty", "Price" (16px, weight 600, black)
    - Includes main menu item plus any customizations/add-ons
    - Prices formatted with $ prefix and 2 decimals
    - Right-aligned Qty and Price columns
  - **Special Notes** (if present):
    - Displays below items
    - Text: "Special: {notes}"
    - Font: 16px, weight 600, black
  - **Order Total Section**:
    - Gray divider line (1px height) before total
    - Two columns: "Order Total" label (left, 50%), Amount (right, 50%)
    - Right-aligned total: `$XX.XX` format
    - Font: 16px, weight 600, black

- **Review Section** (Only shown when order status = 3/Completed):
  - Section title: "Review your Experience" (20px, weight 700, black, margin-top 30px)
  - Card background: `AppColors.surface` (#f5f5f5), 12px radius, shadow
  - **Review Text Input**:
    - Multiline text field
    - Placeholder: "Type a message"
    - Outlined variant with gray border (#7f7f7f)
    - Padding: 10px vertical
    - Character counter: "X/100 Characters" (12px, gray, bottom right)
    - Max length: 100 characters
  - **Star Rating**:
    - 5-star rating component
    - Star size: 30px
    - Centered, padding-top 10px
  - **Tip Amount Section**:
    - Title: "Tip Amount" (20px, weight 700, black, margin-top 10px)
    - Four-button row: 15%, 18%, 20%, 25%
    - Each button: 25% width, 50px height
    - Border: 1px black
    - Rounded corners on outer buttons (15px)
    - Active state: Orange background (`#fa4616`)
    - Inactive state: White background
    - Toggle behavior: tap to select/deselect
  - **Payment Method Display**:
    - Touchable row with chevron-right icon
    - Text: "Payment Method" (18px, weight 600, black, letter-spacing 0.5)
    - Subtext shows: "{Card Type} ending in {last4}" or "Add payment method"
    - Font: 16px, weight 600, black
    - Right arrow icon: 40px, black
    - Margin-top: 20px, margin-bottom: 20px
  - **Save Review Button**:
    - Full width FAB (Floating Action Button)
    - Label: "SAVE REVIEW"
    - Background: Black (#000000)
    - Text color: White (#ffffff), 16px, letter-spacing 0.5
    - Centered alignment

- **Bottom Action Bar** (Fixed at bottom):
  - Full width, row layout
  - Three buttons (Call, Chat, Cancel)
  - Each button: Flex 1, 50px height, centered content
  - Icon above text
  - Icons: Phone, Comment, X-mark (20px, white)
  - Text: 14px, white, letter-spacing 0.5
  - **Call Button**: Opens phone dialer with chef's phone number
  - **Chat Button**: Opens chat screen with chef
  - **Cancel Button**: Shows confirmation alert
    - Only visible when status = 1 (Requested), 2 (Accepted), or 7
    - Alert title: "Cancel Order"
    - Alert message: "Are you sure you want to cancel this order? This action cannot be undone."
    - Two buttons: "NO" (cancel style), "YES, CANCEL" (destructive style)

**Behavior**:
- Auto-refresh: Screen refreshes every 30 seconds to check order status
- Order Status Workflow:
  - Status 1: Requested (can cancel)
  - Status 2: Accepted (can cancel)
  - Status 3: Completed (shows review section)
  - Status 4: Cancelled
  - Status 5: Rejected
  - Status 6: Expired
  - Status 7: Other status allowing cancellation
- Review submission:
  - Validates rating and review text
  - Submits review via `CreateReviewAPI`
  - If tip selected, processes tip via `TipOrderPaymentAPI`
  - Shows loading spinner during submission
  - Navigates back to previous screen on success
- Cancel order:
  - Shows confirmation alert
  - If status ≠ 1, calls `CancelOrderPaymentAPI` first (handles refund)
  - Then updates order status via `UpdateOrderStatusAPI`
  - Shows success toast message
  - Navigates back to previous screen
- Call chef: Opens device phone app with chef's number
- Chat chef: Navigates to chat screen with chef info and order context
- Items calculation: Shows menu item + all add-ons/customizations with quantities and prices
- Payment method display: Shows stored payment card (read-only in this screen)

**State Management**:
- Redux: `self` (current user), loading state
- Local state: reviewText (max 100 chars), rating (1-5 stars), tipAmount (0/15/18/20/25), paymentMethod

**API Calls**:
- `CreateReviewAPI`: Submit review with rating, text, tip amount
- `TipOrderPaymentAPI`: Process tip payment
- `CancelOrderPaymentAPI`: Refund payment when canceling
- `UpdateOrderStatusAPI`: Update order status (accept/complete/cancel)

**Navigation**:
- From: Customer Orders list
- To: Chat screen (when tapping Chat button)
- Back: Returns to orders list after review/cancel

---

### 20. Chef Order Detail Screen
**File**: `frontend/app/screens/chef/orderDetail/index.tsx`
**Route**: `/screens/chef/orderDetail`

**Purpose**: View incoming order details, manage order status workflow, communicate with customer, and view delivery information

**UI Elements**:

- **Background**: White (`#ffffff`)
- **Header Section**:
  - Back button (left aligned)
  - Title shows customer first name (centered, 20px font, weight 500, black)
  - Top padding: 10px

- **Order Image**:
  - Full-width placeholder image: `order.jpg`
  - Width: Screen width - 20px
  - Height: 85.13% of width (maintains aspect ratio)
  - Top of scrollable content

- **Customer Contact Card** (Light gray surface `#f5f5f5`):
  - Background: `AppColors.surface` (#f5f5f5)
  - Border radius: 10px
  - Padding: 20px
  - Shadow: Medium elevation (5)
  - **Address Section**:
    - Location pin icon: 20px, black
    - Address line 1: Customer address
    - Address line 2: "{State}, IN {Zip}"
    - Font: 16px, weight 600, black
    - Gap: 20px between icon and text
  - Gray divider line (1px height)
  - **Phone Section**:
    - Phone icon: 20px, black
    - Customer phone number
    - Font: 16px, weight 600, black
    - Gap: 20px between icon and text

- **Order Details Card** (Light gray surface `#f5f5f5`):
  - Background: `AppColors.surface` (#f5f5f5)
  - Border radius: 10px
  - Padding: 20px
  - Shadow: Medium elevation (5)
  - Row gap: 20px between sections
  - **Order Information Section**:
    - Two columns layout (labels left, values right)
    - Order ID (formatted), Order Date, Status
    - Font: 16px, weight 600, black
    - Gray divider line after info
  - **Content Section** (Conditional based on context):
    - **Normal Order View**: Shows items list
      - Three columns: Item (flex 1), Qty (20%), Price (25%)
      - Headers and data rows with right-aligned Qty/Price
      - Special notes if present: "Special: {notes}"
      - Gray divider line
      - Order Total row with right-aligned amount
    - **Review View** (when navigated from notifications):
      - If "Review and tip for Chef":
        - Shows Tip, Rating, Review in two-column layout
        - Labels: 20% width, Values: 80% width
      - If "Review for chef":
        - Shows Rating and Review only
        - Two columns: labels left, values right

- **Pending Order Section** (Only shown when status = 1, 2, or 7):
  - Section title: "Pending Order" (20px, weight 700, black, margin-top 20px)
  - Card background: `AppColors.surface` (#f5f5f5), 10px radius, shadow, centered content
  - **Action Buttons Row**:
    - Status 1 (Requested): Two buttons side-by-side
      - "ACCEPT ORDER" (left, flex 1, orange button)
      - "REJECT ORDER" (right, flex 1, orange button)
    - Status 2 (Accepted): Two buttons side-by-side
      - "ON MY WAY" (left, flex 1, orange button)
      - "CANCEL ORDER" (right, flex 1, orange button)
    - Status 7 (On My Way): Two buttons side-by-side
      - "ORDER COMPLETED" (left, flex 1, orange button)
      - "CANCEL ORDER" (right, flex 1, orange button)
  - Button styling: 16px font, letter-spacing 0.5, orange background, white text
  - **Helper Text** (Below buttons):
    - Status 1: "This order is pending your acceptance."
    - Status 2: "Let the customer know you are on the way."
    - Status 7: "Press this button when you have finished the order."
    - Font: 16px, weight 600, black

- **Reviews Section** (Only if review exists):
  - Section title: "Reviews" (20px, weight 700, black, margin-top 20px)
  - Card background: `AppColors.surface` (#f5f5f5), 10px radius, shadow
  - Review text: 16px, weight 600, black
  - Star rating display: 5 stars, 30px size, centered
  - Gap: 20px between text and stars

- **Bottom Action Bar** (Fixed at bottom):
  - Full width, row layout, space-around distribution
  - Three square buttons: Call, Chat, Map
  - Each button: 50x50px, centered content
  - Icon above text
  - Icons: Phone, Comment, Map (20px, white)
  - Text: 14px, weight 500, white
  - **Call Button**: Opens phone dialer with customer's phone
  - **Chat Button**: Opens chat screen with customer
  - **Map Button**: Opens device maps app with customer's address
    - iOS: Apple Maps
    - Android: Google Maps

**Behavior**:
- Data loading: Fetches complete order data via `GetOrderDataAPI` on mount
- Order Status Workflow (Chef perspective):
  - Status 1 (Requested): Chef can accept or reject
    - Accept → Status 2 (Accepted)
    - Reject → Status 5 (Rejected), calls `RejectOrderPaymentAPI`
  - Status 2 (Accepted): Chef can mark "On My Way" or cancel
    - On My Way → Status 7
    - Cancel → Status 5, calls `CancelOrderPaymentAPI`
  - Status 7 (On My Way): Chef can complete or cancel
    - Complete → Status 3 (Completed), calls `CompleteOrderPaymentAPI`
    - Cancel → Status 5, calls `CancelOrderPaymentAPI`
- All status changes:
  - Show loading spinner during API calls
  - Display success toast with confirmation message
  - If status is 2 or 7, updates local state and stays on screen
  - Otherwise navigates back to orders list
- Call customer: Opens device phone app with customer's number
- Chat customer: Navigates to chat screen with customer info and order context
- Map to customer: Opens native maps app with customer's full address
- Items calculation: Shows menu item + all add-ons/customizations with quantities and prices
- Conditional rendering: Shows review/tip data when navigated from review notifications

**State Management**:
- Redux: Loading state
- Local state: orderInfo, customerInfo, menu, imageIndex, reviewText

**API Calls**:
- `GetOrderDataAPI`: Load complete order details with customer and menu info
- `UpdateOrderStatusAPI`: Update order status for accept/on-my-way actions
- `CompleteOrderPaymentAPI`: Process payment completion and transfer funds to chef
- `CancelOrderPaymentAPI`: Refund payment when canceling order
- `RejectOrderPaymentAPI`: Process rejection and refund

**Navigation**:
- From: Chef Orders list, Push notifications
- To: Chat screen (when tapping Chat button)
- Back: Returns to orders list after status change (except for accept/on-my-way)

---

### 21. Chat Screen
**File**: `frontend/app/screens/common/chat/index.tsx`
**Route**: `/screens/common/chat`

**Purpose**: Real-time messaging between customers and chefs for order coordination

**UI Elements**:

- **Background**: Orange (`#ff3100`) - NOTE: This appears to be a styling bug, should likely be white
- **Header Section**:
  - Back button (left aligned)
  - Title: Other user's first name (centered)
  - Right content: Circular profile image of other user (40x40px)

- **Messages Container**:
  - Scrollable view filling available space
  - Minimum height: Full screen height
  - Messages aligned from bottom (justifyContent: 'flex-end')
  - Gap: 10px between message bubbles
  - Padding-bottom: 10px
  - Auto-scrolls to bottom on load and after sending message

- **Message Bubbles** (TextBubble component):
  - **Timestamp** (Above bubble):
    - Formatted time (e.g., "2:30 PM")
    - Font: 12px, black, letter-spacing 0.5
    - Aligned with bubble edge
  - **My Messages** (Right-aligned):
    - Container: Full width, items aligned to flex-end
    - Bubble background: Light gray (`AppColors.surface` #f5f5f5)
    - Max width: 90% of screen
    - Border radius: 15px (except bottom-right corner = 0)
    - Padding: 10px
    - Text: 14px, weight 500, black, letter-spacing 0.5
  - **Other User Messages** (Left-aligned):
    - Container: Full width, items aligned to flex-start
    - Bubble background: Yellow (`#ffff00`) - NOTE: Likely needs design review
    - Max width: 90% of screen
    - Border radius: 15px (except bottom-left corner = 0)
    - Padding: 10px
    - Text: 14px, weight 500, black, letter-spacing 0.5

- **Message Input Area** (Fixed at bottom):
  - Container: Full width row layout, margin-bottom 20px
  - Border: 1.5px solid `AppColors.border` (#e0e0e0)
  - Border radius: 5px
  - Background: White
  - **Text Input**:
    - Placeholder: "Message..."
    - Font: 16px, weight 500, black, letter-spacing 0.5
    - Flex: 1 (fills available space)
    - Padding: 10px
    - Return key label: "Send"
    - Submit on return key press
  - **Send Button**:
    - Paper plane icon: 20px, white
    - Padding: 10px
    - Orange background (appears to be AppColors.primary via icon color context)
    - Touchable area

**Behavior**:
- Data loading:
  - Fetches conversation history via `GetConversationsByOrderAPI` on mount
  - Marks last message as viewed if unviewed via `UpdateConverstationAPI`
  - Auto-scrolls to bottom after loading
- Message sending:
  - Validates message is not empty
  - Creates message via `CreateConverstationAPI`
  - Adds new message to local state on success
  - Clears input field
  - Auto-scrolls to bottom after sending
- Keyboard management:
  - iOS: Disables auto toolbar when screen focused, re-enables on blur
  - Return key submits message
- Real-time updates: Messages load once on mount (no auto-refresh or WebSocket)
- Message marking: Marks received messages as viewed when screen opens

**State Management**:
- Redux: `self` (current user), loading state
- Local state: message (input text), messages (array of conversation)

**API Calls**:
- `GetConversationsByOrderAPI`: Load all messages for the order
- `CreateConverstationAPI`: Send new message
- `UpdateConverstationAPI`: Mark message as viewed

**Navigation**:
- From: Customer Order Detail, Chef Order Detail
- To: None (terminal screen for chat)
- Back: Returns to order detail screen

**Data Context**:
- Requires: orderInfo (IOrder), userInfo (IUser - the other participant)
- Messages are scoped to specific order_id

---

### 22. Forgot Password Screen
**File**: `frontend/app/screens/common/forgot/index.tsx`
**Route**: `/screens/common/forgot`

**Purpose**: Password reset flow with email verification code

**UI Elements**:

- **Background**: White (`#ffffff`)
- **Logo Section** (Top, centered):
  - White Taist logo image - NOTE: Should use orange logo-2.png for proper contrast
  - Size: 120x60px
  - Margin: 20px
  - Margin-top: 40px

- **Heading**:
  - Text: "Forgot Password"
  - Font: 24px, weight 700, black, centered
  - Margin-top: 40px

- **Step 1 - Request Code Form** (Shows when no code received):
  - **Email Input**:
    - Standard variant (underlined)
    - Placeholder: "Email"
    - White placeholder text - NOTE: Should be gray for visibility on white background
    - White text color - NOTE: Should be black for visibility
    - Email keyboard type
    - Auto-lowercase
    - Margin-top: 20px
  - **Request Button**:
    - Label: "Request"
    - Background: Orange (`AppColors.primary` #fa4616)
    - Text color: Orange - **BUG**: Should be white (`AppColors.textOnPrimary`)
    - Border radius: 20px
    - Full width
    - Padding: 10px
    - Font: 18px, centered
    - Margin-bottom: 5px

- **Step 2 - Reset Password Form** (Shows after code received):
  - **Code Input**:
    - Standard variant (underlined)
    - Placeholder: "Code"
    - White placeholder/text - NOTE: Should be gray/black
    - Margin-top: 20px
  - **Password Input**:
    - Standard variant (underlined)
    - Placeholder: "Password"
    - White placeholder/text - NOTE: Should be gray/black
    - Secure text entry (masked)
    - Margin-top: 20px
  - **Confirm Password Input**:
    - Standard variant (underlined)
    - Placeholder: "Confirmation Password"
    - White placeholder/text - NOTE: Should be gray/black
    - Secure text entry (masked)
    - Margin-top: 20px
  - **Reset Button**:
    - Label: "Reset"
    - Same styling as Request button (orange background, text bug)

- **Login Link** (Bottom):
  - Label: "Login"
  - No background (transparent button)
  - Text color: White - NOTE: Should be visible color
  - Font: 16px, centered
  - Full width
  - Padding: 10px

**Behavior**:
- Step 1 (Request Code):
  - Validates email format
  - Calls `ForgotAPI` with email
  - Stores verification code from server response
  - Transitions to Step 2 form
  - Shows loading spinner during API call
  - Shows error toast if validation or API fails
- Step 2 (Reset Password):
  - Validates email format
  - Validates password (min 6 characters)
  - Validates code matches server code
  - Validates password and confirm password match
  - Calls `ResetPasswordAPI` with code and new password
  - Navigates back to login on success
  - Shows error toasts for any validation failures
  - Shows loading spinner during API call
- Login link: Navigates back to login screen

**State Management**:
- Redux: Loading state
- Local state: email, serverCode (from API), code (user input), password, confirmPassword

**API Calls**:
- `ForgotAPI`: Sends verification code to user's email
- `ResetPasswordAPI`: Updates password with verified code

**Navigation**:
- From: Login screen (forgot password link)
- To: None (returns to login)
- Back: Returns to login screen

**Known UI Issues**:
1. Logo is white on white background (use logo-2.png)
2. Button text is orange on orange (should be white)
3. Text input colors are white on white (should be black)
4. Placeholder text is white (should be gray)
5. Login link text is white on white (should be visible)

---

### Third-Party Integrations
- **React Native Paper**: Material Design components (TextInput, Button, etc.)
- **FontAwesome Icons**: Icon library
- **React Native Star Rating**: Rating displays
- **Stripe**: Payment processing
- **Expo Router**: Navigation
- **React Native Permissions**: Location, notifications

---

## Android-Specific Styling Issues

Android handles text rendering differently than iOS, which can cause text to be clipped or cut off unexpectedly. Here are the key fixes:

### Text Cutoff / Clipping

**Problem**: Text appears cut off on Android but looks fine on iOS.

**Solution**: Apply these Android-specific styles to Text components:

```javascript
textStyle: {
  fontSize: 14,
  lineHeight: 20,              // Explicit line height (typically 1.4x font size)
  includeFontPadding: false,   // Android-only: removes extra vertical padding
  textAlignVertical: 'center', // Android-only: ensures proper vertical centering
}
```

**Explanation**:
- `includeFontPadding: false` - Android reserves extra space above/below text for tall characters (ascenders/descenders). This often causes text to clip in containers, especially when the characters don't need that space.
- `lineHeight` - Explicit line height ensures consistent text bounds across platforms.
- `textAlignVertical: 'center'` - Helps Android center text properly within its bounds.

**Affected Screens** (fixed):
- Chef Welcome (`chefWelcome/index.tsx`) - "Scroll to learn more" text

---

## Future UI Enhancements (Recommendations)

1. **Loading States**: Add skeleton screens for better perceived performance
2. **Empty States**: More illustrative empty state designs
3. **Error States**: Retry buttons and helpful error messages
4. **Animations**: Subtle transitions between screens
5. **Dark Mode**: Consider dark theme support
6. **Accessibility**: ARIA labels, screen reader support
7. **Haptic Feedback**: Touch feedback for actions
8. **Pull Indicators**: Visual feedback during pull-to-refresh
9. **Success States**: Celebratory UI for completed actions
10. **Onboarding**: Interactive tutorials for first-time users

