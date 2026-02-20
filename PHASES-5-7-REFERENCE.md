# Admin Panel Phases 5-7 Reference Guide

Comprehensive analysis of existing Laravel admin controller methods and database tables for the admin panel rewrite (Phases 5-7).

---

## Phase 5: Menus + Customizations + Profiles

### 1. MENUS PAGE

#### Database Table: `tbl_menus`
```sql
CREATE TABLE `tbl_menus` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `price` double NOT NULL,
  `serving_size` int NOT NULL DEFAULT '1',
  `meals` varchar(50) NOT NULL,
  `category_ids` varchar(50) NOT NULL,
  `allergens` varchar(50) DEFAULT NULL,
  `appliances` varchar(50) DEFAULT NULL,
  `estimated_time` double NOT NULL,
  `is_live` tinyint NOT NULL DEFAULT '0',
  `created_at` varchar(50) NOT NULL,
  `updated_at` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb3;
```

#### Controller Method: `AdminController::menus()`
**Location:** `/Users/williamgroble/taist-mono/backend/app/Http/Controllers/Admin/AdminController.php` (lines 143-167)

**Query Logic:**
- Joins `tbl_menus` with `tbl_users` on `user_id`
- Selects: all menu fields + user email, first_name, last_name, photo
- Fetches all category/allergen/appliance lookups from their respective tables
- Parses comma-separated IDs and maps them to names

**Data Passed to View:**
```php
$data['menus']  // Array of menu objects with these fields:
  - id
  - user_id
  - title
  - description
  - price
  - serving_size
  - meals
  - category_ids (parsed → category_list->title)
  - allergens (parsed → allergen_list->title)
  - appliances (parsed → appliance_list->title)
  - estimated_time
  - is_live
  - created_at
  - updated_at
  - user_email
  - user_first_name
  - user_last_name
  - user_photo
```

#### Blade View: `admin/menus.blade.php`
**Columns Displayed:**
| Column | Source | Notes |
|--------|--------|-------|
| Menu item ID | `id` | Format: `MI0000001` |
| Chef email | `user_email` | User email |
| Chef name | `user_first_name` + `user_last_name` | Full name |
| Menu item | `title` | Menu title |
| Description | `description` | Text content |
| Price | `price` | Displayed as `$X.XX` |
| Serving size | `serving_size` | Numeric |
| Category | `category_list->title` | Parsed from `category_ids` |
| Required Appliances | `appliance_list->title` | Parsed from `appliances` |
| Allergens | `allergen_list->title` | Parsed from `allergens` |
| Estimated time | `estimated_time` | Displayed as `X minute(s)` |
| Available? | `is_live` | Boolean (0 or 1) |
| Created at | `created_at` | Timestamp |
| Actions | - | "Edit" button linking to `/admin/menus/{id}` |

#### Edit Form: `admin/menus_edit.blade.php`
**GET /admin/menus/{id} — Fetch for Edit**
- Controller method: `AdminController::editMenu()` (lines 176-183)
- Fetches single menu via: `Menus::where(['id'=>$id])->first()`
- Passes to view: `$data['menu']`

**Editable Fields:**
- `title` (textarea, 2 rows)
- `description` (textarea, 5 rows)

**POST /admin/menus/{id} — Update**
- Controller method: `AdminController::updateMenu()` (lines 185-189)
- Updates: `title`, `description`, `updated_at` (timestamp)
- Updates via: `Menus::where(['id'=>$id])->update([...])`
- Redirects to: `/admin/menus`

#### Mutation Endpoints
**Route:** `POST /admin/menus/{id}` → updateMenu()
**Parameters:**
- `title` (required)
- `description` (required)

**Response:** Redirects to list view (Blade template)

---

### 2. CUSTOMIZATIONS PAGE

