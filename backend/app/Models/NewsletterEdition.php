<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NewsletterEdition extends Model
{
    protected $table = 'tbl_newsletter_editions';

    const STATUS_DRAFT = 'draft';
    const STATUS_SCHEDULED = 'scheduled';
    const STATUS_SENDING = 'sending';
    const STATUS_SENT = 'sent';
    const STATUS_CANCELLED = 'cancelled';

    const MAX_ITEMS = 5;

    // Content fields an admin may edit. Status and delivery columns are only
    // changed through the dedicated schedule/unschedule actions and the sender.
    const CONTENT_FIELDS = [
        'kind',
        'subject',
        'preheader',
        'eyebrow',
        'headline',
        'intro',
        'callout_title',
        'callout_subtitle',
        'items_heading',
        'items',
        'closing',
        'signoff',
        'cta_label',
        'cta_url',
        'notes',
    ];

    protected $fillable = [
        'user_type',
        'kind',
        'edition_number',
        'status',
        'subject',
        'preheader',
        'eyebrow',
        'headline',
        'intro',
        'callout_title',
        'callout_subtitle',
        'items_heading',
        'items',
        'closing',
        'signoff',
        'cta_label',
        'cta_url',
        'send_at',
        'preview_sent_at',
        'sent_at',
        'recipient_count',
        'sent_count',
        'failed_count',
        'created_by',
        'notes',
    ];

    protected $casts = [
        'user_type' => 'integer',
        'edition_number' => 'integer',
        'items' => 'array',
        'send_at' => 'datetime',
        'preview_sent_at' => 'datetime',
        'sent_at' => 'datetime',
        'recipient_count' => 'integer',
        'sent_count' => 'integer',
        'failed_count' => 'integer',
    ];

    public function isEditable(): bool
    {
        return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_SCHEDULED], true);
    }

    public function audienceLabel(): string
    {
        return $this->user_type === 2 ? 'chef' : 'customer';
    }

    /**
     * Short human name, e.g. "Chef Regular #2" or "Customer Special".
     */
    public function displayName(): string
    {
        $name = ucfirst($this->audienceLabel()) . ' ' . ucfirst($this->kind ?: 'regular');
        return $this->edition_number ? "{$name} #{$this->edition_number}" : $name;
    }

    /**
     * When the send may actually happen: the scheduled time, pushed back if
     * the preview went out late, so Dayne always gets the full notice window.
     */
    public function effectiveSendAt()
    {
        if (!$this->send_at) {
            return null;
        }
        if (!$this->preview_sent_at) {
            return $this->send_at;
        }
        $earliest = $this->preview_sent_at->copy()->addMinutes(NewsletterSettings::noticeMinutes());
        return $this->send_at->greaterThan($earliest) ? $this->send_at : $earliest;
    }
}
