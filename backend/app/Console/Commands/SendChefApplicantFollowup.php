<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendChefApplicantFollowup extends Command
{
    protected $signature = 'chef:send-applicant-followup
        {--dry-run : Render every email and print it without contacting Resend}
        {--test= : Send a single verbatim copy to this address and stop, without touching the roster or the log}
        {--force : Send even to addresses already present in the outreach log}
        {--roster= : Path to the roster JSON (defaults to storage/app/chef-applicants.json)}
        {--batch= : Label recorded in the outreach log for this run}';

    protected $description = 'Send a one-off acknowledgement email to chef applicants from Indeed';

    private const FROM = 'Taist <contact@taist.app>';
    private const REPLY_TO = 'dayne@taist.app';
    private const LOG_PATH = 'docs/chef-outreach-log.md';
    private const DEFAULT_ROSTER = 'app/chef-applicants.json';

    public function handle()
    {
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');
        $testAddress = $this->option('test');

        $apiKey = env('RESEND_API_KEY');
        if (! $dryRun) {
            $keyError = $this->validateApiKey($apiKey);
            if ($keyError !== null) {
                $this->error($keyError);
                $this->line('Get it from Railway > taist-mono > production environment > Variables > RESEND_API_KEY.');
                return 1;
            }
        }

        $roster = $this->loadRoster();
        if ($roster === null) {
            return 1;
        }

        $batch = $this->option('batch') ?: ($roster['batch'] ?? 'indeed-batch');
        $recipients = $roster['recipients'];

        // A test send goes to one address only, rendered exactly as the first
        // real recipient would receive it, so nothing about it is a special case.
        if (! empty($testAddress)) {
            return $this->sendTest($apiKey, $testAddress, $recipients, $dryRun);
        }

        $alreadyContacted = $force ? [] : $this->loadContactedAddresses();

        $sent = [];
        $failed = [];
        $noEmail = [];
        $skipped = [];

        foreach ($recipients as $recipient) {
            $name = $recipient['name'];
            $email = $recipient['email'];

            if (empty($email)) {
                $noEmail[] = $recipient;
                continue;
            }

            $email = strtolower(trim($email));

            if (in_array($email, $alreadyContacted, true)) {
                $skipped[] = $recipient;
                continue;
            }

            if ($dryRun) {
                $this->preview($name, $email);
                continue;
            }

            $result = $this->deliver($apiKey, $email, $this->subject($name), $this->buildHtml($name), $this->buildText($name));

            if ($result === true) {
                $this->info("Sent to {$name} <{$email}>");
                $sent[] = $recipient;
            } else {
                $this->error("Failed for {$name} <{$email}>: {$result}");
                $failed[] = $recipient;
            }

            // Resend allows 2 requests/sec on the default plan.
            usleep(600000);
        }

        $this->printSummary($dryRun, count($recipients), $sent, $failed, $noEmail, $skipped);

        if (! $dryRun && ! empty($sent)) {
            $this->appendToLog($sent, $batch);
            $this->info('Recorded ' . count($sent) . ' contact(s) in ' . self::LOG_PATH);
        }

        return empty($failed) ? 0 : 1;
    }

    private function sendTest($apiKey, $testAddress, array $recipients, $dryRun)
    {
        $sample = null;
        foreach ($recipients as $recipient) {
            if (! empty($recipient['email'])) {
                $sample = $recipient['name'];
                break;
            }
        }

        if ($sample === null) {
            $this->error('The roster has no recipient with an email address to render a test from.');
            return 1;
        }

        $this->warn("Test mode: sending one copy to {$testAddress}, rendered as \"{$sample}\" would receive it.");
        $this->warn('The roster is not contacted and the outreach log is not written.');

        if ($dryRun) {
            $this->preview($sample, $testAddress);
            $this->info('DRY RUN - nothing was sent');
            return 0;
        }

        $result = $this->deliver($apiKey, $testAddress, $this->subject($sample), $this->buildHtml($sample), $this->buildText($sample));

        if ($result === true) {
            $this->info("Test email sent to {$testAddress}");
            return 0;
        }

        $this->error("Test email failed: {$result}");
        return 1;
    }

    /**
     * Catch an unset key or an unsubstituted placeholder before we spend a call on Resend.
     */
    private function validateApiKey($apiKey)
    {
        $apiKey = is_string($apiKey) ? trim($apiKey) : '';

        if ($apiKey === '') {
            return 'RESEND_API_KEY is not set. Export it before a live send, or use --dry-run.';
        }

        if (strpos($apiKey, '<') !== false || strpos($apiKey, '>') !== false) {
            return "RESEND_API_KEY is still a placeholder ({$apiKey}). Substitute the real key.";
        }

        if (strpos($apiKey, 're_') !== 0) {
            return 'RESEND_API_KEY does not look like a Resend key. Resend keys begin with "re_".';
        }

        return null;
    }

    private function loadRoster()
    {
        $path = $this->option('roster') ?: storage_path(self::DEFAULT_ROSTER);

        if (! file_exists($path)) {
            $this->error("Roster not found at {$path}");
            $this->line('Copy docs/chef-applicants.example.json to that path and fill in the batch.');
            return null;
        }

        $roster = json_decode(file_get_contents($path), true);

        if (! is_array($roster) || empty($roster['recipients']) || ! is_array($roster['recipients'])) {
            $this->error("Roster at {$path} is not valid JSON with a non-empty 'recipients' array.");
            return null;
        }

        foreach ($roster['recipients'] as $i => $recipient) {
            if (empty($recipient['name'])) {
                $this->error("Roster entry #{$i} is missing a name.");
                return null;
            }
            if (! empty($recipient['email']) && ! filter_var($recipient['email'], FILTER_VALIDATE_EMAIL)) {
                $this->error("Roster entry \"{$recipient['name']}\" has an invalid email: {$recipient['email']}");
                return null;
            }
        }

        return $roster;
    }

    private function subject($name)
    {
        return "Thanks for applying to Taist, {$name}";
    }

    private function buildHtml($name)
    {
        $name = e($name);
        $logo = e($this->logoUrl());

        return <<<HTML
<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#222;">
<p>Hi {$name},</p>
<p>Thanks for applying to the chef position with Taist. We wanted to reach out to let you know we have your application.</p>
<p>We've seen higher than anticipated interest in this role, so our review is taking a bit longer than planned. Someone from the Taist team will be reaching out to you this week, and we're genuinely excited to speak with you further.</p>
<p>Appreciate your patience in the meantime.</p>
<p>Best,<br>Taist</p>
<p style="margin-top:18px;"><img src="{$logo}" alt="Taist" width="120" height="60" style="width:120px;height:60px;border:0;outline:none;text-decoration:none;display:block;"></p>
</div>
HTML;
    }

    private function buildText($name)
    {
        return implode("\n\n", [
            "Hi {$name},",
            'Thanks for applying to the chef position with Taist. We wanted to reach out to let you know we have your application.',
            "We've seen higher than anticipated interest in this role, so our review is taking a bit longer than planned. Someone from the Taist team will be reaching out to you this week, and we're genuinely excited to speak with you further.",
            'Appreciate your patience in the meantime.',
            "Best,\nTaist",
        ]);
    }

    /**
     * Transparent Taist wordmark. Mirrors _logoUrl() in MapiController, but falls
     * back to the live host explicitly: an artisan run has no request context, so
     * an unset APP_URL would otherwise resolve to localhost and break the image.
     */
    private function logoUrl()
    {
        $base = rtrim((string) config('app.url'), '/');

        if ($base === '' || strpos($base, 'localhost') !== false) {
            $base = 'https://api.taist.app';
        }

        return $base . '/assets/images/logo-2.png';
    }

    private function preview($name, $email)
    {
        $this->line('');
        $this->line(str_repeat('=', 72));
        $this->line("To:       {$name} <{$email}>");
        $this->line('From:     ' . self::FROM);
        $this->line('Reply-To: ' . self::REPLY_TO);
        $this->line('Subject:  ' . $this->subject($name));
        $this->line(str_repeat('-', 72));
        $this->line($this->buildText($name));
    }

    /**
     * One API call per recipient so no candidate ever sees another candidate's address.
     */
    private function deliver($apiKey, $email, $subject, $html, $text)
    {
        try {
            $client = new \GuzzleHttp\Client();
            $response = $client->post('https://api.resend.com/emails', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $apiKey,
                    'Content-Type' => 'application/json',
                ],
                'json' => [
                    'from' => self::FROM,
                    'to' => [$email],
                    'reply_to' => self::REPLY_TO,
                    'subject' => $subject,
                    'html' => $html,
                    'text' => $text,
                ],
            ]);

            if ($response->getStatusCode() === 200) {
                return true;
            }

            return 'HTTP ' . $response->getStatusCode();
        } catch (\Exception $e) {
            Log::error('Chef applicant follow-up email error: ' . $e->getMessage());
            return $e->getMessage();
        }
    }

    private function logFile()
    {
        return base_path('../' . self::LOG_PATH);
    }

    private function loadContactedAddresses()
    {
        $file = $this->logFile();
        if (! file_exists($file)) {
            return [];
        }

        $addresses = [];
        foreach (file($file) as $line) {
            if (preg_match('/[\w.+-]+@[\w.-]+\.\w+/', $line, $m)) {
                $addresses[] = strtolower($m[0]);
            }
        }

        return $addresses;
    }

    private function appendToLog(array $sent, $batch)
    {
        $file = $this->logFile();
        $date = date('Y-m-d');

        $entry = "\n## {$date} - {$batch}\n\n";
        foreach ($sent as $recipient) {
            $entry .= "- {$recipient['name']} - {$recipient['email']} - {$recipient['phone']}\n";
        }

        if (! file_exists($file)) {
            $header = "# Chef Applicant Outreach Log\n\n"
                . "Every applicant emailed by `php artisan chef:send-applicant-followup`.\n"
                . "The command reads this file to avoid contacting the same person twice.\n"
                . "Gitignored: it holds applicant contact details.\n";
            file_put_contents($file, $header);
        }

        file_put_contents($file, $entry, FILE_APPEND);
    }

    private function printSummary($dryRun, $total, array $sent, array $failed, array $noEmail, array $skipped)
    {
        $this->line('');
        $this->line(str_repeat('=', 72));
        $this->info($dryRun ? 'DRY RUN - nothing was sent' : 'Send complete');
        $this->table(['Result', 'Count'], [
            [$dryRun ? 'would send' : 'sent', $dryRun ? $total - count($noEmail) - count($skipped) : count($sent)],
            ['failed', count($failed)],
            ['already contacted (skipped)', count($skipped)],
            ['no email on file', count($noEmail)],
        ]);

        foreach ($skipped as $recipient) {
            $this->line("Skipped, already contacted: {$recipient['name']} <{$recipient['email']}>");
        }

        foreach ($noEmail as $recipient) {
            $this->warn("Call or text manually: {$recipient['name']} {$recipient['phone']}");
        }
    }
}