#### Database Table: `tbl_customizations`
```sql
CREATE TABLE `tbl_customizations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `menu_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `upcharge_price` double NOT NULL,
  `created_at` varchar(50) DEFAULT NULL,
  `updated_at` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=157 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

#### Controller Method: `AdminController::customizations()`
**Location:** `/Users/williamgroble/taist-mono/backend/app/Http/Controllers/Admin/AdminController.php` (lines 191-199)

**Query Logic:**
- Joins `tbl_customizations` with `tbl_menus` on `menu_id`
- Selects: all customization fields + menu title

**Data Passed to View:**
```php
$data['customizations']  // Array of customization objects:
  - id
  - menu_id
  - name
  - upcharge_price
  - created_at
  - updated_at
  - menu_title
```

#### Blade View: `admin/customizations.blade.php`
**Columns Displayed:**
| Column | Source | Notes |
|--------|--------|-------|
| Customization ID | `id` | Format: `CUST0000001` |
| Menu item ID | `menu_id` | Format: `MI0000001` |
| Menu item | `menu_title` | Menu title |
| Customization | `name` | Customization name |
| Price | `upcharge_price` | Displayed as `$X.XX` |
| Created at | `created_at` | Timestamp |
| Actions | - | "Edit" button linking to `/admin/customizations/{id}` |

#### Edit Form: `admin/customizations_edit.blade.php`
**GET /admin/customizations/{id} — Fetch for Edit**
- Controller method: `AdminController::editCustomizations()` (lines 201-208)
- Fetches single customization via: `Customizations::where(['id'=>$id])->first()`
- Passes to view: `$data['customization']`

**Editable Fields:**
- `name` (textarea, 2 rows)

**POST /admin/customizations/{id} — Update**
- Controller method: `AdminController::updateCustomizations()` (lines 210-214)
- Updates: `name`, `updated_at` (timestamp)
- Updates via: `Customizations::where(['id'=>$id])->update([...])`
- Redirects to: `/admin/customizations`

#### Mutation Endpoints
**Route:** `POST /admin/customizations/{id}` → updateCustomizations()
**Parameters:**
- `name` (required)

**Response:** Redirects to list view

---

### 3. PROFILES PAGE

#### Database Tables:
**`tbl_users` + `tbl_availabilities`**

`tbl_users` (relevant fields):
```sql
id, first_name, last_name, email, user_type, is_pending, verified, created_at, updated_at
```

`tbl_availabilities` (full structure):
```sql
CREATE TABLE `tbl_availabilities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `bio` mediumtext,
  `monday_start` varchar(50) DEFAULT NULL,
  `monday_end` varchar(50) DEFAULT NULL,
  `tuesday_start` varchar(50) DEFAULT NULL,
  `tuesday_end` varchar(50) DEFAULT NULL,
  `wednesday_start` varchar(50) DEFAULT NULL,
  `wednesday_end` varchar(50) DEFAULT NULL,
  `thursday_start` varchar(50) DEFAULT NULL,
  `thursday_end` varchar(50) DEFAULT NULL,
  `friday_start` varchar(50) DEFAULT NULL,
  `friday_end` varchar(50) DEFAULT NULL,
  `saterday_start` varchar(50) DEFAULT NULL,
  `saterday_end` varchar(50) DEFAULT NULL,
  `sunday_start` varchar(50) DEFAULT NULL,
  `sunday_end` varchar(50) DEFAULT NULL,
  `minimum_order_amount` double DEFAULT NULL,
  `max_order_distance` double DEFAULT NULL,
  `created_at` varchar(50) NOT NULL,
  `updated_at` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

#### Controller Method: `AdminController::profiles()`
**Location:** `/Users/williamgroble/taist-mono/backend/app/Http/Controllers/Admin/AdminController.php` (lines 216-224)

**Query Logic:**
- Joins `tbl_users` with `tbl_availabilities`
- Filter: `user_type=2` (chefs), `is_pending=0`, `verified=1` (active verified chefs)
- Selects: all user fields + all availability fields

**Data Passed to View:**
```php
$data['profiles']  // Array of objects with:
  // From tbl_users:
  - id
  - first_name
  - last_name
  - email
  - phone
  - birthday
  - address
  - city
  - state
  - zip
  - verified
  - created_at
  
  // From tbl_availabilities:
  - bio
  - monday_start, monday_end
  - tuesday_start, tuesday_end
  - wednesday_start, wednesday_end
  - thursday_start, thursday_end
  - friday_start, friday_end
  - saterday_start, saterday_end
  - sunday_start, sunday_end
  - minimum_order_amount
  - max_order_distance
