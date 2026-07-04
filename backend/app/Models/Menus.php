<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Menus extends Model
{
    protected $table= 'tbl_menus';

    public function getCreatedAtAttribute($date)
    {
        return strtotime($date);
    }

    public function getUpdatedAtAttribute($date)
    {
        return strtotime($date);
    }

    /**
     * Whether the chef currently has at least one available (is_live) menu item.
     * Pass $excludeId when checking during an update so the item being edited
     * doesn't count itself. Used to guarantee a chef can never hide their only
     * orderable item (which would leave customers unable to check out).
     */
    public static function chefHasAvailableItem(int $userId, ?int $excludeId = null): bool
    {
        return static::where('user_id', $userId)
            ->where('is_live', 1)
            ->when($excludeId !== null, fn ($q) => $q->where('id', '!=', $excludeId))
            ->exists();
    }
}