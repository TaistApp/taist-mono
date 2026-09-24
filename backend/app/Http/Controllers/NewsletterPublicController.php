<?php

namespace App\Http\Controllers;

use App\Models\NewsletterEdition;
use App\Services\NewsletterService;
use Illuminate\Http\Request;

/**
 * Public, token-signed newsletter links: unsubscribe (footer link and the
 * RFC 8058 one-click List-Unsubscribe-Post), resubscribe, and the "pause this
 * send" link in Dayne's preview email. GET only ever shows a confirmation
 * page, so mail scanners that prefetch links cannot change anything.
 */
class NewsletterPublicController extends Controller
{
    private $newsletters;

    public function __construct(NewsletterService $newsletters)
    {
        $this->newsletters = $newsletters;
    }

    public function unsubscribeForm(Request $request)
    {
        [$email, $token] = $this->emailAndToken($request);
        if (!$this->newsletters->verifyUnsubscribeToken($email, $token)) {
            return $this->invalidLink();
        }

        if ($this->newsletters->isUnsubscribed($email)) {
            return $this->unsubscribedPage($email, $token);
        }

        return $this->page('Unsubscribe from Taist newsletters?', [
            "{$email} will stop receiving Taist newsletters.",
            'You will still get emails about your account and orders.',
        ], [
            'action' => $this->signedAction('/newsletter/unsubscribe', $email, $token),
            'button' => 'Unsubscribe',
        ]);
    }

    /**
     * Handles both the confirmation button and one-click unsubscribe from
     * mail clients (POST with List-Unsubscribe=One-Click, no page shown).
     */
    public function unsubscribe(Request $request)
    {
        [$email, $token] = $this->emailAndToken($request);
        if (!$this->newsletters->verifyUnsubscribeToken($email, $token)) {
            return $this->invalidLink(403);
        }

        $oneClick = $request->input('List-Unsubscribe') === 'One-Click';
        $this->newsletters->unsubscribe($email, null, $oneClick ? 'one-click' : 'link');

        if ($oneClick) {
            return response('Unsubscribed', 200);
        }

        return $this->unsubscribedPage($email, $token);
    }

    public function resubscribe(Request $request)
    {
        [$email, $token] = $this->emailAndToken($request);
        if (!$this->newsletters->verifyUnsubscribeToken($email, $token)) {
            return $this->invalidLink(403);
        }

        $this->newsletters->resubscribe($email);

        return $this->page("You're back on the list", [
            "{$email} will receive Taist newsletters again. Welcome back!",
        ]);
    }

    public function pauseForm(Request $request, $id)
    {
        $edition = NewsletterEdition::find($id);
        if (!$edition || !$this->newsletters->verifyPauseToken($edition, $request->query('t'))) {
            return $this->invalidLink();
        }

        if ($edition->status !== NewsletterEdition::STATUS_SCHEDULED) {
            return $this->page('Nothing to pause', [
                $edition->displayName() . ' is ' . $edition->status . ', not scheduled, so there is nothing to pause.',
            ]);
        }

        return $this->page('Pause ' . $edition->displayName() . '?', [
            'It will not send. It goes back to a draft in the admin panel, where you can edit and reschedule it.',
        ], [
            'action' => '/newsletter/pause/' . $edition->id . '?' . http_build_query(['t' => $request->query('t')]),
            'button' => 'Pause this send',
        ]);
    }

    public function pause(Request $request, $id)
    {
        $edition = NewsletterEdition::find($id);
        if (!$edition || !$this->newsletters->verifyPauseToken($edition, $request->query('t'))) {
            return $this->invalidLink(403);
        }

        // Conditional update: a send that has already started cannot be paused.
        $paused = NewsletterEdition::where('id', $edition->id)
            ->where('status', NewsletterEdition::STATUS_SCHEDULED)
            ->update(['status' => NewsletterEdition::STATUS_DRAFT, 'preview_sent_at' => null]);

        if ($paused !== 1) {
            return $this->page('Too late to pause', [
                $edition->displayName() . ' is already ' . $edition->fresh()->status . '.',
            ]);
        }

        return $this->page('Paused', [
            $edition->displayName() . ' will not send. It is back to a draft in the admin panel.',
        ], null, 'Reschedule it from Admin > Marketing > Newsletters.');
    }

    private function unsubscribedPage(string $email, string $token)
    {
        return $this->page("You're unsubscribed", [
            "{$email} will no longer receive Taist newsletters.",
        ], [
            'action' => $this->signedAction('/newsletter/resubscribe', $email, $token),
            'button' => 'Unsubscribed by mistake? Resubscribe',
            'style' => 'secondary',
        ]);
    }

    private function emailAndToken(Request $request): array
    {
        return [
            $this->newsletters->normalizeEmail((string) $request->query('e', $request->input('e', ''))),
            (string) $request->query('t', $request->input('t', '')),
        ];
    }

    // Relative on purpose: behind Railway's proxy url() can yield http://, and a
    // POST to that would be redirected to https as a GET.
    private function signedAction(string $path, string $email, string $token): string
    {
        return $path . '?' . http_build_query(['e' => $email, 't' => $token]);
    }

    private function invalidLink(int $status = 404)
    {
        return $this->page('This link is not valid', [
            'It may be incomplete or out of date. Email contact@taist.app and we will sort it out.',
        ], null, null, $status);
    }

    private function page(string $title, array $message, ?array $form = null, ?string $footnote = null, int $status = 200)
    {
        return response()->view('newsletter.page', compact('title', 'message', 'form', 'footnote'), $status);
    }
}
