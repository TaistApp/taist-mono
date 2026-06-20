<?php

namespace Tests\Unit\Controllers;

use Tests\TestCase;

/**
 * Unit tests for the AI add-on suggestion normalization logic used by
 * MapiController::suggestAddOns(). The controller asks the model for a JSON
 * list of {name, upcharge_price} and then sanitizes it before returning.
 *
 * These tests exercise that sanitization (fence-stripping, dropping nameless
 * entries, clamping negative prices, rounding to cents) including a control
 * case where a well-formed response passes through unchanged.
 */
class MenuAddOnSuggestionTest extends TestCase
{
    /**
     * Mirror of the parse + normalize logic in MapiController::suggestAddOns().
     * Returns the cleaned suggestions array, or null if the JSON is invalid.
     */
    private function normalizeAddOnResponse(string $content): ?array
    {
        // Strip markdown code fences (the controller does the same)
        $content = trim($content);
        $content = preg_replace('/```json\s*/', '', $content);
        $content = preg_replace('/```\s*/', '', $content);
        $content = trim($content);

        $parsed = json_decode($content, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        $suggestions = [];
        foreach (($parsed['suggestions'] ?? []) as $s) {
            $name = isset($s['name']) ? trim((string) $s['name']) : '';
            if ($name === '') continue;
            $price = isset($s['upcharge_price']) ? round((float) $s['upcharge_price'], 2) : 0;
            if ($price < 0) $price = 0;
            $suggestions[] = ['name' => $name, 'upcharge_price' => $price];
        }

        return $suggestions;
    }

    /**
     * CONTROL CASE: a clean, well-formed response passes through intact.
     */
    public function test_wellformed_response_is_preserved()
    {
        $content = '{"suggestions":[{"name":"Extra Cheese","upcharge_price":1.5},{"name":"Side Salad","upcharge_price":3}]}';

        $result = $this->normalizeAddOnResponse($content);

        $this->assertCount(2, $result);
        $this->assertEquals('Extra Cheese', $result[0]['name']);
        $this->assertEquals(1.5, $result[0]['upcharge_price']);
        $this->assertEquals('Side Salad', $result[1]['name']);
        $this->assertEquals(3.0, $result[1]['upcharge_price']);
    }

    /**
     * Markdown code fences around the JSON are stripped before parsing.
     */
    public function test_markdown_fences_are_stripped()
    {
        $content = "```json\n{\"suggestions\":[{\"name\":\"Garlic Bread\",\"upcharge_price\":2.0}]}\n```";

        $result = $this->normalizeAddOnResponse($content);

        $this->assertCount(1, $result);
        $this->assertEquals('Garlic Bread', $result[0]['name']);
    }

    /**
     * Entries with a missing or blank name are dropped.
     */
    public function test_nameless_entries_are_dropped()
    {
        $content = '{"suggestions":[{"name":"","upcharge_price":1},{"upcharge_price":2},{"name":"Bacon","upcharge_price":2.25}]}';

        $result = $this->normalizeAddOnResponse($content);

        $this->assertCount(1, $result);
        $this->assertEquals('Bacon', $result[0]['name']);
    }

    /**
     * Negative prices are clamped to 0 and prices round to two decimals.
     */
    public function test_prices_are_clamped_and_rounded()
    {
        $content = '{"suggestions":[{"name":"Free Sauce","upcharge_price":-5},{"name":"Avocado","upcharge_price":1.999}]}';

        $result = $this->normalizeAddOnResponse($content);

        $this->assertEquals(0, $result[0]['upcharge_price']);
        $this->assertEquals(2.0, $result[1]['upcharge_price']);
    }

    /**
     * Invalid JSON returns null so the controller can report a parse failure.
     */
    public function test_invalid_json_returns_null()
    {
        $this->assertNull($this->normalizeAddOnResponse('not json at all'));
    }

    /**
     * A response with no suggestions key yields an empty (not null) list.
     */
    public function test_missing_suggestions_key_yields_empty_list()
    {
        $result = $this->normalizeAddOnResponse('{}');

        $this->assertIsArray($result);
        $this->assertCount(0, $result);
    }
}
