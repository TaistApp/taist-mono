# Quick Admin Setup Guide

## Create Admin User (Fastest Method)

### Option 1: Using Seeder (Recommended)

```bash
php artisan db:seed --class=AdminSeeder
```

**Default credentials:**
- Email: `admin@taist.com`
- Password: `admin123`

⚠️ **Change the password immediately in production!**

### Option 2: Using Laravel Tinker

```bash
php artisan tinker
```

Then run:
```php
use App\Models\Admins;
use Illuminate\Support\Str;

Admins::create([
    'first_name' => 'Admin',
    'last_name' => 'User',
    'email' => 'admin@taist.com',
    'password' => 'admin123',
    'active' => 1,
    'api_token' => uniqid() . Str::random(60),
    'created_at' => (string)time(),
    'updated_at' => (string)time(),
]);
```

### Option 3: Direct SQL

```sql
INSERT INTO tbl_admins (first_name, last_name, email, password, active, api_token, created_at, updated_at)
VALUES (
    'Admin',
    'User',
    'admin@taist.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- This is 'password' hashed
    1,
    CONCAT(UNIX_TIMESTAMP(), SUBSTRING(MD5(RAND()), 1, 60)),
    UNIX_TIMESTAMP(),
    UNIX_TIMESTAMP()
);
```

**To generate a hashed password:**
```bash
php artisan tinker
```
```php
bcrypt('your-password-here')
```

## Login

1. Navigate to: `http://your-domain.com/admin/login`
2. Enter email and password
3. You'll be redirected to `/admin/chefs` on success

## Troubleshooting

**Can't login?**
- Check if user exists: `SELECT * FROM tbl_admins WHERE email = 'admin@taist.com';`
- Check if active: `SELECT email, active FROM tbl_admins WHERE email = 'admin@taist.com';` (must be `1`)
- Reset password in tinker:
  ```php
  $admin = Admins::where('email', 'admin@taist.com')->first();
  $admin->password = 'new-password';
  $admin->save();
  ```

## For Railway Deployment

```bash
# Connect to Railway
railway connect

# Run seeder
php artisan db:seed --class=AdminSeeder
```

Or use Railway's SQL console to run the SQL insert directly.







