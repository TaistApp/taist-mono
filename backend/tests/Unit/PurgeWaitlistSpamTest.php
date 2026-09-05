<?php

namespace Tests\Unit;

use App\Console\Commands\PurgeWaitlistSpam;
use ReflectionClass;
use Tests\TestCase;

/**
 * Guards the name heuristic behind `waitlist:purge-spam`.
 *
 * This command deletes production rows, so a false positive destroys a real
 * person's signup. The first dry run against production (Sep 2026, 346 rows
 * flagged) proved that risk concrete: it flagged "Anthony" — Dayne's own chef
 * signup — because the vowel ratio counted [aeiou] and not y, putting Anthony
 * at 2/7 = 0.29 under a 0.32 bar. Kathryn, Sydney, Bradley and Timothy sat in
 * the same trap, as did Chris, Chloe and Christine under a rule that demanded a
 * vowel in the first three characters.
 *
 * The real-name cases below are the regression guard. They matter more than the
 * bot cases: missing a bot costs one junk row, deleting a real signup costs a
 * customer.
 */
class PurgeWaitlistSpamTest extends TestCase
{
    private function looksLikeGibberish(string $name): bool
    {
        $command = (new ReflectionClass(PurgeWaitlistSpam::class))->newInstanceWithoutConstructor();
        $method = (new ReflectionClass(PurgeWaitlistSpam::class))->getMethod('looksLikeGibberish');
        $method->setAccessible(true);

        return $method->invoke($command, $name);
    }

    /**
     * CONTROL — real names must never be flagged. Every one of these was, or
     * would have been, caught by the original heuristic.
     */
    public function real_names_provider(): array
    {
        return [
            ['Anthony'],   ['Kathryn'],   ['Sydney'],    ['Bradley'],
            ['Timothy'],   ['Kimberly'],  ['Jocelyn'],   ['Crystal'],
            ['Chris'],     ['Chloe'],     ['Christine'], ['Schuyler'],
            ['John'],      ['Mark'],      ['Dayne'],     ['Daryl'],
            ['Yvonne'],    ['Lynn'],      ['Bryan'],     ['Phyllis'],
        ];
    }

    /** @dataProvider real_names_provider */
    public function test_real_names_are_not_flagged(string $name)
    {
        $this->assertFalse(
            $this->looksLikeGibberish($name),
            "\"{$name}\" is a real name and must never be flagged for deletion."
        );
    }

    /**
     * Bot output actually seen in the production table.
     *
     * Vowel-rich fabrications like "Mzbiauut" are deliberately absent: the
     * name heuristic cannot tell them from a real name and should not try.
     * Production catches those by the gmail dot-trick in their address.
     */
    public function bot_names_provider(): array
    {
        return [
            ['Bcxwkyx'], ['Gwqdrlyn'], ['Zgxfgn'], ['Fdtgjn'],
            ['Hkpjal'],  ['Mrps'],     ['Wdkr'],   ['Qgbrjjms'],
            ['Qzdsa'],   ['Xbkazjrg'], ['Ndzj'],   ['Mhnp'],
        ];
    }

    /** @dataProvider bot_names_provider */
    public function test_bot_names_are_flagged(string $name)
    {
        $this->assertTrue(
            $this->looksLikeGibberish($name),
            "\"{$name}\" is bot output and should be flagged."
        );
    }

    /** Names too short to judge are left alone rather than guessed at. */
    public function test_short_names_are_never_flagged()
    {
        $this->assertFalse($this->looksLikeGibberish('Jo'));
        $this->assertFalse($this->looksLikeGibberish('Ann'));
    }

    /** Anything not purely alphabetic is out of scope for this heuristic. */
    public function test_non_alphabetic_names_are_not_judged()
    {
        $this->assertFalse($this->looksLikeGibberish("O'Brien"));
        $this->assertFalse($this->looksLikeGibberish('Mary-Jane'));
    }
}