```

#### Blade View: `admin/profiles.blade.php`
**Columns Displayed:**
| Column | Source | Notes |
|--------|--------|-------|
| Chef ID | `id` | Format: `CHEF0000001` |
| Chef email | `email` | User email |
| Chef name | `first_name` + `last_name` | Full name |
| Bio | `bio` | Text content |
| Monday | `monday_start` + `monday_end` | Format: `HH:MM - HH:MM` |
| Tuesday | `tuesday_start` + `tuesday_end` | Format: `HH:MM - HH:MM` |
| Wednesday | `wednesday_start` + `wednesday_end` | Format: `HH:MM - HH:MM` |
| Thursday | `thursday_start` + `thursday_end` | Format: `HH:MM - HH:MM` |
| Friday | `friday_start` + `friday_end` | Format: `HH:MM - HH:MM` |
| Saturday | `saterday_start` + `saterday_end` | Format: `HH:MM - HH:MM` |
| Sunday | `sunday_start` + `sunday_end` | Format: `HH:MM - HH:MM` |
| Min Order Amount | `minimum_order_amount` | Numeric |
| Max Order Distance | `max_order_distance` | Numeric |
| Created at | `created_at` | Timestamp |
| Actions | - | "Edit" button linking to `/admin/profiles/{id}` |

**Time Format Note:** Times are stored as either:
- `HH:MM` string (modern format, e.g., "09:00")
- Unix timestamp (legacy format, converted with `date('H:i', $timestamp)`)

The blade view includes a helper function to handle both formats.

#### Edit Form: `admin/profiles_edit.blade.php`
**GET /admin/profiles/{id} — Fetch for Edit**
- Controller method: `AdminController::editProfiles()` (lines 226-233)
- Fetches single availability record via: `Availabilities::where(['user_id'=>$id])->first()`
- Passes to view: `$data['profile']`

**Editable Fields:**
- `bio` (textarea, 5 rows)

**POST /admin/profiles/{id} — Update**
- Controller method: `AdminController::updateProfiles()` (lines 235-239)
- Updates: `bio`, `updated_at` (timestamp)
- Updates via: `Availabilities::where(['id'=>$id])->update([...])`
- Redirects to: `/admin/profiles`

#### Mutation Endpoints
**Route:** `POST /admin/profiles/{id}` → updateProfiles()
**Parameters:**
- `bio` (required)

**Response:** Redirects to list view

---

## Phase 6: Chats + Reviews + Transactions (Read-Only)

### 4. CHATS PAGE

#### Database Table: `tbl_conversations`
```sql
CREATE TABLE `tbl_conversations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL DEFAULT '0',
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `message` text NOT NULL,
  `is_viewed` tinyint NOT NULL DEFAULT '0',
  `created_at` varchar(50) NOT NULL,
  `updated_at` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

#### Controller Method: `AdminController::chats()`
**Location:** `/Users/williamgroble/taist-mono/backend/app/Http/Controllers/Admin/AdminController.php` (lines 263-271)

**Query Logic:**
- Joins `tbl_conversations` with `tbl_users` twice (for from_user and to_user)
- Alias `f` = from_user, alias `t` = to_user
- Selects: all conversation fields + both user's names/emails

**Data Passed to View:**
```php
$data['chats']  // Array of conversation objects:
  - id
  - order_id
  - from_user_id
  - to_user_id
  - message
  - is_viewed
  - created_at
  - updated_at
  - from_user_email
  - from_first_name
  - from_last_name
  - to_user_email
  - to_first_name
  - to_last_name
