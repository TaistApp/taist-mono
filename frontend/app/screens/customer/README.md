# Customer Screens

This directory contains all screens and components for the customer-facing side of the Taist application.

## Overview

Customer screens enable users to browse local chefs, view menus, place orders, and manage their account. The customer experience is organized into a tab-based navigation structure.

## Screen Structure

### (tabs) - Main Customer Navigation

#### Home Tab
- **Browse Chefs**: View nearby chefs and their ratings
- **Chef Details**: View chef profiles, menus, reviews, and availability
- **Add to Order**: Customize menu items and add to cart
- **Checkout**: Review order, select delivery time, and payment method

#### Orders Tab
- **Order History**: View past and current orders
- **Order Details**: Track order status and view order information

#### Account Tab
- **Profile Management**: Edit personal information
- **Settings**: Manage preferences and notifications
- **Payment Methods**: Add and manage credit cards
- **Earn by Cooking**: Link to become a chef

## Key Screens

### home/
Main discovery screen showing available chefs based on location.

**Features:**
- Location-based chef search with current location display (TMA-013)
- Filter by cuisine type, rating, availability
- Search functionality (hidden per TMA-000)
- Chef cards with ratings and distance
- Calendar view for scheduling with "Today" quick navigation (TMA-021)

**Components:**
- `chefCard.tsx` - Chef preview cards
- `chefMenuItem.tsx` - Menu item previews
- `customCalendar.tsx` - Date picker with quick "Today" button for easy navigation

### chefDetail/
Detailed view of a chef's profile and menu.

**Features:**
- Chef bio and photos
- Full menu with categories
- Customer reviews and ratings
- Availability calendar
- Add items to cart

**Components:**
- `chefMenuItem.tsx` - Menu item cards with prices
- `chefReviewItem.tsx` - Customer review cards

### addToOrder/
Customize menu items before adding to cart.

**Features:**
- Item customization (add-ons, modifications)
- Quantity selection
- Special instructions (formerly "Special Requests" - TMA-025)
- Allergen information
- Price calculation

### checkout/
Complete the order and payment.

**Features:**
- Order summary with items and pricing (shows special instructions - TMA-025)
- Delivery date/time selection with quick "Today" navigation (TMA-021)
- Delivery address management
- Payment method selection
- Stripe payment integration
- Order confirmation

**Components:**
- `customCalendar.tsx` - Delivery date picker with "Today" button
- `orderItem.tsx` - Cart item display showing customizations and special instructions
- Card entry uses Stripe's native Payment Sheet (`useAddCardSheet`), not an in-app form

### orders/
View and manage customer orders.

**Features:**
- Active orders with real-time status
- Order history
- Order filtering and search
- Reorder functionality

**Components:**
- `orderCard.tsx` - Order preview cards

### orderDetail/
Detailed view of a specific order.

**Features:**
- Order status tracking
- Item details and customizations
- Chef contact information
- Delivery information
- Receipt and pricing breakdown
- Leave a review (for completed orders)

### earnByCooking/
Information and onboarding for customers to become chefs.

**Features:**
- Chef program benefits
- Requirements and process
- Apply to become a chef
- Link to chef onboarding

## Data Flow

1. **Discovery**: Customer browses chefs based on location
2. **Selection**: View chef details and menu
3. **Customization**: Add items to cart with modifications
4. **Checkout**: Select delivery time and payment method
5. **Order**: Place order and receive confirmation
6. **Tracking**: Monitor order status in real-time
7. **Completion**: Receive order and leave review

## State Management

Customer screens use Redux for:
- Cart management
- Order state
- User location
- Filter preferences
- Cached chef data

## API Integration

Screens communicate with the Laravel backend for:
- Fetching nearby chefs
- Retrieving menus and availability
- Creating orders
- Processing payments
- Updating order status

## Navigation

All customer screens are nested under the customer layout (`/screens/customer/_layout.tsx`), which handles:
- Customer authentication checks
- Tab navigation setup
- Header configuration
- Deep linking for customer routes


