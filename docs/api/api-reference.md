# API Reference

Complete reference for the Taist Mobile API (MAPI).

**Base URL:** `https://api.taist.app/mapi/`
**Authentication:** Bearer token via Laravel Passport (OAuth2)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Orders](#orders)
4. [Menus](#menus)
5. [Payments](#payments)
6. [Availability](#availability)
7. [Reviews](#reviews)
8. [Messaging](#messaging)
9. [Support](#support)
10. [Reference Data](#reference-data)
11. [AI Features](#ai-features)
12. [Notifications](#notifications)

---

## Authentication

### Register
```
POST /register
```
Create a new user account.

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User email |
| password | string | Yes | Min 6 characters |
| first_name | string | Yes | First name |
| last_name | string | Yes | Last name |
| phone | string | No | Phone number |
| user_type | int | Yes | 1 = Customer, 2 = Chef |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "email": "user@example.com",
    "token": "Bearer eyJ0eXAi..."
  }
}
```

### Login
```
POST /login
```
Authenticate and receive access token.

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| email | string | Yes |
| password | string | Yes |

### Forgot Password
```
POST /forgot
```
Request password reset code.

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| email | string | Yes |

### Reset Password
```
POST /reset_password
```
Reset password with verification code.

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| code | string | Yes |
| password | string | Yes |

### Verify Phone
```
POST /verify_phone
```
Send SMS verification code to phone.

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| phone | string | Yes |

### Logout
```
GET /logout
```
Invalidate current access token.

**Auth Required:** Yes

---

## Users

### Get All Users
```
GET /get_users
```
Retrieve all users (for search/discovery).

**Auth Required:** Yes

### Get User by ID
```
GET /get_user/{id}
```
Retrieve specific user details.

**Auth Required:** Yes

### Update User
```
POST /update_user/{id}
```
Update user profile.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| first_name | string | First name |
| last_name | string | Last name |
| phone | string | Phone number |
| bio | string | User biography |
| address | string | Street address |
| city | string | City |
| state | string | State |
| zip | string | ZIP code |
| latitude | float | Latitude coordinate |
| longitude | float | Longitude coordinate |
| photo | string | Profile photo URL |

### Remove User
```
POST /remove_user/{id}
```
Delete user account.

**Auth Required:** Yes

### Background Check
```
POST /background_check/{id}
```
Initiate background check for chef.

**Auth Required:** Yes

### Complete Chef Quiz
```
POST /complete_chef_quiz
```
Mark safety quiz as completed.

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| user_id | int | Yes |

---

## Orders

### Get All Orders
```
GET /get_orders
```
Retrieve all orders for current user.

**Auth Required:** Yes

### Get Order by ID
```
GET /get_order/{id}
```
Retrieve basic order information.

**Auth Required:** Yes

### Get Order Data (Full)
```
GET /get_order_data/{id}
```
Retrieve complete order with related data (chef, customer, menu).

**Auth Required:** Yes

### Get Orders by Chef
```
GET /get_orders_by_chef
```
Retrieve orders for a specific chef.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| user_id | int | Chef user ID |
| start_time | string | Start date (YYYY-MM-DD) |
| end_time | string | End date (YYYY-MM-DD) |

### Get Orders by Customer
```
GET /get_orders_by_customer
```
Retrieve orders for a specific customer.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| user_id | int | Customer user ID |
| start_time | string | Start date |
| end_time | string | End date |

### Create Order
```
POST /create_order
```
Place a new order.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| chef_user_id | int | Yes | Chef to order from |
| menu_id | int | Yes | Menu item ID |
| customer_user_id | int | Yes | Customer placing order |
| amount | int | Yes | Quantity |
| total_price | float | Yes | Total price |
| addons | json | No | Customizations selected |
| address | string | Yes | Delivery address |
| order_date_new | string | Yes | Date (YYYY-MM-DD) |
| order_time | string | Yes | Time (HH:MM) |
| order_timezone | string | Yes | Timezone (e.g., America/Chicago) |
| notes | string | No | Special instructions |
| discount_code | string | No | Discount code to apply |

### Update Order
```
POST /update_order/{id}
```
Update order details.

**Auth Required:** Yes

### Update Order Status
```
POST /update_order_status/{id}
```
Change order status (chef action).

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | int | Yes | New status code |

**Status Codes:**
| Code | Status | Description |
|------|--------|-------------|
| 1 | Requested | Customer placed order, awaiting chef |
| 2 | Accepted | Chef accepted order |
| 3 | Completed | Order delivered |
| 4 | Cancelled | Order cancelled |
| 5 | Rejected | Chef rejected order |
| 6 | Expired | 30-min deadline passed |

### Remove Order
```
POST /remove_order/{id}
```
Delete an order.

**Auth Required:** Yes

### Validate Discount Code
```
POST /discount-codes/validate
```
Validate a discount code for an order.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| code | string | Yes |
| order_amount | float | Yes |
| customer_user_id | int | Yes |

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "discount_amount": 5.00,
    "final_amount": 25.00,
    "discount_type": "fixed",
    "description": "$5 off your order"
  }
}
```

---

## Menus

### Get All Menus
```
GET /get_menus
```
Retrieve all menu items.

**Auth Required:** Yes

### Get Menu by ID
```
GET /get_menu/{id}
```
Retrieve specific menu item.

**Auth Required:** Yes

### Get Chef Menus
```
GET /get_chef_menus
```
Retrieve all menus for a specific chef.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| user_id | int | Chef user ID |

### Create Menu
```
POST /create_menu
```
Create a new menu item.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | int | Yes | Chef user ID |
| title | string | Yes | Dish name |
| description | string | Yes | Dish description |
| price | float | Yes | Price |
| serving_size | string | No | Serving size |
| meals | string | No | Meal types (comma-separated) |
| category_ids | string | No | Category IDs (comma-separated) |
| allergens | string | No | Allergen IDs (comma-separated) |
| appliances | string | No | Required appliance IDs |
| estimated_time | int | No | Prep time in minutes |
| is_live | int | No | 1 = available, 0 = hidden |

### Update Menu
```
POST /update_menu/{id}
```
Update menu item.

**Auth Required:** Yes

### Remove Menu
```
POST /remove_menu/{id}
```
Delete menu item.

**Auth Required:** Yes

### Get Customizations by Menu
```
GET /get_customizations_by_menu_id
```
Get customization options for a menu item.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type |
|-------|------|
| menu_id | int |

---

## Payments

### Add Payment Method
```
POST /add_payment_method
```
Add a credit card for customer.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| stripe_token | string | Yes |
| user_id | int | Yes |

### Get Payment Methods
```
POST /get_payment_methods
```
Retrieve saved payment methods.

**Auth Required:** Yes

**Request Body:**
| Field | Type |
|-------|------|
| user_id | int |

### Delete Payment Method
```
POST /delete_payment_method
```
Remove a saved payment method.

**Auth Required:** Yes

**Request Body:**
| Field | Type |
|-------|------|
| payment_method_id | string |
| user_id | int |

### Add Stripe Account (Chef)
```
POST /add_stripe_account
```
Setup Stripe Connect account for chef payouts.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| email | string | Yes |
| user_id | int | Yes |

### Create Payment Intent
```
POST /create_payment_intent
```
Create Stripe payment intent for order.

**Auth Required:** Yes

**Request Body:**
| Field | Type |
|-------|------|
| order_id | int |

### Complete Order Payment
```
POST /complete_order_payment
```
Finalize payment after confirmation.

**Auth Required:** Yes

**Request Body:**
| Field | Type |
|-------|------|
| order_id | int |

### Cancel Order Payment
```
POST /cancel_order_payment
```
Cancel payment and issue refund.

**Auth Required:** Yes

**Request Body:**
| Field | Type |
|-------|------|
| order_id | int |

### Reject Order Payment
```
POST /reject_order_payment
```
Chef rejects order and triggers refund.

**Auth Required:** Yes

**Request Body:**
| Field | Type |
|-------|------|
| order_id | int |

### Tip Order Payment
```
POST /tip_order_payment
```
Add tip to completed order.

**Auth Required:** Yes

**Request Body:**
| Field | Type |
|-------|------|
| order_id | int |
| tip_amount | float |

---

## Availability

### Get Availability by User
```
GET /get_availability_by_user_id
```
Get chef's weekly recurring schedule.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type |
|-------|------|
| user_id | int |

### Create Availability
```
POST /create_availability
```
Create weekly availability schedule.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| user_id | int | Chef user ID |
| monday_start | string | Start time (HH:MM) |
| monday_end | string | End time (HH:MM) |
| tuesday_start | string | ... |
| ... | ... | Repeat for each day |

### Update Availability
```
POST /update_availability/{id}
```
Update weekly schedule.

**Auth Required:** Yes

### Set Availability Override
```
POST /set_availability_override
```
Override availability for a specific date.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| chef_id | int | Yes | Chef user ID |
| override_date | string | Yes | Date (YYYY-MM-DD) |
| status | string | Yes | confirmed, modified, cancelled |
| start_time | string | No | Override start time |
| end_time | string | No | Override end time |
| source | string | No | manual_toggle, reminder_confirmation |

### Get Availability Overrides
```
GET /get_availability_overrides
```
Get chef's date-specific overrides.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| chef_id | int | Chef user ID |
| start_date | string | Range start (YYYY-MM-DD) |
| end_date | string | Range end (YYYY-MM-DD) |

### Get Available Timeslots
```
GET /get_available_timeslots
```
Get bookable timeslots for a chef on a date.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| chef_id | int | Chef user ID |
| date | string | Date (YYYY-MM-DD) |
| timezone | string | Customer timezone |

### Toggle Online Status
```
POST /toggle_online
```
Set chef online/offline status (legacy).

**Auth Required:** Yes

**Request Body:**
| Field | Type |
|-------|------|
| user_id | int |
| is_online | int |

---

## Reviews

### Get Reviews by User
```
GET /get_reviews_by_user_id
```
Get reviews for a chef.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type |
|-------|------|
| user_id | int |

### Create Review
```
POST /create_review
```
Submit a review for an order.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| order_id | int | Yes |
| user_id | int | Yes |
| chef_user_id | int | Yes |
| rating | int | Yes (1-5) |
| review | string | No |

### Generate AI Reviews
```
POST /generate-ai-reviews
```
Generate AI-powered review suggestions.

**Auth Required:** Yes

**Request Body:**
| Field | Type |
|-------|------|
| chef_id | int |
| menu_id | int |

### Get Average Rating
```
GET /get_avg_rating
```
Get chef's average rating.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type |
|-------|------|
| user_id | int |

---

## Messaging

### Get Conversation List
```
GET /get_conversation_list_by_user_id
```
Get all conversations for a user.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type |
|-------|------|
| user_id | int |

### Get Conversations by User
```
GET /get_conversations_by_user_id
```
Get messages with a specific user.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type |
|-------|------|
| user_id | int |
| other_user_id | int |

### Get Conversations by Order
```
GET /get_conversations_by_order_id
```
Get messages for a specific order.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type |
|-------|------|
| order_id | int |

### Create Conversation
```
POST /create_conversation
```
Send a message.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| from_user_id | int | Yes |
| to_user_id | int | Yes |
| order_id | int | Yes |
| message | string | Yes |

### Update Conversation
```
POST /update_conversation/{id}
```
Mark message as read.

**Auth Required:** Yes

---

## Support

### Create Ticket
```
POST /create_ticket
```
Submit support request.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| user_id | int | Yes |
| subject | string | Yes |
| message | string | Yes |
| issue_type | string | No |
| current_screen | string | No |
| origin_screen | string | No |
| entry_point | string | No |
| device_model | string | No |
| device_os | string | No |
| platform | string | No |
| app_version | string | No |
| app_build | string | No |
| app_env | string | No |
| client_timestamp | string (ISO-8601) | No |
| screenshot | file image/jpeg\|image/png\|image/webp | No |

### Get Tickets
```
GET /get_tickets
```
Retrieve support tickets.

**Auth Required:** Yes

---

## Reference Data

### Get Categories
```
GET /get_categories
```
Get cuisine categories.

**Auth Required:** Yes

### Get Allergens
```
GET /get_allergens
```
Get allergen list.

**Auth Required:** Yes

### Get Appliances
```
GET /get_appliances
```
Get kitchen appliances.

**Auth Required:** Yes

### Get Zipcodes
```
GET /get_zipcodes
```
Get service area zip codes with delivery fees.

**Auth Required:** Yes

### Get Version
```
GET /get-version
```
Check app version requirements.

**Auth Required:** No

**Response:**
```json
{
  "success": true,
  "data": {
    "ios_version": "1.0.10",
    "android_version": "1.0.146",
    "force_update": false
  }
}
```

---

## AI Features

### Generate Menu Description
```
POST /generate-menu-description
```
AI-generate dish description.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| dish_name | string | Yes |

**Response:**
```json
{
  "success": true,
  "data": {
    "description": "A savory blend of..."
  }
}
```

### Enhance Menu Description
```
POST /enhance-menu-description
```
AI-enhance existing description.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| description | string | Yes |

### Analyze Menu Metadata
```
POST /analyze-menu-metadata
```
AI-analyze dish for suggested categories/allergens.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| dish_name | string | Yes |
| description | string | Yes |

---

## Notifications

### Update FCM Token
```
POST /update_fcm_token
```
Register device for push notifications.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| user_id | int | Yes |
| fcm_token | string | Yes |

### Get Notifications
```
GET /get_notifications_by_id/{id}
```
Get notifications for a user.

**Auth Required:** Yes

---

## Chef Search

### Search Chefs
```
GET /get_search_chefs/{zipcode_id}
```
Find available chefs by location and filters.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| category_id | int | Filter by cuisine |
| time_slot | string | breakfast, lunch, dinner, late |
| selected_date | string | Date (YYYY-MM-DD) |
| week_day | string | Day name (monday, tuesday, etc.) |
| timezone | string | Customer timezone |

**Response includes:**
- Chef profiles with ratings
- Attached menus with customizations
- Reviews

---

## Earnings

### Get Earnings
```
GET /get_earnings
```
Get chef earnings summary.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type |
|-------|------|
| user_id | int |

### Get Order Count
```
GET /get_order_count
```
Get total orders for chef.

**Auth Required:** Yes

**Query Parameters:**
| Param | Type |
|-------|------|
| user_id | int |

---

## Response Format

All endpoints return JSON with consistent structure:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error description",
  "message": "User-friendly message"
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad request / validation error |
| 401 | Authentication required |
| 403 | Permission denied |
| 404 | Resource not found |
| 422 | Validation failed |
| 500 | Server error |
