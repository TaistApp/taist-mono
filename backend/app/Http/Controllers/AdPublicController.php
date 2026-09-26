<?php

namespace App\Http\Controllers;

use App\Models\AdBatch;
use App\Services\AdService;
use Illuminate\Http\Request;

/**
 * The token-signed "pause this batch" link in Dayne's ads preview email.
 * GET only shows a confirmation page, so mail scanners that prefetch links
 * cannot pause anything.
 */
class AdPublicController extends Controller
{
    private $ads;

    public function __construct(AdService $ads)
    {
        $this->ads = $ads;
    }

    public function pauseForm(Request $request, $id)
    {
        $batch = AdBatch::find($id);
        if (!$batch || !$this->ads->verifyPauseToken($batch, $request->query('t'))) {
            return $this->page('This link is not valid', ['It may be incomplete or out of date.'], null, null, 404);
        }

        if ($batch->status !== AdBatch::STATUS_SCHEDULED) {
            return $this->page('Nothing to pause', [
                $batch->displayName() . ' is ' . $batch->status . ', not scheduled, so there is nothing to pause.',
            ]);
        }

        return $this->page('Pause ' . $batch->displayName() . '?', [
            'It will not go live. It goes back to a draft in the admin panel, where you can edit and reschedule it.',
        ], [
            'action' => '/ads/pause/' . $batch->id . '?' . http_build_query(['t' => $request->query('t')]),
            'button' => 'Pause this batch',
        ]);
    }

    public function pause(Request $request, $id)
    {
        $batch = AdBatch::find($id);
        if (!$batch || !$this->ads->verifyPauseToken($batch, $request->query('t'))) {
            return $this->page('This link is not valid', ['It may be incomplete or out of date.'], null, null, 403);
        }

        // Conditional update: a batch already approved cannot be paused here.
        $paused = AdBatch::where('id', $batch->id)
            ->where('status', AdBatch::STATUS_SCHEDULED)
            ->update(['status' => AdBatch::STATUS_DRAFT, 'preview_sent_at' => null]);

        if ($paused !== 1) {
            return $this->page('Too late to pause', [
                $batch->displayName() . ' is already ' . $batch->fresh()->status . '.',
            ]);
        }

        return $this->page('Paused', [
            $batch->displayName() . ' will not go live. It is back to a draft in the admin panel.',
        ], null, 'Reschedule it from Admin > Marketing > Ads.');
    }

    private function page(string $title, array $message, ?array $form = null, ?string $footnote = null, int $status = 200)
    {
        return response()->view('newsletter.page', compact('title', 'message', 'form', 'footnote'), $status);
    }
}
