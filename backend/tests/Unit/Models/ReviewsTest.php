<?php

namespace Tests\Unit\Models;

use Tests\TestCase;
use App\Models\Reviews;

/**
 * Unit tests for Reviews model
 *
 * Tests the reviewer_name display attribute ("First L.") shown on review
 * cards in the app, including the deterministic fallback for seeded and
 * admin-created reviews that have no real reviewer (from_user_id = 0).
 */
class ReviewsTest extends TestCase
{
    // ==========================================
    // reviewer_name Fallback Tests
    // ==========================================

    /**
     * Test anonymous review (from_user_id = 0) gets a "First L." name
     */
    public function test_anonymous_review_gets_first_name_last_initial()
    {
        $review = new Reviews([
            'from_user_id' => 0,
            'to_user_id' => 5,
            'rating' => 5,
        ]);
        $review->id = 42;

        $this->assertRegExp(
            '/^[A-Z][a-z]+ [A-Z]\.$/',
            $review->reviewer_name
        );
    }

    /**
     * Test fallback name is deterministic — same review id, same name
     */
    public function test_anonymous_reviewer_name_is_deterministic()
    {
        $a = new Reviews(['from_user_id' => 0]);
        $a->id = 100;
        $b = new Reviews(['from_user_id' => 0]);
        $b->id = 100;

        $this->assertSame($a->reviewer_name, $b->reviewer_name);
    }

    /**
     * Control: different review ids produce different names
     */
    public function test_anonymous_reviewer_names_vary_by_review_id()
    {
        $a = new Reviews(['from_user_id' => 0]);
        $a->id = 100;
        $b = new Reviews(['from_user_id' => 0]);
        $b->id = 101;

        $this->assertNotSame($a->reviewer_name, $b->reviewer_name);
    }

    /**
     * Test reviewer_name is appended to array/JSON output so every
     * endpoint returning reviews carries it
     */
    public function test_reviewer_name_is_appended_to_serialization()
    {
        $review = new Reviews([
            'from_user_id' => 0,
            'to_user_id' => 5,
            'rating' => 5,
            'review' => 'Great meal!',
        ]);
        $review->id = 7;

        $this->assertArrayHasKey('reviewer_name', $review->toArray());
    }
}
