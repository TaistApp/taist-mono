<?php

/**
 * Test Override Toggle-On Scenario
 * TMA-011 REVISED - Critical Use Case
 *
 * Test: Chef has NO weekly schedule for a day, but toggles ONLINE via override
 * Expected: Should APPEAR in search results
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\\Contracts\\Console\\Kernel')->bootstrap();

use App\Listener;
use App\Models\AvailabilityOverride;
use App\Models\Availabilities;

echo "\n";
echo "╔══════════════════════════════════════════════════════════╗\n";
echo "║   TEST: OVERRIDE TOGGLE-ON (NO WEEKLY SCHEDULE)        ║\n";
echo "╚══════════════════════════════════════════════════════════╝\n\n";

// Get test chef
$chef = Listener::where('user_type', 2)->first();

if (!$chef) {
    echo "❌ No chef found\n";
    exit(1);
}

echo "Test Chef: {$chef->first_name} {$chef->last_name} (ID: {$chef->id})\n\n";

// Clean up
AvailabilityOverride::where('chef_id', $chef->id)->delete();

// Find a day where chef has NO weekly schedule
$availability = Availabilities::where('user_id', $chef->id)->first();

$testDay = null;
$testDayName = null;

if ($availability) {
    $days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    foreach ($days as $index => $day) {
        $startField = $day . '_start';
        $endField = $day . '_end';

        $start = $availability->$startField;
        $end = $availability->$endField;

        // Found a day with NO schedule
        if (!$start || !$end || $start == '0' || $end == '0' || $start == 0 || $end == 0) {
            $testDay = $index; // 0=Sunday, 1=Monday, etc.
            $testDayName = $day;
            break;
        }
    }
}

if ($testDay === null) {
    echo "⚠️  Chef has weekly schedule for ALL days - creating artificial test\n";
    echo "    Setting Monday schedule to empty...\n";

    $availability->monday_start = 0;
    $availability->monday_end = 0;
    $availability->save();

    $testDay = 1; // Monday
    $testDayName = 'monday';
}

echo "Test Day: {$testDayName} (weekday: {$testDay})\n";
echo "Weekly Schedule: CLOSED (no hours)\n\n";

// Calculate next occurrence of this weekday
$today = new \DateTime();
$currentWeekday = (int)$today->format('w');
$daysToAdd = $testDay - $currentWeekday;
if ($daysToAdd <= 0) {
    $daysToAdd += 7;
}

$targetDate = clone $today;
$targetDate->modify("+{$daysToAdd} days");
$dateString = $targetDate->format('Y-m-d');

echo "Target Date: {$dateString}\n\n";

// ========================================
// TEST 1: Without Override (Should NOT Appear)
// ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "TEST 1: No Override - Chef Closed\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$dinnerTime = $dateString . ' 18:00:00';
$availableWithoutOverride = $chef->isAvailableForOrder($dinnerTime);

if (!$availableWithoutOverride) {
    echo "✅ PASS - Chef correctly unavailable (no weekly schedule)\n\n";
} else {
    echo "❌ FAIL - Chef should be unavailable without schedule\n\n";
}

// ========================================
// TEST 2: With Toggle-On Override (Should APPEAR!)
// ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "TEST 2: Toggle-On Override - Chef Goes Online!\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// Chef toggles ONLINE for 16:00-20:00
$toggleOnOverride = AvailabilityOverride::create([
    'chef_id' => $chef->id,
    'override_date' => $dateString,
    'start_time' => '16:00',
    'end_time' => '20:00',
    'status' => 'confirmed',
    'source' => 'manual_toggle',
]);

echo "Created toggle-on override: {$dateString} 16:00-20:00\n";
echo "Chef manually went ONLINE despite no weekly schedule!\n\n";

// Check if now available
$availableWithOverride = $chef->isAvailableForOrder($dinnerTime);

if ($availableWithOverride) {
    echo "✅ PASS - Chef NOW available via override!\n";
    echo "   Should APPEAR in home screen search\n";
    echo "   Override WORKS for toggle-on scenario! 🎉\n\n";
} else {
    echo "❌ FAIL - Chef should be available with override\n";
    echo "   This is a CRITICAL bug!\n\n";
}

// ========================================
// TEST 3: Time Outside Override (Should NOT Appear)
// ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "TEST 3: Time Outside Override Window\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$lunchTime = $dateString . ' 13:00:00'; // Before 16:00
$availableAtLunch = $chef->isAvailableForOrder($lunchTime);

if (!$availableAtLunch) {
    echo "✅ PASS - Chef correctly unavailable outside override window\n";
    echo "   Override: 16:00-20:00, Checking: 13:00\n\n";
} else {
    echo "❌ FAIL - Chef should not be available outside override window\n\n";
}

// Clean up
echo "Cleaning up test data...\n";
AvailabilityOverride::where('chef_id', $chef->id)->delete();

// Restore Monday schedule if we modified it
if ($testDayName == 'monday' && $availability) {
    echo "Restoring Monday weekly schedule...\n";
    $availability->monday_start = '10:00';
    $availability->monday_end = '20:00';
    $availability->save();
}

echo "✓ Cleanup complete\n\n";

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "CRITICAL USE CASE TEST COMPLETE\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

if ($availableWithOverride) {
    echo "✅ Toggle-on overrides WORK!\n";
    echo "✅ Chefs can go online even when weekly schedule is closed\n\n";
} else {
    echo "❌ Toggle-on overrides BROKEN!\n";
    echo "❌ Need to fix Listener::isAvailableForOrder() logic\n\n";
}
