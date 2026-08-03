<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reviews extends Model
{
    protected $table = 'tbl_reviews';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'order_id',
        'from_user_id',
        'to_user_id',
        'rating',
        'review',
        'tip_amount',
        'source',
        'parent_review_id',
        'ai_generation_params'
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'ai_generation_params' => 'array',
        'rating' => 'float'
    ];

    /**
     * Computed attributes included in every serialization, so all endpoints
     * that return reviews (chef search, public profile, review lists) carry
     * the reviewer's display name without per-endpoint changes.
     */
    protected $appends = ['reviewer_name'];

    /**
     * Display names used for reviews with no real reviewer on file
     * (seeded/admin-created rows have from_user_id = 0). Deterministic by
     * review id, so a review always shows the same name.
     */
    private const FALLBACK_FIRST_NAMES = [
        'Sarah', 'Mike', 'Emily', 'David', 'Jess', 'Chris', 'Amanda',
        'Tyler', 'Rachel', 'Kevin', 'Lauren', 'Brandon', 'Megan', 'Josh',
        'Nicole', 'Aaron', 'Brittany', 'Derek', 'Vanessa', 'Marcus',
    ];

    private const FALLBACK_LAST_INITIALS = [
        'A', 'B', 'C', 'D', 'E', 'G', 'H', 'J', 'K', 'L',
        'M', 'N', 'P', 'R', 'S', 'T', 'W',
    ];

    /**
     * Reviewer display name as "First L." — from the real reviewer when
     * from_user_id resolves to a user, otherwise a deterministic fallback.
     */
    public function getReviewerNameAttribute()
    {
        $fromUserId = (int)($this->attributes['from_user_id'] ?? 0);

        if ($fromUserId > 0) {
            static $userCache = [];
            if (!array_key_exists($fromUserId, $userCache)) {
                $userCache[$fromUserId] = \App\Listener::select('first_name', 'last_name')
                    ->find($fromUserId);
            }
            $user = $userCache[$fromUserId];
            if ($user && trim($user->first_name) !== '') {
                $initial = strtoupper(substr(trim($user->last_name), 0, 1));
                return trim($user->first_name) . ($initial !== '' ? " {$initial}." : '');
            }
        }

        $id = (int)($this->attributes['id'] ?? 0);
        $first = self::FALLBACK_FIRST_NAMES[$id % count(self::FALLBACK_FIRST_NAMES)];
        $initial = self::FALLBACK_LAST_INITIALS[($id * 7) % count(self::FALLBACK_LAST_INITIALS)];
        return "{$first} {$initial}.";
    }

    /**
     * Accessor for created_at to convert to unix timestamp
     */
    public function getCreatedAtAttribute($date)
    {
        return strtotime($date);
    }

    /**
     * Accessor for updated_at to convert to unix timestamp
     */
    public function getUpdatedAtAttribute($date)
    {
        return strtotime($date);
    }

    /**
     * Relationship to parent review (for AI-generated reviews)
     */
    public function parentReview()
    {
        return $this->belongsTo(Reviews::class, 'parent_review_id');
    }

    /**
     * Relationship to AI child reviews (for authentic reviews)
     */
    public function aiReviews()
    {
        return $this->hasMany(Reviews::class, 'parent_review_id');
    }
}