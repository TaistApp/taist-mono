<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DishPhoto extends Model
{
    protected $table = 'tbl_dish_photos';

    protected $fillable = [
        'order_id',
        'chef_user_id',
        'menu_id',
        'filename',
        'status',
        'admin_notes',
        'queued_for_social',
        'social_caption',
        'last_posted_at',
    ];

    protected $casts = [
        'queued_for_social' => 'boolean',
    ];

    public function chef()
    {
        return $this->belongsTo(Listener::class, 'chef_user_id', 'id');
    }

    public function menu()
    {
        return $this->belongsTo(Menus::class, 'menu_id', 'id');
    }

    public function order()
    {
        return $this->belongsTo(Orders::class, 'order_id', 'id');
    }

    public static function getApprovedUrlForMenu(?int $menuId): ?string
    {
        if ($menuId === null) {
            return null;
        }

        $photo = static::where('menu_id', $menuId)
            ->where('status', 'approved')
            ->first();

        if (!$photo) {
            return null;
        }

        return self::buildUrl($photo->filename);
    }

    public static function getRandomApprovedUrl(): ?string
    {
        $photo = static::where('status', 'approved')
            ->inRandomOrder()
            ->first();

        if (!$photo) {
            return null;
        }

        return self::buildUrl($photo->filename);
    }

    private static function buildUrl(string $filename): string
    {
        $base = rtrim(env('APP_URL', 'https://api.taist.app'), '/');
        return $base . '/assets/uploads/images/' . $filename;
    }
}
