<?php

namespace App\Services;

use App\Models\Ad;
use Illuminate\Support\Facades\Http;

/**
 * Minimal Meta Marketing API client for the paid ads pipeline. Creates one
 * ad per Taist ad (creative + ad, always PAUSED on creation) inside the
 * configured customer ad set, switches ads on and off, and lists recent
 * organic Instagram posts for recycling. It never creates campaigns or ad
 * sets and never touches budgets.
 *
 * Ads are ad-only ("dark") creatives: they run on Instagram and Facebook
 * but never appear on the Page or the @taist.team grid.
 */
class MetaAdsClient
{
    public function configured(): bool
    {
        return $this->missingConfig() === [];
    }

    /**
     * Token + ad account are enough for the one-time setup commands, which
     * run before an ad set exists.
     */
    public function canReachAccount(): bool
    {
        return trim((string) config('app.meta_access_token')) !== ''
            && trim((string) config('app.meta_ad_account_id')) !== '';
    }

    /**
     * Railway variables still to set before ads can publish.
     */
    public function missingConfig(): array
    {
        $missing = [];
        foreach ([
            'META_ACCESS_TOKEN' => 'app.meta_access_token',
            'META_AD_ACCOUNT_ID' => 'app.meta_ad_account_id',
            'META_ADSET_ID' => 'app.meta_adset_id',
            'META_PAGE_ID' => 'app.meta_page_id',
            'META_INSTAGRAM_USER_ID' => 'app.meta_instagram_user_id',
        ] as $env => $key) {
            if (trim((string) config($key)) === '') {
                $missing[] = $env;
            }
        }
        return $missing;
    }

    /**
     * Create the creative and a PAUSED ad for one Taist ad.
     *
     * @return array ['creative_id' => string, 'ad_id' => string]
     * @throws \RuntimeException with Meta's error message
     */
    public function createPausedAd(Ad $ad, string $name): array
    {
        $link = $ad->link_url ?: AdService::DEFAULT_LINK_URL;

        if ($ad->source_ig_media_id) {
            // Promote an existing organic Instagram post as-is.
            $creative = $this->post($this->account() . '/adcreatives', [
                'name' => $name,
                'object_id' => (string) config('app.meta_page_id'),
                'instagram_user_id' => (string) config('app.meta_instagram_user_id'),
                'source_instagram_media_id' => (string) $ad->source_ig_media_id,
                'call_to_action' => json_encode(['type' => $ad->cta ?: 'LEARN_MORE', 'value' => ['link' => $link]]),
            ]);
            return $this->createAd($creative['id'], $name);
        }

        $linkData = array_filter([
            'message' => (string) $ad->primary_text,
            'name' => (string) $ad->headline,
            'description' => $ad->description ?: null,
            'link' => $link,
            'picture' => $ad->image_url,
            'call_to_action' => ['type' => $ad->cta ?: 'LEARN_MORE', 'value' => ['link' => $link]],
        ], function ($v) {
            return $v !== null && $v !== '';
        });

        $creative = $this->post($this->account() . '/adcreatives', [
            'name' => $name,
            'object_story_spec' => json_encode([
                'page_id' => (string) config('app.meta_page_id'),
                'instagram_user_id' => (string) config('app.meta_instagram_user_id'),
                'link_data' => $linkData,
            ]),
        ]);

        return $this->createAd($creative['id'], $name);
    }

    private function createAd(string $creativeId, string $name): array
    {
        $created = $this->post($this->account() . '/ads', [
            'name' => $name,
            'adset_id' => (string) config('app.meta_adset_id'),
            'creative' => json_encode(['creative_id' => $creativeId]),
            'status' => 'PAUSED',
        ]);

        return ['creative_id' => $creativeId, 'ad_id' => (string) $created['id']];
    }

    /**
     * Taist's organic Instagram posts published since $since, with like and
     * comment counts.
     */
    public function recentInstagramMedia(\Carbon\Carbon $since): array
    {
        $posts = [];
        $path = (string) config('app.meta_instagram_user_id') . '/media';
        $params = [
            'fields' => 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
            'limit' => 50,
        ];

        // Newest first; stop paging once past the window.
        for ($page = 0; $page < 10; $page++) {
            $data = $this->get($path, $params);
            foreach ($data['data'] ?? [] as $post) {
                if (\Carbon\Carbon::parse($post['timestamp'] ?? 'now')->lessThan($since)) {
                    return $posts;
                }
                $posts[] = $post;
            }
            $after = $data['paging']['cursors']['after'] ?? null;
            if (!$after || empty($data['paging']['next'])) {
                break;
            }
            $params['after'] = $after;
        }

        return $posts;
    }

    /**
     * Switch the customer ad set (and its campaign) on if setup left them
     * paused. Spends nothing by itself: only ads that are also ACTIVE deliver.
     */
    public function ensureAdSetActive(): void
    {
        $adsetId = (string) config('app.meta_adset_id');
        $adset = $this->get($adsetId, ['fields' => 'status,campaign_id']);
        if (!empty($adset['campaign_id'])) {
            $campaign = $this->get((string) $adset['campaign_id'], ['fields' => 'status']);
            if (($campaign['status'] ?? null) !== 'ACTIVE') {
                $this->setStatus((string) $adset['campaign_id'], 'ACTIVE');
            }
        }
        if (($adset['status'] ?? null) !== 'ACTIVE') {
            $this->setStatus($adsetId, 'ACTIVE');
        }
    }

    /**
     * @param  string  $status  ACTIVE | PAUSED | ARCHIVED
     */
    public function setStatus(string $adId, string $status): void
    {
        $this->post($adId, ['status' => $status]);
    }

    /**
     * Delivery/review state, e.g. ['effective_status' => 'DISAPPROVED', 'feedback' => '...'].
     */
    public function reviewState(string $adId): array
    {
        $data = $this->get($adId, ['fields' => 'effective_status,ad_review_feedback']);
        $feedback = collect($data['ad_review_feedback']['global'] ?? [])->map(function ($text, $key) {
            return is_string($text) ? $text : $key;
        })->implode(' ');

        return ['effective_status' => $data['effective_status'] ?? null, 'feedback' => $feedback ?: null];
    }

    public function account(): string
    {
        $id = trim((string) config('app.meta_ad_account_id'));
        return strpos($id, 'act_') === 0 ? $id : 'act_' . $id;
    }

    private function url(string $path): string
    {
        return 'https://graph.facebook.com/' . config('app.meta_graph_version', 'v23.0') . '/' . ltrim($path, '/');
    }

    public function post(string $path, array $params): array
    {
        $response = Http::asForm()->timeout(30)
            ->post($this->url($path), $params + ['access_token' => (string) config('app.meta_access_token')]);
        return $this->decode($response);
    }

    public function get(string $path, array $params = []): array
    {
        $response = Http::timeout(30)
            ->get($this->url($path), $params + ['access_token' => (string) config('app.meta_access_token')]);
        return $this->decode($response);
    }

    private function decode($response): array
    {
        $body = $response->json() ?? [];
        if (!$response->successful() || isset($body['error'])) {
            $error = $body['error']['error_user_msg'] ?? $body['error']['message'] ?? ('HTTP ' . $response->status());
            throw new \RuntimeException('Meta: ' . $error);
        }
        return $body;
    }
}
