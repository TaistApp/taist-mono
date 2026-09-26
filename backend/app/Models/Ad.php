<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ad extends Model
{
    protected $table = 'tbl_ads';

    // Meta call_to_action types offered in the editor, with their button text.
    const CTAS = [
        'LEARN_MORE' => 'Learn more',
        'ORDER_NOW' => 'Order now',
        'DOWNLOAD' => 'Download',
        'INSTALL_MOBILE_APP' => 'Install now',
        'GET_OFFER' => 'Get offer',
        'SIGN_UP' => 'Sign up',
    ];

    // Meta's recommended lengths. Longer copy still runs but gets truncated.
    const PRIMARY_TEXT_LIMIT = 125;
    const HEADLINE_LIMIT = 40;
    const DESCRIPTION_LIMIT = 30;

    // Fields an admin may edit on an ad.
    const CONTENT_FIELDS = [
        'angle',
        'primary_text',
        'headline',
        'description',
        'cta',
        'link_url',
        'image_url',
        'dish_photo_id',
        'backlog_id',
        'source_ig_media_id',
        'source_permalink',
    ];

    protected $fillable = [
        'batch_id',
        'backlog_id',
        'sort',
        'angle',
        'primary_text',
        'headline',
        'description',
        'cta',
        'link_url',
        'image_url',
        'dish_photo_id',
        'meta_ad_id',
        'meta_creative_id',
        'meta_content_hash',
        'meta_status',
        'meta_note',
        'source_ig_media_id',
        'source_permalink',
    ];

    protected $casts = [
        'batch_id' => 'integer',
        'backlog_id' => 'integer',
        'sort' => 'integer',
        'dish_photo_id' => 'integer',
    ];

    /**
     * Fingerprint of everything Meta's copy of the ad is built from, so an
     * edit made after upload can be detected and re-uploaded.
     */
    public function contentHash(): string
    {
        return hash('sha256', json_encode([
            $this->primary_text, $this->headline, $this->description,
            $this->cta, $this->link_url, $this->image_url, $this->source_ig_media_id,
        ]));
    }

    public function ctaLabel(): string
    {
        return self::CTAS[$this->cta] ?? self::CTAS['LEARN_MORE'];
    }
}
