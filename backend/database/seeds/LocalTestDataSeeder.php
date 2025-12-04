<?php

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LocalTestDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $timestamp = date('Y-m-d H:i:s');
        
        // 1. ALLERGENS
        echo "Seeding allergens...\n";
        $allergens = [
            ['name' => 'Gluten', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Dairy', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Eggs', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Peanuts', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Tree Nuts', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Soy', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Fish', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Shellfish', 'created_at' => $timestamp, 'updated_at' => $timestamp],
        ];
        DB::table('tbl_allergens')->insert($allergens);
        
        // 2. APPLIANCES
        echo "Seeding appliances...\n";
        $appliances = [
            ['name' => 'Oven', 'image' => 'oven.png', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Microwave', 'image' => 'microwave.png', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Stovetop', 'image' => 'stovetop.png', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Air Fryer', 'image' => 'airfryer.png', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Instant Pot', 'image' => 'instantpot.png', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Grill', 'image' => 'grill.png', 'created_at' => $timestamp, 'updated_at' => $timestamp],
        ];
        DB::table('tbl_appliances')->insert($appliances);
        
        // 3. ACTIVATED ZIPCODES (Chicago area)
        echo "Seeding zipcodes...\n";
        $zipcodes = "60601,60602,60603,60604,60605,60606,60607,60608,60609,60610,60611,60612,60613,60614,60615,60616,60617,60618,60619,60620,60621,60622,60623,60624,60625,60626,60628,60629,60630,60631,60632,60633,60634,60636,60637,60638,60639,60640,60641,60642,60643,60644,60645,60646,60647,60649,60651,60652,60653,60654,60655,60656,60657,60659,60660,60661,60706,60707,60714";
        DB::table('tbl_zipcodes')->insert([
            'zipcodes' => $zipcodes,
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        // 4. USERS (Chefs and Customers)
        echo "Seeding users...\n";
        
        // Chef 1
        DB::table('tbl_users')->insert([
            'id' => 1,
            'first_name' => 'Maria',
            'last_name' => 'Rodriguez',
            'email' => 'maria.chef@test.com',
            'password' => bcrypt('password'),
            'phone' => '+13125551001',
            'birthday' => strtotime('1985-03-15'),
            'bio' => 'Specializing in authentic Mexican cuisine with 15 years of experience.',
            'address' => '123 W Madison St',
            'city' => 'Chicago',
            'state' => 'IL',
            'zip' => '60602',
            'user_type' => 2, // Chef
            'is_pending' => 0,
            'verified' => 1, // Active
            'photo' => 'chef1.jpg',
            'api_token' => Str::random(80),
            'code' => '',
            'token_date' => '',
            'latitude' => '41.8819',
            'longitude' => '-87.6278',
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        // Chef 2
        DB::table('tbl_users')->insert([
            'id' => 2,
            'first_name' => 'James',
            'last_name' => 'Chen',
            'email' => 'james.chef@test.com',
            'password' => bcrypt('password'),
            'phone' => '+13125551002',
            'birthday' => strtotime('1990-07-22'),
            'bio' => 'Award-winning Asian fusion chef bringing bold flavors to your kitchen.',
            'address' => '456 N State St',
            'city' => 'Chicago',
            'state' => 'IL',
            'zip' => '60610',
            'user_type' => 2, // Chef
            'is_pending' => 0,
            'verified' => 1, // Active
            'photo' => 'chef2.jpg',
            'api_token' => Str::random(80),
            'code' => '',
            'token_date' => '',
            'latitude' => '41.8968',
            'longitude' => '-87.6283',
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        // Chef 3
        DB::table('tbl_users')->insert([
            'id' => 3,
            'first_name' => 'Sarah',
            'last_name' => 'Williams',
            'email' => 'sarah.chef@test.com',
            'password' => bcrypt('password'),
            'phone' => '+13125551003',
            'birthday' => strtotime('1988-11-08'),
            'bio' => 'Plant-based chef creating delicious vegan and vegetarian meals.',
            'address' => '789 S Michigan Ave',
            'city' => 'Chicago',
            'state' => 'IL',
            'zip' => '60605',
            'user_type' => 2, // Chef
            'is_pending' => 0,
            'verified' => 1, // Active
            'photo' => 'chef3.jpg',
            'api_token' => Str::random(80),
            'code' => '',
            'token_date' => '',
            'latitude' => '41.8681',
            'longitude' => '-87.6245',
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        // Customer 1
        DB::table('tbl_users')->insert([
            'id' => 4,
            'first_name' => 'John',
            'last_name' => 'Smith',
            'email' => 'john.customer@test.com',
            'password' => bcrypt('password'),
            'phone' => '+13125552001',
            'birthday' => null,
            'bio' => null,
            'address' => '321 E Ohio St',
            'city' => 'Chicago',
            'state' => 'IL',
            'zip' => '60611',
            'user_type' => 1, // Customer
            'is_pending' => 0,
            'verified' => 1, // Active
            'photo' => '',
            'api_token' => Str::random(80),
            'code' => '',
            'token_date' => '',
            'latitude' => '41.8922',
            'longitude' => '-87.6189',
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        // Customer 2
        DB::table('tbl_users')->insert([
            'id' => 5,
            'first_name' => 'Emily',
            'last_name' => 'Johnson',
            'email' => 'emily.customer@test.com',
            'password' => bcrypt('password'),
            'phone' => '+13125552002',
            'birthday' => null,
            'bio' => null,
            'address' => '654 W Randolph St',
            'city' => 'Chicago',
            'state' => 'IL',
            'zip' => '60661',
            'user_type' => 1, // Customer
            'is_pending' => 0,
            'verified' => 1, // Active
            'photo' => '',
            'api_token' => Str::random(80),
            'code' => '',
            'token_date' => '',
            'latitude' => '41.8845',
            'longitude' => '-87.6446',
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        // 5. CHEF AVAILABILITIES
        echo "Seeding chef availabilities...\n";
        
        // Maria's availability
        DB::table('tbl_availabilities')->insert([
            'user_id' => 1,
            'bio' => 'Specializing in authentic Mexican cuisine with 15 years of experience. My dishes are made with love and traditional recipes passed down through generations.',
            'monday_start' => '09:00',
            'monday_end' => '21:00',
            'tuesday_start' => '09:00',
            'tuesday_end' => '21:00',
            'wednesday_start' => '09:00',
            'wednesday_end' => '21:00',
            'thursday_start' => '09:00',
            'thursday_end' => '21:00',
            'friday_start' => '09:00',
            'friday_end' => '22:00',
            'saterday_start' => '10:00',
            'saterday_end' => '22:00',
            'sunday_start' => '10:00',
            'sunday_end' => '20:00',
            'minimum_order_amount' => 25.00,
            'max_order_distance' => 10.0,
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        // James's availability
        DB::table('tbl_availabilities')->insert([
            'user_id' => 2,
            'bio' => 'Award-winning Asian fusion chef bringing bold flavors to your kitchen. Trained in Tokyo and Hong Kong, now sharing my passion in Chicago.',
            'monday_start' => '11:00',
            'monday_end' => '20:00',
            'tuesday_start' => '11:00',
            'tuesday_end' => '20:00',
            'wednesday_start' => '11:00',
            'wednesday_end' => '20:00',
            'thursday_start' => '11:00',
            'thursday_end' => '20:00',
            'friday_start' => '11:00',
            'friday_end' => '21:00',
            'saterday_start' => '11:00',
            'saterday_end' => '21:00',
            'sunday_start' => null,
            'sunday_end' => null,
            'minimum_order_amount' => 30.00,
            'max_order_distance' => 8.0,
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        // Sarah's availability
        DB::table('tbl_availabilities')->insert([
            'user_id' => 3,
            'bio' => 'Plant-based chef creating delicious vegan and vegetarian meals. Proving that healthy eating can be incredibly flavorful!',
            'monday_start' => '10:00',
            'monday_end' => '19:00',
            'tuesday_start' => '10:00',
            'tuesday_end' => '19:00',
            'wednesday_start' => '10:00',
            'wednesday_end' => '19:00',
            'thursday_start' => '10:00',
            'thursday_end' => '19:00',
            'friday_start' => '10:00',
            'friday_end' => '20:00',
            'saterday_start' => '10:00',
            'saterday_end' => '20:00',
            'sunday_start' => '10:00',
            'sunday_end' => '18:00',
            'minimum_order_amount' => 20.00,
            'max_order_distance' => 12.0,
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        // 6. CATEGORIES
        echo "Seeding categories...\n";
        $categories = [
            ['name' => 'Mexican', 'chef_id' => 1, 'menu_id' => 0, 'status' => 2, 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Asian', 'chef_id' => 2, 'menu_id' => 0, 'status' => 2, 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Vegan', 'chef_id' => 3, 'menu_id' => 0, 'status' => 2, 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Italian', 'chef_id' => 0, 'menu_id' => 0, 'status' => 2, 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'American', 'chef_id' => 0, 'menu_id' => 0, 'status' => 2, 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Indian', 'chef_id' => 0, 'menu_id' => 0, 'status' => 2, 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Mediterranean', 'chef_id' => 0, 'menu_id' => 0, 'status' => 2, 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'BBQ', 'chef_id' => 0, 'menu_id' => 0, 'status' => 2, 'created_at' => $timestamp, 'updated_at' => $timestamp],
        ];
        DB::table('tbl_categories')->insert($categories);
        
        // 7. MENUS
        echo "Seeding menus...\n";
        
        // Maria's Mexican dishes
        DB::table('tbl_menus')->insert([
            'user_id' => 1,
            'title' => 'Authentic Chicken Tacos (3 pack)',
            'description' => 'Three delicious tacos filled with seasoned grilled chicken, fresh cilantro, onions, and authentic Mexican salsa. Served with lime wedges.',
            'price' => 15.00,
            'serving_size' => 1,
            'meals' => 'Lunch,Dinner',
            'category_ids' => '1',
            'allergens' => '1', // Gluten
            'appliances' => '3,4', // Stovetop, Air Fryer
            'estimated_time' => 20,
            'is_live' => 1,
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        DB::table('tbl_menus')->insert([
            'user_id' => 1,
            'title' => 'Beef Enchiladas with Red Sauce',
            'description' => 'Tender beef wrapped in corn tortillas, smothered in homemade red enchilada sauce and melted cheese. Served with rice and beans.',
            'price' => 22.00,
            'serving_size' => 2,
            'meals' => 'Dinner',
            'category_ids' => '1',
            'allergens' => '1,2', // Gluten, Dairy
            'appliances' => '1', // Oven
            'estimated_time' => 35,
            'is_live' => 1,
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        DB::table('tbl_menus')->insert([
            'user_id' => 1,
            'title' => 'Veggie Quesadilla',
            'description' => 'Flour tortilla filled with a blend of cheeses, peppers, onions, and mushrooms. Served with sour cream and guacamole.',
            'price' => 12.00,
            'serving_size' => 1,
            'meals' => 'Lunch,Dinner',
            'category_ids' => '1',
            'allergens' => '1,2', // Gluten, Dairy
            'appliances' => '3', // Stovetop
            'estimated_time' => 15,
            'is_live' => 1,
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        // James's Asian dishes
        DB::table('tbl_menus')->insert([
            'user_id' => 2,
            'title' => 'Kung Pao Chicken',
            'description' => 'Spicy stir-fried chicken with peanuts, vegetables, and chili peppers in a savory sauce. Served with steamed rice.',
            'price' => 18.00,
            'serving_size' => 1,
            'meals' => 'Lunch,Dinner',
            'category_ids' => '2',
            'allergens' => '4,6', // Peanuts, Soy
            'appliances' => '3', // Stovetop
            'estimated_time' => 25,
            'is_live' => 1,
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        DB::table('tbl_menus')->insert([
            'user_id' => 2,
            'title' => 'Pad Thai',
            'description' => 'Classic Thai rice noodles stir-fried with shrimp, tofu, eggs, bean sprouts, and crushed peanuts in tamarind sauce.',
            'price' => 20.00,
            'serving_size' => 1,
            'meals' => 'Lunch,Dinner',
            'category_ids' => '2',
            'allergens' => '3,4,6,8', // Eggs, Peanuts, Soy, Shellfish
            'appliances' => '3', // Stovetop
            'estimated_time' => 20,
            'is_live' => 1,
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        DB::table('tbl_menus')->insert([
            'user_id' => 2,
            'title' => 'Teriyaki Salmon Bowl',
            'description' => 'Grilled salmon glazed with house-made teriyaki sauce, served over rice with steamed vegetables and sesame seeds.',
            'price' => 25.00,
            'serving_size' => 1,
            'meals' => 'Lunch,Dinner',
            'category_ids' => '2',
            'allergens' => '6,7', // Soy, Fish
            'appliances' => '1,3', // Oven, Stovetop
            'estimated_time' => 30,
            'is_live' => 1,
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        // Sarah's Vegan dishes
        DB::table('tbl_menus')->insert([
            'user_id' => 3,
            'title' => 'Buddha Bowl',
            'description' => 'Quinoa bowl topped with roasted chickpeas, sweet potato, avocado, kale, and tahini dressing. Completely plant-based!',
            'price' => 16.00,
            'serving_size' => 1,
            'meals' => 'Lunch,Dinner',
            'category_ids' => '3',
            'allergens' => '', // No major allergens
            'appliances' => '1', // Oven
            'estimated_time' => 25,
            'is_live' => 1,
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        DB::table('tbl_menus')->insert([
            'user_id' => 3,
            'title' => 'Vegan Mushroom Risotto',
            'description' => 'Creamy arborio rice cooked with mixed mushrooms, garlic, white wine, and nutritional yeast. Rich and satisfying!',
            'price' => 19.00,
            'serving_size' => 1,
            'meals' => 'Dinner',
            'category_ids' => '3',
            'allergens' => '1', // Gluten (if not using GF rice)
            'appliances' => '3', // Stovetop
            'estimated_time' => 40,
            'is_live' => 1,
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        DB::table('tbl_menus')->insert([
            'user_id' => 3,
            'title' => 'Jackfruit Tacos (3 pack)',
            'description' => 'Pulled jackfruit seasoned with spices, served in corn tortillas with cabbage slaw, avocado, and cilantro-lime crema.',
            'price' => 14.00,
            'serving_size' => 1,
            'meals' => 'Lunch,Dinner',
            'category_ids' => '3',
            'allergens' => '', // No major allergens
            'appliances' => '3', // Stovetop
            'estimated_time' => 20,
            'is_live' => 1,
            'created_at' => $timestamp,
            'updated_at' => $timestamp
        ]);
        
        // 8. CUSTOMIZATIONS (for some menus)
        echo "Seeding customizations...\n";
        
        // Customizations for Chicken Tacos (menu_id 1)
        DB::table('tbl_customizations')->insert([
            ['menu_id' => 1, 'name' => 'Extra Guacamole', 'upcharge_price' => 2.50, 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['menu_id' => 1, 'name' => 'Add Cheese', 'upcharge_price' => 1.50, 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['menu_id' => 1, 'name' => 'Extra Spicy', 'upcharge_price' => 0.00, 'created_at' => $timestamp, 'updated_at' => $timestamp],
        ]);
        
        // Customizations for Buddha Bowl (menu_id 7)
        DB::table('tbl_customizations')->insert([
            ['menu_id' => 7, 'name' => 'Extra Avocado', 'upcharge_price' => 2.00, 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['menu_id' => 7, 'name' => 'Add Tempeh', 'upcharge_price' => 3.50, 'created_at' => $timestamp, 'updated_at' => $timestamp],
        ]);
        
        // Customizations for Teriyaki Salmon (menu_id 6)
        DB::table('tbl_customizations')->insert([
            ['menu_id' => 6, 'name' => 'Double Portion', 'upcharge_price' => 10.00, 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['menu_id' => 6, 'name' => 'Brown Rice Instead', 'upcharge_price' => 0.00, 'created_at' => $timestamp, 'updated_at' => $timestamp],
        ]);
        
        // 9. VERSION
        echo "Seeding version...\n";
        DB::table('versions')->insert([
            'version' => '1.0.0',
            'created_at' => now(),
            'updated_at' => now()
        ]);
        
        echo "\n✅ Seeding completed successfully!\n\n";
        echo "TEST ACCOUNTS:\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "CHEFS:\n";
        echo "  Maria Rodriguez: maria.chef@test.com / password\n";
        echo "  James Chen: james.chef@test.com / password\n";
        echo "  Sarah Williams: sarah.chef@test.com / password\n";
        echo "\nCUSTOMERS:\n";
        echo "  John Smith: john.customer@test.com / password\n";
        echo "  Emily Johnson: emily.customer@test.com / password\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "\nDATA SUMMARY:\n";
        echo "  - 8 Allergens\n";
        echo "  - 6 Appliances\n";
        echo "  - 58 Activated Zipcodes (Chicago area)\n";
        echo "  - 3 Chefs (verified & active)\n";
        echo "  - 2 Customers\n";
        echo "  - 8 Categories\n";
        echo "  - 9 Menu Items (live)\n";
        echo "  - 7 Customization Options\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    }
}





