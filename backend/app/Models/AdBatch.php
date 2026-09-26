<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdBatch extends Model
{
    protected $table = 'tbl_ad_batches';

    const STATUS_DRAFT = 'draft';
    const STATUS_SCHEDULED = 'scheduled';
    const STATUS_LIVE = 'live';
    const STATUS_ENDED = 'ended';
    const STATUS_CANCELLED = 'cancelled';

    const MAX_ADS = 5;

    protected $fillable = [
        'batch_number',
        'status',
        'go_live_at',
        'preview_sent_at',
        'launched_at',
        'ends_at',
        'ended_at',
        'created_by',
        'notes',
    ];

    protected $casts = [
        'batch_number' => 'integer',
        'go_live_at' => 'datetime',
        'preview_sent_at' => 'datetime',
        'launched_at' => 'datetime',
        'ends_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function ads()
    {
        return $this->hasMany(Ad::class, 'batch_id')->orderBy('sort')->orderBy('id');
    }

    public function isEditable(): bool
    {
        return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_SCHEDULED], true);
    }

    public function displayName(): string
    {
        return $this->batch_number ? "Ad batch #{$this->batch_number}" : 'Ad batch';
    }

    /**
     * When the batch may actually go live: the scheduled time, pushed back if
     * the preview went out late, so Dayne always gets the full notice window.
     */
    public function effectiveGoLiveAt()
    {
        if (!$this->go_live_at) {
            return null;
        }
        if (!$this->preview_sent_at) {
            return $this->go_live_at;
        }
        $earliest = $this->preview_sent_at->copy()->addMinutes(AdSettings::noticeMinutes());
        return $this->go_live_at->greaterThan($earliest) ? $this->go_live_at : $earliest;
    }
}
