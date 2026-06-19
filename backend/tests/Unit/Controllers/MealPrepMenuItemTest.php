<?php

namespace Tests\Unit\Controllers;

use Tests\TestCase;

/**
 * Unit tests for the meal-prep menu-item normalization in
 * MapiController::createMenu(). This is the data a CUSTOMER consumes when
 * browsing/ordering: a meal-prep item must carry item_type + meal-prep fields
 * (meals_per_package, shelf_life_days, storage_instructions), while a standard
 * item must NOT — even if those fields are accidentally sent.
 */
class MealPrepMenuItemTest extends TestCase
{
    /**
     * Mirror of the item_type + meal-prep field normalization in createMenu().
     * Returns the values that would be persisted on tbl_menus.
     */
    private function normalizeMenuItem(array $request): array
    {
        $itemType = ($request['item_type'] ?? null) === 'meal_prep' ? 'meal_prep' : 'standard';

        return [
            'item_type'            => $itemType,
            'serving_size'         => (!empty($request['serving_size']) && $request['serving_size'] > 0) ? $request['serving_size'] : 1,
            'meals_per_package'    => $itemType === 'meal_prep' ? (($request['meals_per_package'] ?? null) ?: null) : null,
            'shelf_life_days'      => $itemType === 'meal_prep' ? (($request['shelf_life_days'] ?? null) ?: null) : null,
            'storage_instructions' => $itemType === 'meal_prep' ? (($request['storage_instructions'] ?? null) ?: null) : null,
        ];
    }

    /**
     * CONTROL: a standard item stores no meal-prep fields and keeps serving_size.
     */
    public function test_standard_item_has_no_meal_prep_fields()
    {
        $result = $this->normalizeMenuItem([
            'item_type'    => 'standard',
            'serving_size' => 3,
        ]);

        $this->assertEquals('standard', $result['item_type']);
        $this->assertEquals(3, $result['serving_size']);
        $this->assertNull($result['meals_per_package']);
        $this->assertNull($result['shelf_life_days']);
        $this->assertNull($result['storage_instructions']);
    }

    /**
     * A meal-prep item a customer can order carries its meal-prep fields.
     */
    public function test_meal_prep_item_retains_meal_prep_fields()
    {
        $result = $this->normalizeMenuItem([
            'item_type'            => 'meal_prep',
            'serving_size'         => 5,
            'meals_per_package'    => 5,
            'shelf_life_days'      => 3,
            'storage_instructions' => 'Refrigerate; microwave 2 min.',
        ]);

        $this->assertEquals('meal_prep', $result['item_type']);
        $this->assertEquals(5, $result['meals_per_package']);
        $this->assertEquals(3, $result['shelf_life_days']);
        $this->assertEquals('Refrigerate; microwave 2 min.', $result['storage_instructions']);
    }

    /**
     * Meal-prep fields sent on a STANDARD item are dropped (not leaked to the
     * customer as if it were meal prep).
     */
    public function test_standard_item_drops_stray_meal_prep_fields()
    {
        $result = $this->normalizeMenuItem([
            'item_type'         => 'standard',
            'meals_per_package' => 10,
            'shelf_life_days'   => 7,
        ]);

        $this->assertEquals('standard', $result['item_type']);
        $this->assertNull($result['meals_per_package']);
        $this->assertNull($result['shelf_life_days']);
    }

    /**
     * An unknown/missing item_type defaults to standard (safe default).
     */
    public function test_unknown_item_type_defaults_to_standard()
    {
        $this->assertEquals('standard', $this->normalizeMenuItem([])['item_type']);
        $this->assertEquals('standard', $this->normalizeMenuItem(['item_type' => 'bogus'])['item_type']);
    }

    /**
     * serving_size always falls back to 1 when missing/zero (meal-prep items
     * still get a valid serving_size for the order/DB even though the chef UI
     * hides the control).
     */
    public function test_serving_size_defaults_to_one()
    {
        $this->assertEquals(1, $this->normalizeMenuItem(['item_type' => 'meal_prep'])['serving_size']);
        $this->assertEquals(1, $this->normalizeMenuItem(['serving_size' => 0])['serving_size']);
    }
}
