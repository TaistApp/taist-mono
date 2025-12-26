# Frontend Components

This directory contains reusable UI components used throughout the Taist mobile application.

## Components

### DrawerModal
Modal component for displaying drawer-style overlays. Used for side menus and sliding panels.

### DrawerProvider
Context provider for managing drawer state across the application. Wraps the app to provide drawer functionality.

### cartIcon
Shopping cart icon displayed in the customer header. Shows badge with item count when cart has items.

### emptyListView
Display component shown when lists have no data. Provides consistent empty state messaging.

### headerWithBack
Reusable header component with back navigation button. Standard header for most screens.

### styledButton
Custom styled button component with consistent theming and loading states.

### styledCheckBox
Custom checkbox component matching the app's design system.

### styledPhotoPicker
Component for selecting photos from the device gallery or camera. Handles permissions and image cropping.

### styledProfileImage
Component for displaying user profile images with fallback avatars.

### styledStripeCardField
Stripe credit card input field component. Handles secure card data entry for payments.

### styledSwitch
Custom toggle switch component for settings and preferences.

### styledTabButton
Button component used in tab bars for navigation.

### GoLiveToggle
Chef availability toggle component displayed in the header. Allows chefs to go "live" (available for orders) or offline. Features:
- Only visible to activated chefs (`is_pending !== 1`) - hidden during onboarding
- Visual status indicator (green "Live" / gray "Off")
- Time picker to set availability end time when going live
- Confirmation modal when going offline
- Auto-fetches status on mount and screen focus
- Uses same time picker pattern as availability settings (dayRowComponent)

### styledTextInput
Custom text input component with consistent styling, validation, and error states.

## Usage

Components are imported and used throughout the app:

```typescript
import { StyledButton } from '@/components/styledButton';
import { HeaderWithBack } from '@/components/headerWithBack';

// In your screen
<HeaderWithBack title="My Screen" />
<StyledButton 
  title="Submit" 
  onPress={handleSubmit}
  loading={isLoading}
/>
```

## Design System

All styled components follow the app's theme defined in `/constants/theme.ts`. They automatically adapt to light/dark mode and use consistent spacing, colors, and typography.



