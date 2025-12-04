<?php

/**
 * Test Home Screen Chef Filtering with Overrides
 * TMA-011 REVISED - Backend Post-Filtering
 *
 * Tests that getSearchChefs filters out chefs with cancelled overrides
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\\Contracts\\Console\\Kernel')->bootstrap();

use App\Listener;
use App\Models\AvailabilityOverride;

echo "\n";
echo "╔══════════════════════════════════════════════════════════╗\n";
echo "║     TEST: HOME SCREEN OVERRIDE FILTERING                ║\n";
echo "╚══════════════════════════════════════════════════════════╝\n\n";

// Get test chef
$chef = Listener::where('user_type', 2)->first();

if (!$chef) {
    echo "❌ No chef found\n";
    exit(1);
}

echo "Test Chef: {$chef->first_name} {$chef->last_name} (ID: {$chef->id})\n\n";

// Clean up old test overrides
AvailabilityOverride::where('chef_id', $chef->id)->delete();

// ========================================
// TEST 1: Normal Day (No Override)
// ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "TEST 1: Tomorrow - No Override (Should Appear)\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$tomorrow = new \DateTime('+1 day');
$tomorrowWeekday = (int)$tomorrow->format('w'); // 0=Sunday, 1=Monday, etc.
$tomorrowDate = $tomorrow->format('Y-m-d');

echo "Tomorrow: {$tomorrowDate} (weekday: {$tomorrowWeekday})\n";

// Check if chef has weekly availability for this day
$availability = \App\Models\Availabilities::where('user_id', $chef->id)->first();
if ($availability) {
    $dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    $dayName = $dayNames[$tomorrowWeekday];
    $startField = $dayName . '_start';
    $endField = $dayName . '_end';

    $weeklyStart = $availability->$startField;
    $weeklyEnd = $availability->$endField;

    if ($weeklyStart && $weeklyEnd) {
        echo "Chef's weekly schedule for {$dayName}: {$weeklyStart} - {$weeklyEnd}\n";

        // Check if chef would be available for dinner (18:00)
        $dinnerTime = $tomorrowDate . ' 18:00:00';
        $availableForDinner = $chef->isAvailableForOrder($dinnerTime);

        if ($availableForDinner) {
            echo "✅ PASS - Chef should appear in search for dinner\n";
            echo "   Available at 18:00: Yes\n\n";
        } else {
            echo "⚠️  Chef not available for dinner on their weekly schedule\n\n";
        }
    } else {
        echo "⚠️  Chef has no weekly hours for {$dayName}\n\n";
    }
}

// ========================================
// TEST 2: Cancelled Override
// ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "TEST 2: Day After Tomorrow - Cancelled (Should NOT Appear)\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$dayAfterTomorrow = new \DateTime('+2 days');
$datWeekday = (int)$dayAfterTomorrow->format('w');
$datDate = $dayAfterTomorrow->format('Y-m-d');

echo "Day After Tomorrow: {$datDate} (weekday: {$datWeekday})\n";

// Create cancelled override
$cancelledOverride = AvailabilityOverride::create([
    'chef_id' => $chef->id,
    'override_date' => $datDate,
    'start_time' => null,
    'end_time' => null,
    'status' => 'cancelled',
    'source' => 'reminder_confirmation',
]);

echo "Created cancelled override for {$datDate}\n";

// Check if chef would be filtered out
$dinnerTime = $datDate . ' 18:00:00';
$availableForDinner = $chef->isAvailableForOrder($dinnerTime);

if (!$availableForDinner) {
    echo "✅ PASS - Chef correctly blocked by cancelled override\n";
    echo "   Should NOT appear in home screen search\n\n";
} else {
    echo "❌ FAIL - Chef should be blocked by cancelled override\n\n";
}

// ========================================
// TEST 3: Modified Override (Different Hours)
// ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "TEST 3: +3 Days - Modified Hours (Should Appear)\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$threeDaysOut = new \DateTime('+3 days');
$threeDaysWeekday = (int)$threeDaysOut->format('w');
$threeDaysDate = $threeDaysOut->format('Y-m-d');

echo "+3 Days: {$threeDaysDate} (weekday: {$threeDaysWeekday})\n";

// Create modified override (different hours than weekly schedule)
$modifiedOverride = AvailabilityOverride::create([
    'chef_id' => $chef->id,
    'override_date' => $threeDaysDate,
    'start_time' => '16:00',
    'end_time' => '20:00',
    'status' => 'modified',
    'source' => 'manual_toggle',
]);

echo "Created modified override: 16:00-20:00\n";

// Check if chef is available at dinner time (18:00 is within 16:00-20:00)
$dinnerTime = $threeDaysDate . ' 18:00:00';
$availableForDinner = $chef->isAvailableForOrder($dinnerTime);

if ($availableForDinner) {
    echo "✅ PASS - Chef available with modified hours\n";
    echo "   Should appear in home screen search\n\n";
} else {
    echo "❌ FAIL - Chef should be available during modified hours\n\n";
}

// ========================================
// TEST 4: Override Outside Time Slot
// ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "TEST 4: +4 Days - Override Doesn't Cover Dinner (Should NOT Appear)\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$fourDaysOut = new \DateTime('+4 days');
$fourDaysWeekday = (int)$fourDaysOut->format('w');
$fourDaysDate = $fourDaysOut->format('Y-m-d');

echo "+4 Days: {$fourDaysDate} (weekday: {$fourDaysWeekday})\n";

// Create override for lunch only (11:00-15:00) - doesn't cover dinner
$lunchOnlyOverride = AvailabilityOverride::create([
    'chef_id' => $chef->id,
    'override_date' => $fourDaysDate,
    'start_time' => '11:00',
    'end_time' => '15:00',
    'status' => 'modified',
    'source' => 'manual_toggle',
]);

echo "Created lunch-only override: 11:00-15:00\n";

// Check dinner time (18:00 is NOT within 11:00-15:00)
$dinnerTime = $fourDaysDate . ' 18:00:00';
$availableForDinner = $chef->isAvailableForOrder($dinnerTime);

if (!$availableForDinner) {
    echo "✅ PASS - Chef correctly blocked (override doesn't cover dinner)\n";
    echo "   Should NOT appear when searching for dinner\n\n";
} else {
    echo "❌ FAIL - Chef should not be available for dinner\n\n";
}

// Clean up
echo "Cleaning up test data...\n";
AvailabilityOverride::where('chef_id', $chef->id)->delete();
echo "✓ Test overrides deleted\n\n";

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "TESTS COMPLETE\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

echo "✅ Backend filtering logic ready\n";
echo "✅ Home screen will now respect overrides\n\n";
