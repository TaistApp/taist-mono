# Data Models & Database Schema

Complete documentation of all database models, relationships, and schema definitions.

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Core Models](#core-models)
4. [Order & Payment Models](#order--payment-models)
5. [Chef Operations Models](#chef-operations-models)
6. [Communication Models](#communication-models)
7. [Reference Data Models](#reference-data-models)
8. [System Models](#system-models)

---

## Overview

The Taist database uses MySQL with 19 primary tables. All models are in `backend/app/Models/`.

### Naming Convention
- Tables: `tbl_` prefix (e.g., `tbl_orders`)
- Models: Plural PascalCase (e.g., `Orders`)
- Foreign keys: `{table}_id` (e.g., `chef_user_id`)

### Timestamp Handling
All models convert `created_at` and `updated_at` to Unix timestamps in API responses:
```php
public function getCreatedAtAttribute($date)
{
    return strtotime($date);
}
```

---

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│     Users       │       │    Categories   │
│  (Listener)     │       │                 │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │ 1:N                     │ M:N
         │                         │
┌────────┴────────┐       ┌────────┴────────┐
│ Availabilities  │       │      Menus      │
└─────────────────┘       └────────┬────────┘
         │                         │
         │ 1:N                     │ 1:N
         │                         │
┌────────┴────────┐       ┌────────┴────────┐
│ AvailOverrides  │       │ Customizations  │
└─────────────────┘       └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│     Orders      │───────│   DiscountCodes │
└────────┬────────┘  N:1  └─────────────────┘
         │
    ┌────┴────┬─────────────┐
    │         │             │
    ▼         ▼             ▼
┌───────┐ ┌───────┐   ┌───────────┐
│Reviews│ │Convos │   │Transactions│
└───────┘ └───────┘   └───────────┘
```

---

## Core Models

### Users (Listener)

Primary user model for customers and chefs.

**Table:** `tbl_users`
**Model:** `backend/app/Models/Listener.php` (extends Authenticatable)

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| first_name | varchar(255) | First name |
| last_name | varchar(255) | Last name |
| email | varchar(255) | Email (unique) |
| password | varchar(255) | Bcrypt hash |
| phone | varchar(20) | Phone number |
| birthday | date | Date of birth |
| bio | text | User biography |
| address | varchar(255) | Street address |
| city | varchar(100) | City |
| state | varchar(50) | State |
| zip | varchar(10) | ZIP code |
| latitude | decimal(10,8) | Latitude |
| longitude | decimal(11,8) | Longitude |
| photo | varchar(255) | Profile photo URL |
| user_type | tinyint | 1=Customer, 2=Chef |
| is_pending | tinyint | 0=Active, 1=Pending approval |
| verified | tinyint | Email verified flag |
| quiz_completed | tinyint | Chef safety quiz done |
| is_online | tinyint | Chef online status |
| fcm_token | varchar(255) | Firebase push token |
| stripe_customer_id | varchar(255) | Stripe customer ID |
| stripe_account_id | varchar(255) | Stripe Connect ID (chef) |
| applicant_guid | varchar(255) | Background check ID |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

**Relationships:**
- Has many: Orders (as chef), Orders (as customer), Menus, Reviews, Conversations, Availabilities

### Admins

Admin panel users.

**Table:** `tbl_admins`
**Model:** `backend/app/Models/Admins.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| name | varchar(255) | Admin name |
| email | varchar(255) | Email (unique) |
| password | varchar(255) | Bcrypt hash |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

---

## Order & Payment Models

### Orders

Customer orders.

**Table:** `tbl_orders`
**Model:** `backend/app/Models/Orders.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| chef_user_id | int | FK → users |
| menu_id | int | FK → menus |
| customer_user_id | int | FK → users |
| amount | int | Quantity |
| total_price | decimal(10,2) | Total after discount |
| addons | json | Customizations selected |
| address | text | Delivery address |
| notes | text | Special instructions |
| order_date_new | date | Delivery date (YYYY-MM-DD) |
| order_time | time | Delivery time (HH:MM) |
| order_timezone | varchar(50) | Timezone |
| order_timestamp | int | Unix timestamp |
| status | tinyint | Status code (1-6) |
| payment_token | varchar(255) | Stripe PaymentIntent ID |
| acceptance_deadline | varchar(20) | Unix timestamp deadline |
| reminder_sent_at | timestamp | When reminder was sent |
| discount_code_id | int | FK → discount_codes |
| discount_code | varchar(50) | Code string |
| discount_amount | decimal(10,2) | Amount discounted |
| subtotal_before_discount | decimal(10,2) | Original total |
| cancelled_by_user_id | int | FK → users |
| cancelled_by_role | enum | customer, chef, system |
| cancellation_reason | text | Reason text |
| cancellation_type | enum | manual, system_timeout |
| cancelled_at | timestamp | Cancellation time |
| refund_amount | decimal(10,2) | Refund amount |
| refund_percentage | int | Refund percentage |
| refund_processed_at | timestamp | Refund time |
| refund_stripe_id | varchar(255) | Stripe refund ID |
| is_auto_closed | tinyint | Auto-closed flag |
| closed_at | timestamp | Close time |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

**Status Codes:**
| Code | Status |
|------|--------|
| 1 | Requested |
| 2 | Accepted |
| 3 | Completed |
| 4 | Cancelled |
| 5 | Rejected |
| 6 | Expired |

**Relationships:**
- Belongs to: User (chef), User (customer), Menu, DiscountCode
- Has many: Reviews, Conversations, Transactions

**Model Methods:**
```php
$order->isExpired();           // Check if past deadline
$order->getTimeRemaining();    // Seconds until deadline
$order->getDeadlineInfo();     // Full deadline data
$order->hasDiscount();         // Has discount applied
$order->getDiscountSummary();  // Discount details
$order->getCancellationSummary(); // Cancellation details
```

### Transactions

Payment transaction records.

**Table:** `tbl_transactions`
**Model:** `backend/app/Models/Transactions.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| order_id | int | FK → orders |
| user_id | int | FK → users |
| amount | decimal(10,2) | Transaction amount |
| stripe_intent_id | varchar(255) | Stripe PaymentIntent |
| stripe_refund_id | varchar(255) | Stripe refund ID |
| type | enum | payment, refund, tip |
| status | varchar(50) | succeeded, pending, failed |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

### DiscountCodes

Promotional discount codes.

**Table:** `tbl_discount_codes`
**Model:** `backend/app/Models/DiscountCodes.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| code | varchar(50) | Code string (unique) |
| description | text | Description |
| discount_type | enum | fixed, percentage |
| discount_value | decimal(10,2) | Amount or percentage |
| max_uses | int | Total usage limit |
| max_uses_per_customer | int | Per-customer limit |
| current_uses | int | Current usage count |
| valid_from | datetime | Start validity |
| valid_until | datetime | End validity |
| minimum_order_amount | decimal(10,2) | Minimum order |
| maximum_discount_amount | decimal(10,2) | Cap for percentage |
| is_active | tinyint | Active flag |
| created_by_admin_id | int | FK → admins |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

**Model Methods:**
```php
$code->isValid();                    // Check validity
$code->canCustomerUse($customerId);  // Check customer eligibility
$code->calculateDiscount($amount);   // Calculate discount
$code->incrementUsage();             // Increment counter
$code->getFormattedDiscount();       // "$5 off" or "10% off"
```

**Scopes:**
```php
DiscountCodes::active()->get();         // Only active
DiscountCodes::currentlyValid()->get(); // Active + in date range
```

### DiscountCodeUsage

Tracks individual code uses.

**Table:** `tbl_discount_code_usage`
**Model:** `backend/app/Models/DiscountCodeUsage.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| discount_code_id | int | FK → discount_codes |
| customer_user_id | int | FK → users |
| order_id | int | FK → orders |
| created_at | timestamp | When used |

---

## Chef Operations Models

### Menus

Chef menu items.

**Table:** `tbl_menus`
**Model:** `backend/app/Models/Menus.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| user_id | int | FK → users (chef) |
| title | varchar(255) | Dish name |
| description | text | Dish description |
| price | decimal(10,2) | Price |
| serving_size | varchar(100) | Serving size |
| meals | varchar(255) | Meal types (comma-separated) |
| category_ids | varchar(255) | Category IDs (comma-separated) |
| allergens | varchar(255) | Allergen IDs (comma-separated) |
| appliances | varchar(255) | Appliance IDs (comma-separated) |
| estimated_time | int | Prep time minutes |
| photo | varchar(255) | Photo URL |
| is_live | tinyint | 1=Available, 0=Hidden |
| ai_generated_description | tinyint | AI-generated flag |
| description_edited | tinyint | Manually edited flag |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

**Relationships:**
- Belongs to: User (chef)
- Has many: Customizations, Orders

### Customizations

Menu item add-ons and options.

**Table:** `tbl_customizations`
**Model:** `backend/app/Models/Customizations.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| menu_id | int | FK → menus |
| name | varchar(255) | Option group name |
| options | json | Array of options with prices |
| is_required | tinyint | Required selection |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

**Options JSON Structure:**
```json
[
  {"name": "Mild", "price": 0},
  {"name": "Medium", "price": 0},
  {"name": "Spicy", "price": 1.50}
]
```

### Availabilities

Chef weekly recurring schedules.

**Table:** `tbl_availabilities`
**Model:** `backend/app/Models/Availabilities.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| user_id | int | FK → users (chef) |
| monday_start | time | Monday start time |
| monday_end | time | Monday end time |
| tuesday_start | time | Tuesday start |
| tuesday_end | time | Tuesday end |
| wednesday_start | time | Wednesday start |
| wednesday_end | time | Wednesday end |
| thursday_start | time | Thursday start |
| thursday_end | time | Thursday end |
| friday_start | time | Friday start |
| friday_end | time | Friday end |
| saturday_start | time | Saturday start |
| saturday_end | time | Saturday end |
| sunday_start | time | Sunday start |
| sunday_end | time | Sunday end |
| minimum_order_amount | decimal(10,2) | Min order |
| max_order_distance | int | Max delivery miles |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

### AvailabilityOverride

Day-specific availability overrides.

**Table:** `tbl_availability_overrides`
**Model:** `backend/app/Models/AvailabilityOverride.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| chef_id | int | FK → users |
| override_date | date | Date being overridden |
| start_time | time | Override start |
| end_time | time | Override end |
| status | enum | confirmed, modified, cancelled |
| source | enum | manual_toggle, reminder_confirmation |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

**Model Methods:**
```php
$override->isCancelled();        // Check if cancelled
$override->isAvailableAt($time); // Check time availability
$override->getStatusMessage();   // Human-readable status
```

**Scopes:**
```php
AvailabilityOverride::forChef($chefId)->get();
AvailabilityOverride::forDate('2026-01-20')->get();
AvailabilityOverride::inDateRange($start, $end)->get();
AvailabilityOverride::active()->get();
AvailabilityOverride::fromReminder()->get();
```

---

## Communication Models

### Reviews

Customer ratings and reviews.

**Table:** `tbl_reviews`
**Model:** `backend/app/Models/Reviews.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| order_id | int | FK → orders |
| from_user_id | int | FK → users (reviewer) |
| to_user_id | int | FK → users (chef) |
| rating | float | Rating (1-5) |
| review | text | Review text |
| tip_amount | decimal(10,2) | Tip with review |
| source | enum | customer, ai_generated |
| parent_review_id | int | FK → reviews (for AI) |
| ai_generation_params | json | AI generation metadata |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

**Relationships:**
```php
$review->parentReview();  // Original review for AI versions
$review->aiReviews();     // AI-generated variants
```

### Conversations

Chat messages between users.

**Table:** `tbl_conversations`
**Model:** `backend/app/Models/Conversations.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| order_id | int | FK → orders |
| from_user_id | int | FK → users (sender) |
| to_user_id | int | FK → users (recipient) |
| message | text | Message content |
| is_viewed | timestamp | When viewed (null=unread) |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

### Tickets

Customer support tickets.

**Table:** `tbl_tickets`
**Model:** `backend/app/Models/Tickets.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| user_id | int | FK → users |
| subject | varchar(255) | Ticket subject |
| message | text | Ticket message |
| status | enum | open, in_progress, resolved |
| assigned_to | int | FK → admins |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

---

## Reference Data Models

### Categories

Cuisine categories.

**Table:** `tbl_categories`
**Model:** `backend/app/Models/Categories.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| name | varchar(255) | Category name |
| status | tinyint | 1=Inactive, 2=Active |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

**Note:** Only categories with `status = 2` are shown to users.

### Allergens

Food allergens.

**Table:** `tbl_allergens`
**Model:** `backend/app/Models/Allergens.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| name | varchar(255) | Allergen name |
| status | tinyint | 1=Inactive, 2=Active |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

### Appliances

Kitchen equipment.

**Table:** `tbl_appliances`
**Model:** `backend/app/Models/Appliances.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| name | varchar(255) | Appliance name |
| status | tinyint | Active flag |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

### Zipcodes

Service area zip codes.

**Table:** `tbl_zipcodes`
**Model:** `backend/app/Models/Zipcodes.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| zipcode | varchar(10) | ZIP code |
| city | varchar(100) | City name |
| state | varchar(50) | State |
| delivery_fee | decimal(10,2) | Delivery fee |
| tax_rate | decimal(5,4) | Tax rate |
| is_active | tinyint | Active flag |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

---

## System Models

### Version

App version management.

**Table:** `tbl_versions`
**Model:** `backend/app/Models/Version.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| platform | enum | ios, android |
| version | varchar(20) | Version string |
| build_number | int | Build number |
| force_update | tinyint | Force update flag |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

### NotificationTemplates

Predefined notification messages.

**Table:** `tbl_notification_templates`
**Model:** `backend/app/Models/NotificationTemplates.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| type | varchar(100) | Template type |
| title | varchar(255) | Notification title |
| body | text | Notification body |
| created_at | timestamp | Created |
| updated_at | timestamp | Updated |

### PaymentMethodListener

Webhook event logging.

**Table:** `tbl_payment_method_listeners`
**Model:** `backend/app/Models/PaymentMethodListener.php`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| event_type | varchar(100) | Stripe event type |
| payload | json | Event payload |
| processed_at | timestamp | Processing time |
| created_at | timestamp | Created |

---

## Database Indexes

### Performance Indexes

```sql
-- Orders
CREATE INDEX idx_orders_status ON tbl_orders(status);
CREATE INDEX idx_orders_chef ON tbl_orders(chef_user_id);
CREATE INDEX idx_orders_customer ON tbl_orders(customer_user_id);
CREATE INDEX idx_orders_deadline ON tbl_orders(acceptance_deadline);
CREATE INDEX idx_orders_date ON tbl_orders(order_date_new);

-- Users (Chef Search)
CREATE INDEX idx_users_type ON tbl_users(user_type);
CREATE INDEX idx_users_pending ON tbl_users(is_pending);
CREATE INDEX idx_users_online ON tbl_users(is_online);
CREATE INDEX idx_users_location ON tbl_users(latitude, longitude);

-- Menus
CREATE INDEX idx_menus_chef ON tbl_menus(user_id);
CREATE INDEX idx_menus_live ON tbl_menus(is_live);

-- Availability Overrides
CREATE INDEX idx_overrides_chef_date ON tbl_availability_overrides(chef_id, override_date);
```

---

## Migrations

All migrations are in `backend/database/migrations/`. Key migrations:

| Migration | Purpose |
|-----------|---------|
| `2024_11_13_*_create_notifications_table` | Notifications system |
| `2025_12_02_*_add_cancellation_tracking` | Order cancellation fields |
| `2025_12_02_*_create_discount_codes` | Discount code tables |
| `2025_12_03_*_add_online_status` | Chef online status |
| `2025_12_04_*_create_availability_overrides` | Override system |
| `2026_01_08_*_add_order_datetime_fields` | Timezone-safe dates |
