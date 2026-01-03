# Admin User Creation Guide

This guide explains how to create admin users for the Taist admin dashboard.

## Table Structure

Admin users are stored in the `tbl_admins` table with the following structure:

```sql
CREATE TABLE `tbl_admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(255) NOT NULL DEFAULT '',
  `last_name` varchar(255) NOT NULL DEFAULT '',
  `email` varchar(255) NOT NULL DEFAULT '',
  `password` varchar(255) NOT NULL DEFAULT '',
  `active` tinyint NOT NULL DEFAULT '1',
  `api_token` varchar(255) NOT NULL DEFAULT '',
  `remember_token` varchar(255) NOT NULL DEFAULT '',
  `login_location` varchar(255) DEFAULT '',
  `created_at` varchar(255) NOT NULL DEFAULT '',
  `updated_at` varchar(100) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
);
```

## Methods to Create Admin Users

### Method 1: Using Database Seeder (Recommended)

1. **Run the AdminSeeder:**
   ```bash
   php artisan db:seed --class=AdminSeeder
   ```

   This will create a default admin user:
   - **Email:** `admin@taist.com`
   - **Password:** `admin123`
   - **Status:** Active

2. **To add more admin users**, edit `backend/database/seeds/AdminSeeder.php` and add additional users, then run the seeder again.

### Method 2: Using Laravel Tinker

1. **Open Laravel Tinker:**
   ```bash
   php artisan tinker
   ```

2. **Create an admin user:**
   ```php
   use App\Models\Admins;
   use Illuminate\Support\Str;

   $admin = Admins::create([
       'first_name' => 'John',
       'last_name' => 'Doe',
       'email' => 'john.admin@taist.com',
       'password' => 'your-secure-password', // Will be automatically hashed
       'active' => 1,
       'api_token' => uniqid() . Str::random(60),
       'created_at' => now(),
       'updated_at' => now(),
   ]);
   ```

   **Note:** The `password` field will be automatically hashed by the `Admins` model's mutator.

### Method 3: Direct SQL Insert

**⚠️ Warning:** Make sure to hash the password properly!

1. **Generate a hashed password** using PHP or Laravel:
   ```php
   // In Laravel Tinker:
   bcrypt('your-password-here')
   // Or in PHP:
   password_hash('your-password-here', PASSWORD_BCRYPT)
   ```

2. **Insert into database:**
   ```sql
   INSERT INTO `tbl_admins` (
       `first_name`, 
       `last_name`, 
       `email`, 
       `password`, 
       `active`, 
       `api_token`, 
       `created_at`, 
       `updated_at`
   ) VALUES (
       'John',
       'Doe',
       'john.admin@taist.com',
       '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Replace with your hashed password
       1,
       CONCAT(UNIX_TIMESTAMP(), SUBSTRING(MD5(RAND()), 1, 60)), -- Generate API token
       UNIX_TIMESTAMP(),
       UNIX_TIMESTAMP()
   );
   ```

### Method 4: Using Artisan Command (Custom)

You can create a custom artisan command for creating admin users. Example:

```php
php artisan make:command CreateAdminUser
```

Then implement the command to prompt for admin details and create the user.

## Important Fields

- **`email`**: Must be unique. Used for login.
- **`password`**: Will be automatically hashed by the `Admins` model mutator if using Eloquent.
- **`active`**: Set to `1` for active users, `0` to deactivate.
- **`api_token`**: Used for API authentication. Generate a unique token.
- **`first_name`** and **`last_name`**: Display name for the admin.

## Authentication

Admin users authenticate using:
- **Guard:** `admin` (configured in `config/auth.php`)
- **Model:** `App\Models\Admins`
- **Table:** `tbl_admins`
- **Login Route:** `/admin/login`
- **Dashboard Route:** `/admin/chefs` (redirects after login)

## Login Process

1. Navigate to `/admin/login`
2. Enter email and password
3. System checks:
   - Credentials match
   - User exists
   - `active` field is `1`
4. On success, redirects to `/admin/chefs`

## Security Notes

1. **Always use strong passwords** for admin accounts
2. **Change default passwords** immediately after creation
3. **Set `active = 0`** to disable admin accounts instead of deleting them
4. **Rotate API tokens** periodically for security
5. **Use environment-specific credentials** (different passwords for dev/staging/prod)

## Troubleshooting

### Admin can't login

1. **Check if user exists:**
   ```sql
   SELECT * FROM tbl_admins WHERE email = 'admin@taist.com';
   ```

2. **Check if account is active:**
   ```sql
   SELECT email, active FROM tbl_admins WHERE email = 'admin@taist.com';
   ```
   Must have `active = 1`

3. **Reset password** (if needed):
   ```php
   // In Laravel Tinker:
   $admin = Admins::where('email', 'admin@taist.com')->first();
   $admin->password = 'new-password';
   $admin->save();
   ```

### Password not working

- The `Admins` model automatically hashes passwords when using Eloquent
- If inserting via SQL, make sure password is properly hashed
- Use `bcrypt()` or `password_hash()` to generate hashed passwords

## Example: Creating Admin for Railway Deployment

For Railway production/staging:

1. **Via Railway CLI or Dashboard:**
   ```bash
   # Connect to Railway database
   railway connect
   
   # Run seeder
   php artisan db:seed --class=AdminSeeder
   ```

2. **Or via SQL directly:**
   ```sql
   -- Get hashed password first (run in Laravel Tinker locally)
   -- Then use that hash in Railway SQL console
   INSERT INTO tbl_admins (first_name, last_name, email, password, active, api_token, created_at, updated_at)
   VALUES ('Admin', 'User', 'admin@taist.com', '$2y$10$...', 1, CONCAT(UNIX_TIMESTAMP(), SUBSTRING(MD5(RAND()), 1, 60)), UNIX_TIMESTAMP(), UNIX_TIMESTAMP());
   ```

## Quick Reference

**Default Admin (from seeder):**
- Email: `admin@taist.com`
- Password: `admin123`
- ⚠️ **Change this password immediately in production!**

**Model:** `App\Models\Admins`  
**Table:** `tbl_admins`  
**Guard:** `admin`  
**Login URL:** `/admin/login`