```

#### Blade View: `admin/chats.blade.php`
**Columns Displayed:**
| Column | Source | Notes |
|--------|--------|-------|
| Chat ID | `id` | Format: `CHAT0000001` |
| Order ID | `order_id` | Format: `ORDER0000001` |
| Recipient Name | `to_first_name` + `to_last_name` | Full name of recipient |
| Recipient Email | `to_user_email` | Email |
| Sender Name | `from_first_name` + `from_last_name` | Full name of sender |
| Sender Email | `from_user_email` | Email |
| Message | `message` | Full message text |
| Created at | `created_at` | Timestamp |

**Mutations:** None (read-only list)

---

### 5. REVIEWS PAGE

#### Database Table: `tbl_reviews`
```sql
CREATE TABLE `tbl_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `rating` double NOT NULL,
  `review` text,
  `tip_amount` decimal(8,2) NOT NULL DEFAULT '0.00',
  `created_at` varchar(50) NOT NULL,
  `updated_at` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=329 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

#### Controller Method: `AdminController::reviews()`
**Location:** `/Users/williamgroble/taist-mono/backend/app/Http/Controllers/Admin/AdminController.php` (lines 312-320)

**Query Logic:**
- Joins `tbl_reviews` with `tbl_users` twice (for from_user and to_user)
- Selects: all review fields + both user emails

**Data Passed to View:**
```php
$data['reviews']  // Array of review objects:
  - id
  - order_id
  - from_user_id
  - to_user_id
  - rating
  - review
  - tip_amount
  - created_at
  - updated_at
  - from_user_email
  - to_user_email
```

#### Blade View: `admin/reviews.blade.php`
**Columns Displayed:**
| Column | Source | Notes |
|--------|--------|-------|
| Review ID | `id` | Format: `R0000001` |
| Customer | `from_user_email` | Reviewer email |
| Chef | `to_user_email` | Reviewed chef email |
| Rating | `rating` | Numeric (1-5, can be fractional) |
| Review | `review` | Review text content |
| Tip amount | `tip_amount` | Displayed as `$X.XX` |
| Created at | `created_at` | Timestamp |

**Mutations:** None (read-only list)

---

### 6. TRANSACTIONS PAGE

#### Database Table: `tbl_transactions`
```sql
CREATE TABLE `tbl_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `amount` double NOT NULL,
  `notes` varchar(100) DEFAULT NULL,
  `created_at` varchar(50) NOT NULL,
  `updated_at` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

#### Controller Method: `AdminController::transactions()`
**Location:** `/Users/williamgroble/taist-mono/backend/app/Http/Controllers/Admin/AdminController.php` (lines 332-339)

**Query Logic:**
- Simply fetches all transactions via: `Transactions::get()`
- No joins (user names/emails not included)

**Data Passed to View:**
```php
$data['transactions']  // Array of transaction objects:
  - id
  - order_id
  - from_user_id
  - to_user_id
  - amount
  - notes
  - created_at
  - updated_at
```

#### Blade View: `admin/transactions.blade.php`
**Columns Displayed:**
| Column | Source | Notes |
|--------|--------|-------|
| Transaction ID | `id` | Format: `X0000001` |
| Customer | `from_user_id` | User ID (raw, no name) |
| Chef | `to_user_id` | User ID (raw, no name) |
| Amount | `amount` | Displayed as numeric value |
| Created at | `created_at` | Timestamp |

**Note:** Blade view has bug — loops over `$chefs` instead of `$transactions`

**Mutations:** None (read-only list)

---

## Phase 7: Zipcodes + Discount Codes

### 7. ZIPCODES PAGE

#### Database Table: `tbl_zipcodes`
```sql
CREATE TABLE `tbl_zipcodes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `zipcodes` text,
  `created_at` varchar(50) NOT NULL,
  `updated_at` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

#### Controller Method: `AdminController::zipcodes()`
**Location:** `/Users/williamgroble/taist-mono/backend/app/Http/Controllers/Admin/AdminController.php` (lines 341-348)

**Query Logic:**
- Fetches first (and only) zipcode record: `Zipcodes::first()`

**Data Passed to View:**
```php
$data['zipcodes']  // Single object:
  - id
  - zipcodes  // Comma-separated string (e.g., "92101,92102,92103")
  - created_at
  - updated_at
