<?php

/**
 * Seed 5 Test Chefs Near Zip 46038 (Fishers / Indianapolis, IN)
 *
 * Creates chefs specializing in: Indian, Italian, Latin American, Vegetarian, Asian
 * Each has full weekly availability and 3 live menu items.
 *
 * Run: php seed_test_chefs_indy.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Listener;
use App\Models\Availabilities;
use App\Models\Menus;
use Illuminate\Support\Facades\DB;

$timestamp = date('Y-m-d H:i:s');

// Ensure categories exist (find or create)
$categoryNames = ['Indian', 'Italian', 'Latin American', 'Vegetarian', 'Asian'];
$categoryMap = [];
foreach ($categoryNames as $name) {
    $cat = DB::table('tbl_categories')->where('name', $name)->first();
    if (!$cat) {
        $catId = DB::table('tbl_categories')->insertGetId([
            'name' => $name,
            'chef_id' => 0,
            'menu_id' => 0,
            'status' => 2, // Approved
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ]);
        echo "Created category: {$name} (ID: {$catId})\n";
        $categoryMap[$name] = $catId;
    } else {
        // Ensure it's approved
        if ($cat->status != 2) {
            DB::table('tbl_categories')->where('id', $cat->id)->update(['status' => 2]);
        }
        $categoryMap[$name] = $cat->id;
        echo "Found category: {$name} (ID: {$cat->id})\n";
    }
}

// Locations near Fishers, IN (46038) — all within 15 miles
$chefs = [
    [
        'email' => 'chef.indian@taist.test',
        'first_name' => 'Priya',
        'last_name' => 'Sharma',
        'bio' => 'Bringing authentic North Indian flavors to your kitchen. Specializing in tandoori, curries, and homemade naan.',
        'address' => '8505 E 116th St',
        'city' => 'Fishers',
        'state' => 'IN',
        'zip' => '46038',
        'latitude' => '39.9553',
        'longitude' => '-86.0135',
        'category' => 'Indian',
        'menus' => [
            ['title' => 'Butter Chicken', 'description' => 'Tender chicken in a rich, creamy tomato sauce with aromatic spices. Served with basmati rice.', 'price' => 18.00, 'allergens' => '2'],
            ['title' => 'Lamb Biryani', 'description' => 'Fragrant basmati rice layered with spiced lamb, caramelized onions, and saffron.', 'price' => 22.00, 'allergens' => ''],
            ['title' => 'Samosa Platter', 'description' => 'Crispy pastry pockets filled with spiced potatoes and peas, served with mint and tamarind chutneys.', 'price' => 12.00, 'allergens' => '1'],
        ],
    ],
    [
        'email' => 'chef.italian@taist.test',
        'first_name' => 'Marco',
        'last_name' => 'Rossi',
        'bio' => 'Third-generation Italian chef. Handmade pasta, wood-fired flavors, and recipes passed down through generations.',
        'address' => '1 N Meridian St',
        'city' => 'Carmel',
        'state' => 'IN',
        'zip' => '46032',
        'latitude' => '39.9784',
        'longitude' => '-86.1260',
        'category' => 'Italian',
        'menus' => [
            ['title' => 'Handmade Fettuccine Alfredo', 'description' => 'Fresh egg pasta tossed in a velvety parmesan cream sauce with cracked black pepper.', 'price' => 20.00, 'allergens' => '1,2,3'],
            ['title' => 'Chicken Parmigiana', 'description' => 'Crispy breaded chicken topped with marinara and melted mozzarella, served over spaghetti.', 'price' => 22.00, 'allergens' => '1,2,3'],
            ['title' => 'Bruschetta Trio', 'description' => 'Toasted ciabatta with classic tomato-basil, whipped ricotta and honey, and olive tapenade.', 'price' => 14.00, 'allergens' => '1,2'],
        ],
    ],
    [
        'email' => 'chef.latin@taist.test',
        'first_name' => 'Sofia',
        'last_name' => 'Ramirez',
        'bio' => 'Latin American comfort food with a modern twist. From street tacos to slow-braised meats, every dish tells a story.',
        'address' => '200 S Rangeline Rd',
        'city' => 'Carmel',
        'state' => 'IN',
        'zip' => '46032',
        'latitude' => '39.9660',
        'longitude' => '-86.1080',
        'category' => 'Latin American',
        'menus' => [
            ['title' => 'Carnitas Tacos', 'description' => 'Slow-braised pork shoulder with cilantro, pickled onion, and salsa verde on corn tortillas.', 'price' => 16.00, 'allergens' => ''],
            ['title' => 'Chicken Empanadas', 'description' => 'Golden hand pies filled with seasoned chicken, peppers, and cheese. Served with chimichurri.', 'price' => 14.00, 'allergens' => '1,2'],
            ['title' => 'Cuban Black Beans and Rice', 'description' => 'Slow-simmered black beans with sofrito, served over cilantro-lime rice with fried plantains.', 'price' => 13.00, 'allergens' => ''],
        ],
    ],
    [
        'email' => 'chef.veg@taist.test',
        'first_name' => 'Ava',
        'last_name' => 'Green',
        'bio' => 'Plant-forward cooking that does not compromise on flavor. Seasonal, colorful, and deeply satisfying.',
        'address' => '11501 N Meridian St',
        'city' => 'Carmel',
        'state' => 'IN',
        'zip' => '46032',
        'latitude' => '39.9420',
        'longitude' => '-86.1560',
        'category' => 'Vegetarian',
        'menus' => [
            ['title' => 'Roasted Cauliflower Steak', 'description' => 'Thick-cut cauliflower roasted with harissa, served over whipped tahini with pomegranate seeds.', 'price' => 17.00, 'allergens' => ''],
            ['title' => 'Wild Mushroom Risotto', 'description' => 'Creamy arborio rice with a mix of shiitake, oyster, and cremini mushrooms finished with truffle oil.', 'price' => 19.00, 'allergens' => '2'],
            ['title' => 'Mediterranean Grain Bowl', 'description' => 'Farro, roasted vegetables, feta, hummus, and lemon-herb dressing.', 'price' => 15.00, 'allergens' => '1,2'],
        ],
    ],
    [
        'email' => 'chef.asian@taist.test',
        'first_name' => 'Jun',
        'last_name' => 'Chen',
        'bio' => 'Pan-Asian flavors from wok to plate. Specializing in Chinese, Thai, and Japanese home cooking.',
        'address' => '9702 E Washington St',
        'city' => 'Indianapolis',
        'state' => 'IN',
        'zip' => '46229',
        'latitude' => '39.9330',
        'longitude' => '-86.0340',
        'category' => 'Asian',
        'menus' => [
            ['title' => 'Pad Thai', 'description' => 'Rice noodles stir-fried with shrimp, egg, bean sprouts, and peanuts in a tamarind sauce.', 'price' => 17.00, 'allergens' => '3,4,8'],
            ['title' => 'General Tso Chicken', 'description' => 'Crispy chicken in a sweet and spicy glaze with steamed broccoli and jasmine rice.', 'price' => 16.00, 'allergens' => '1,6'],
            ['title' => 'Veggie Spring Rolls', 'description' => 'Fresh rice paper rolls with vermicelli, herbs, cucumber, and peanut dipping sauce.', 'price' => 11.00, 'allergens' => '4'],
        ],
    ],
];

echo "\n";

foreach ($chefs as $chefData) {
    $existing = Listener::where('email', $chefData['email'])->first();
    if ($existing) {
        echo "Chef {$chefData['email']} already exists (ID: {$existing->id}), skipping.\n";
        continue;
    }

    // Create user
    $chef = Listener::create([
        'first_name' => $chefData['first_name'],
        'last_name' => $chefData['last_name'],
        'email' => $chefData['email'],
        'password' => bcrypt('taist2026'),
        'phone' => '+1317' . str_pad((string) rand(0, 9999999), 7, '0', STR_PAD_LEFT),
        'bio' => $chefData['bio'],
        'address' => $chefData['address'],
        'city' => $chefData['city'],
        'state' => $chefData['state'],
        'zip' => $chefData['zip'],
        'latitude' => $chefData['latitude'],
        'longitude' => $chefData['longitude'],
        'user_type' => 2,
        'is_pending' => 0,
        'verified' => 1,
        'quiz_completed' => 1,
        'api_token' => \Illuminate\Support\Str::random(60),
        'created_at' => $timestamp,
        'updated_at' => $timestamp,
    ]);

    echo "Created chef: {$chefData['first_name']} {$chefData['last_name']} ({$chefData['category']}) - ID: {$chef->id}\n";

    // Create availability - all 7 days
    DB::table('tbl_availabilities')->insert([
        'user_id' => $chef->id,
        'bio' => $chefData['bio'],
        'monday_start' => '17:00',
        'monday_end' => '21:00',
        'tuesday_start' => '17:00',
        'tuesday_end' => '21:00',
        'wednesday_start' => '17:00',
        'wednesday_end' => '21:00',
        'thursday_start' => '17:00',
        'thursday_end' => '21:00',
        'friday_start' => '16:00',
        'friday_end' => '22:00',
        'saterday_start' => '11:00',
        'saterday_end' => '22:00',
        'sunday_start' => '11:00',
        'sunday_end' => '20:00',
        'minimum_order_amount' => 20.00,
        'max_order_distance' => 25.0,
        'created_at' => $timestamp,
        'updated_at' => $timestamp,
    ]);

    // Create menu items
    $catId = $categoryMap[$chefData['category']];
    foreach ($chefData['menus'] as $menu) {
        DB::table('tbl_menus')->insert([
            'user_id' => $chef->id,
            'title' => $menu['title'],
            'description' => $menu['description'],
            'price' => $menu['price'],
            'serving_size' => 1,
            'meals' => 'Lunch,Dinner',
            'category_ids' => (string) $catId,
            'allergens' => $menu['allergens'],
            'appliances' => '2',
            'estimated_time' => 30,
            'is_live' => 1,
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ]);
    }
    echo "  + 3 menu items, availability 7 days/week\n\n";
}

echo "Done! All test chefs seeded near zip 46038.\n\n";
