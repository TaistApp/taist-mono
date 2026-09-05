<?php

namespace App\Console\Commands;

use App\Models\Waitlist;
use Illuminate\Console\Command;

/**
 * Removes bot signups from the waitlist table.
 *
 * Between roughly late July and mid August 2026 the public POST
 * /admin-api-v2/waitlist route was writable without a shared secret and the
 * marketing site had no bot protection. A subscription-bombing bot used both
 * waitlist forms to sign up other people's real email addresses, so those
 * strangers received Taist welcome mail. This finds those rows and, with
 * --force, deletes them.
 *
 * Dry run by default. Never touches a row that has already converted to a
 * real app user.
 */
class PurgeWaitlistSpam extends Command
{
    protected $signature = 'waitlist:purge-spam
                            {--force : Actually delete. Without this the command only reports.}
                            {--user-type= : Limit to 1 (consumer) or 2 (chef).}';

    protected $description = 'Find and remove bot-generated waitlist signups';

    public function handle()
    {
        $query = Waitlist::query()->orderBy('id');

        if ($userType = $this->option('user-type')) {
            if (!in_array($userType, ['1', '2'], true)) {
                $this->error('--user-type must be 1 or 2');
                return 1;
            }
            $query->where('user_type', (int) $userType);
        }

        $rows = $query->get();
        $this->info("Scanning {$rows->count()} waitlist rows…");

        // A converted signup became a real user. Whatever it looked like on the
        // way in, it is not spam and must never be deleted here.
        $candidates = $rows->reject(fn ($row) => (bool) $row->converted);

        // Group by canonical mailbox first. One address that signed up under
        // several different names is the clearest bot tell in the data, and it
        // can only be seen across rows.
        // Keyed by user type as well, so someone who legitimately joins both the
        // consumer and the chef list is not read as one address wearing two hats.
        $groups = $candidates->groupBy(
            fn ($row) => $row->user_type . '|' . $this->normalizeEmail((string) $row->email)
        );

        $flagged = [];

        foreach ($groups as $groupKey => $group) {
            $normalized = substr($groupKey, strpos($groupKey, '|') + 1);
            $distinctNames = $group->map(fn ($r) => strtolower(trim((string) $r->first_name)))
                ->unique()
                ->count();

            // Same mailbox, different identities each time. Real people do not
            // do this; every row in the group is bot output.
            if ($group->count() > 1 && $distinctNames > 1) {
                foreach ($group as $row) {
                    $flagged[] = [
                        'row' => $row,
                        'normalized' => $normalized,
                        'reason' => 'same address, ' . $distinctNames . ' different names',
                    ];
                }
                continue;
            }

            // Otherwise judge each row on its own merits, keeping the earliest
            // of an exact repeat.
            $first = true;
            foreach ($group as $row) {
                $reason = $this->spamReason($row, $normalized, $first);
                $first = false;

                if ($reason !== null) {
                    $flagged[] = ['row' => $row, 'normalized' => $normalized, 'reason' => $reason];
                }
            }
        }

        if (empty($flagged)) {
            $this->info('No spam signups found.');
            return 0;
        }

        usort($flagged, fn ($a, $b) => $a['row']->id <=> $b['row']->id);

        $this->newLine();
        $this->table(
            ['ID', 'Email', 'First name', 'Type', 'Reason'],
            array_map(fn ($f) => [
                $f['row']->id,
                $f['row']->email,
                $f['row']->first_name,
                $f['row']->user_type == 2 ? 'chef' : 'consumer',
                $f['reason'],
            ], $flagged)
        );

        $count = count($flagged);
        $kept = $candidates->count() - $count;
        $this->line("Flagged {$count}, keeping {$kept} (plus " . ($rows->count() - $candidates->count()) . ' converted).');

        if (!$this->option('force')) {
            $this->newLine();
            $this->warn('Dry run — nothing deleted.');
            $this->line('Review the table above, then re-run with --force to delete.');
            return 0;
        }

        if ($this->input->isInteractive() && !$this->confirm("Delete these {$count} row(s)?", false)) {
            $this->info('Aborted. Nothing deleted.');
            return 0;
        }

        Waitlist::whereIn('id', array_map(fn ($f) => $f['row']->id, $flagged))->delete();
        $this->info("Deleted {$count} spam waitlist row(s).");

        return 0;
    }

    /**
     * Why this row looks like a bot, or null if it looks legitimate.
     */
    private function spamReason(Waitlist $row, string $normalized, bool $isFirstOfGroup): ?string
    {
        if (!$isFirstOfGroup) {
            return 'duplicate of earlier signup';
        }

        // Gmail ignores dots, so bots sprinkle them to mint addresses that look
        // unique to a naive uniqueness constraint. Real people do not type four.
        $rawLocal = explode('@', strtolower(trim((string) $row->email)))[0] ?? '';
        $domain = explode('@', $normalized)[1] ?? '';

        if (in_array($domain, ['gmail.com', 'googlemail.com'], true)
            && substr_count($rawLocal, '.') >= 3) {
            return 'gmail dot-trick (' . substr_count($rawLocal, '.') . ' dots)';
        }

        $name = trim((string) $row->first_name);

        // Payload aimed at the confirmation email's subject line.
        if (preg_match('#https?://|<[a-z]|[\r\n]#i', $name)) {
            return 'markup or URL in name';
        }

        if ($this->looksLikeGibberish($name)) {
            return 'name is not a plausible name';
        }

        return null;
    }

    /**
     * Cheap pronounceability test for the random strings these bots use as
     * first names ("Cpcnd", "Bkxgkf", "Fnrkxzrf").
     *
     * Deliberately only judges plain single-token ASCII names. Anything with
     * accents, spaces or punctuation — the shapes real names take when they
     * are unusual — is left for a human to look at rather than guessed at.
     */
    private function looksLikeGibberish(string $name): bool
    {
        if (!preg_match('/^[a-z]+$/i', $name) || strlen($name) < 4) {
            return false;
        }

        $lower = strtolower($name);
        $vowels = preg_match_all('/[aeiou]/', $lower);

        // No vowel at all, counting y — "Spyt", "Mrps", "Wdkr".
        if (preg_match_all('/[aeiouy]/', $lower) === 0) {
            return true;
        }

        // Vowel-starved. Only judged on names long enough for the ratio to mean
        // something: plenty of real short names sit at 0.25 ("John", "Mark"),
        // and deleting a real signup costs far more than missing a bot one.
        if (strlen($lower) >= 6 && ($vowels / strlen($lower)) < 0.32) {
            return true;
        }

        // A run of four or more consonants.
        if (preg_match('/[bcdfghjklmnpqrstvwxz]{4,}/', $lower)) {
            return true;
        }

        // Real names put a vowel near the front.
        if (!preg_match('/[aeiouy]/', substr($lower, 0, 3))) {
            return true;
        }

        return false;
    }

    /**
     * Mirrors normalizeEmail() in the marketing site's api/_antispam.js so both
     * sides agree on what counts as the same mailbox.
     */
    private function normalizeEmail(string $email): string
    {
        $email = strtolower(trim($email));
        $at = strrpos($email, '@');

        if ($at === false || $at < 1) {
            return $email;
        }

        $local = substr($email, 0, $at);
        $domain = substr($email, $at + 1);
        $local = explode('+', $local)[0];

        if (in_array($domain, ['gmail.com', 'googlemail.com'], true)) {
            return str_replace('.', '', $local) . '@gmail.com';
        }

        return $local . '@' . $domain;
    }
}