```

#### Blade View: `admin/zipcodes.blade.php`
**Form Fields:**
| Field | Source | Type | Notes |
|-------|--------|------|-------|
| Zipcodes | `zipcodes` | textarea (5 rows) | Comma-separated list |

**Form Action:** `POST /admin/zipcodes`

#### Mutation Endpoints
**Route:** `POST /admin/zipcodes` → updateZipcodes()

**POST /admin/zipcodes — Update**
- Controller method: `AdminController::updateZipcodes()` (lines 350-369)
- Parameters: `zipcodes` (comma-separated string)
- Logic:
  - Parses old zipcodes from DB
  - Parses new zipcodes from input
  - Finds newly added zipcodes using `array_diff`
  - Updates DB: `update(['zipcodes'=>$request->zipcodes, 'updated_at'=>time()])`
  - If new zips added: calls `notifyUsersAboutNewZipcodes($addedZipcodes)`
- Redirects to: `/admin/zipcodes`

**Firebase Notification Logic** (lines 371-432):
- Queries for customers (`user_type=1`) in newly added zipcodes
- Sends Firebase Cloud Messaging notification to each customer's `fcm_token`
- Logs notification records to `notifications` table
- Daily cron cleanup via `php artisan verify:accounts cleanup --max-age=120`

---

### 8. DISCOUNT CODES PAGE

#### Database Tables:
**`tbl_discount_codes`**
```sql
CREATE TABLE `tbl_discount_codes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) UNIQUE,
  `description` varchar(255) nullable,
  
  // Discount Configuration
  `discount_type` enum('fixed', 'percentage') DEFAULT 'fixed',
  `discount_value` decimal(10, 2),
  
  // Usage Limits
  `max_uses` integer nullable,
  `max_uses_per_customer` integer DEFAULT 1,
  `current_uses` integer DEFAULT 0,
  
  // Validity Period
  `valid_from` timestamp nullable,
  `valid_until` timestamp nullable,
  
  // Constraints
  `minimum_order_amount` decimal(10, 2) nullable,
  `maximum_discount_amount` decimal(10, 2) nullable,
  
  // Status
  `is_active` boolean DEFAULT true,
  
  // Metadata
  `created_by_admin_id` unsigned bigint nullable,
  `created_at` timestamp,
  `updated_at` timestamp,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY (`code`),
  INDEX (`is_active`, `valid_from`, `valid_until`),
  INDEX (`created_by_admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**`tbl_discount_code_usage`**
```sql
CREATE TABLE `tbl_discount_code_usage` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `discount_code_id` unsigned bigint,
  `order_id` unsigned bigint,
  `customer_user_id` unsigned bigint,
  `discount_amount` decimal(10, 2),
  `order_total_before_discount` decimal(10, 2),
  `order_total_after_discount` decimal(10, 2),
  `used_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  INDEX (`discount_code_id`),
  INDEX (`order_id`),
  INDEX (`customer_user_id`),
  FOREIGN KEY (`discount_code_id`) REFERENCES `tbl_discount_codes`(id) ON DELETE CASCADE,
  FOREIGN KEY (`order_id`) REFERENCES `tbl_orders`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

#### Controller Methods:

**GET /admin/discount-codes — discountCodes()**
**Location:** Lines 551-560

**Query Logic:**
- Fetches all discount codes ordered by `created_at DESC`
- Via: `DiscountCodes::orderBy('created_at', 'desc')->get()`

**Data Passed to View:**
```php
$data['codes']  // Array of DiscountCodes objects:
  - id
  - code
  - description
  - discount_type
  - discount_value
  - max_uses
  - max_uses_per_customer
  - current_uses
  - valid_from
  - valid_until
  - minimum_order_amount
  - maximum_discount_amount
  - is_active
  - created_by_admin_id
  - created_at
  - updated_at
```

**POST /admin/discount-codes — createDiscountCode()**
**Location:** Lines 562-585

**Parameters (JSON):**
- `code` (required, string, max 50, unique)
- `discount_type` (required, enum: 'fixed' | 'percentage')
- `discount_value` (required, decimal, min 0)
- `description` (optional, string)
- `max_uses` (optional, integer)
- `max_uses_per_customer` (optional, integer, default 1)
- `valid_from` (optional, datetime)
- `valid_until` (optional, datetime)
- `minimum_order_amount` (optional, decimal)
- `maximum_discount_amount` (optional, decimal)

**Response:** JSON
```json
{
  "success": 1,
  "data": { ... created code object ... }
}
```

**PUT /admin/discount-codes/{id} — updateDiscountCode()**
**Location:** Lines 587-602

**Parameters (JSON):**
- `description` (optional)
- `max_uses` (optional)
- `max_uses_per_customer` (optional)
- `valid_from` (optional)
- `valid_until` (optional)
- `minimum_order_amount` (optional)
- `maximum_discount_amount` (optional)

**Note:** Cannot update code, discount_type, or discount_value

**Response:** JSON
```json
{
  "success": 1,
  "data": { ... updated code object ... }
}
```

**POST /admin/discount-codes/{id}/deactivate — deactivateDiscountCode()**
**Location:** Lines 604-609

**Response:** JSON
```json
{
  "success": 1,
  "message": "Code deactivated successfully"
}
```

**POST /admin/discount-codes/{id}/activate — activateDiscountCode()**
**Location:** Lines 611-616

**Response:** JSON
```json
{
  "success": 1,
  "message": "Code activated successfully"
}
```

**GET /admin/discount-codes/{id}/usage — viewDiscountCodeUsage()**
**Location:** Lines 618-635

**Query Logic:**
- Fetches discount code by ID
- Joins usage records with users and orders
- Selects: usage fields + customer name/email + order status

**Response:** JSON
```json
{
  "success": 1,
  "data": {
    "code": { ... code object ... },
    "usages": [
      {
        "id": 1,
        "discount_code_id": 1,
        "order_id": 123,
        "customer_user_id": 45,
        "discount_amount": "5.00",
        "order_total_before_discount": "45.00",
        "order_total_after_discount": "40.00",
        "used_at": "2025-12-15 10:30:00",
        "customer_first_name": "John",
        "customer_last_name": "Doe",
        "customer_email": "john@example.com",
        "order_status": 3
      }
    ]
  }
}
```

#### Blade View: `admin/discount_codes.blade.php`
**Columns Displayed in Table:**
| Column | Source | Notes |
|--------|--------|-------|
| Code | `code` | Bold, with description below if present |
| Type | `discount_type` | Badge: "Fixed Amount" or "Percentage" |
| Value | `discount_value` | Formatted as `$X.XX` (fixed) or `X%` (percentage) |
| Uses | `current_uses` / `max_uses` | Format: `current / max` or `current / ∞` |
| Valid Until | `valid_until` | Format: `M dd, Y` or "Never" |
| Status | `is_active` | Badge: "Active" or "Inactive" |
| Actions | - | "View Usage", "Edit", "Deactivate"/"Activate" buttons |

**Action Buttons:**
1. **View Usage** — Fetches `/admin/discount-codes/{id}/usage` and displays modal
2. **Edit** — Opens modal with mutable fields (shown as alert in current implementation)
3. **Deactivate/Activate** — Calls respective endpoints

#### DiscountCodes Model Helper Methods
**Location:** `/Users/williamgroble/taist-mono/backend/app/Models/DiscountCodes.php`

**Key Methods:**
- `isValid()` — Checks if code is currently valid (active + within date range + not max uses reached)
- `canCustomerUse($customerId)` — Checks if specific customer can use code (customer-specific usage limit)
- `calculateDiscount($orderAmount)` — Calculates discount amount and final order total
- `incrementUsage()` — Increments `current_uses` counter
- `getFormattedDiscount()` — Returns display string like "$5.00 off" or "10% off"
- `scopeActive()` — Query scope to filter only active codes
- `scopeCurrentlyValid()` — Query scope to filter codes active + within valid date range

---

## Summary Table: Phase 5-7 Routes

| HTTP Method | Route | Controller Method | Purpose |
|-------------|-------|------------------|---------|
| GET | `/admin/menus` | `menus()` | List all menus |
| GET | `/admin/menus/{id}` | `editMenu()` | Fetch menu for edit |
| POST | `/admin/menus/{id}` | `updateMenu()` | Update menu (title, description) |
| GET | `/admin/customizations` | `customizations()` | List all customizations |
| GET | `/admin/customizations/{id}` | `editCustomizations()` | Fetch customization for edit |
| POST | `/admin/customizations/{id}` | `updateCustomizations()` | Update customization (name) |
| GET | `/admin/profiles` | `profiles()` | List all active verified chefs |
| GET | `/admin/profiles/{id}` | `editProfiles()` | Fetch profile for edit |
| POST | `/admin/profiles/{id}` | `updateProfiles()` | Update profile (bio) |
| GET | `/admin/chats` | `chats()` | List all conversations (read-only) |
| GET | `/admin/reviews` | `reviews()` | List all reviews (read-only) |
| GET | `/admin/transactions` | `transactions()` | List all transactions (read-only) |
| GET | `/admin/zipcodes` | `zipcodes()` | Display zipcodes form |
| POST | `/admin/zipcodes` | `updateZipcodes()` | Update zipcodes + send notifications |
| GET | `/admin/discount-codes` | `discountCodes()` | List all discount codes |
| POST | `/admin/discount-codes` | `createDiscountCode()` | Create new discount code (JSON) |
| PUT | `/admin/discount-codes/{id}` | `updateDiscountCode()` | Update discount code fields (JSON) |
| POST | `/admin/discount-codes/{id}/deactivate` | `deactivateDiscountCode()` | Deactivate code (JSON) |
| POST | `/admin/discount-codes/{id}/activate` | `activateDiscountCode()` | Activate code (JSON) |
| GET | `/admin/discount-codes/{id}/usage` | `viewDiscountCodeUsage()` | Get usage history (JSON) |

---

## Database Summary

### Phase 5 Tables
- `tbl_menus` — 133 records, stores menu items
- `tbl_customizations` — 157 records, stores add-ons/extras per menu
- `tbl_availabilities` — 107 records, stores chef availability schedules + bio

### Phase 6 Tables
- `tbl_conversations` — 106 records, stores chat messages between users
- `tbl_reviews` — 329 records, stores ratings + reviews + tips
- `tbl_transactions` — 2 records, stores payment transactions

### Phase 7 Tables
- `tbl_zipcodes` — 2 records (only 1 active), stores comma-separated service zipcodes
- `tbl_discount_codes` — NEW (migration created), stores discount code definitions
- `tbl_discount_code_usage` — NEW (migration created), tracks which customers used which codes

---

## Implementation Notes for React/Admin API V2

1. **Menus Edit Form:**
   - GET `/admin-api-v2/menus/:id` should return menu fields
   - PUT `/admin-api-v2/menus/:id` should accept `{title, description}`

2. **Customizations Edit Form:**
   - GET `/admin-api-v2/customizations/:id` should return customization fields
   - PUT `/admin-api-v2/customizations/:id` should accept `{name}`

3. **Profiles Edit Form:**
   - GET `/admin-api-v2/profiles/:id` should return availability record with bio
   - PUT `/admin-api-v2/profiles/:id` should accept `{bio}`

4. **Time Format in Profiles:**
   - Need to handle both `HH:MM` strings and legacy Unix timestamps
   - Convert to consistent format in API response

5. **Zipcodes:**
   - GET `/admin-api-v2/zipcodes` returns single record with `zipcodes` field
   - PUT `/admin-api-v2/zipcodes` accepts `{zipcodes}` and triggers Firebase notifications

6. **Discount Codes:**
   - Full CRUD + special action endpoints
   - Model includes helper methods for validation/calculation
   - Usage tracking in separate table

7. **Transactions Bug:**
   - Current blade view uses wrong variable (`$chefs` instead of `$transactions`)
   - API response should include user join data (names/emails)
