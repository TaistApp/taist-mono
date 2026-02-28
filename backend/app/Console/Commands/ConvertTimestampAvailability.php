<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Helpers\TimezoneHelper;
use DateTime;
use DateTimeZone;

/**
 * One-time migration: convert legacy Unix timestamp availability values to HH:MM format.
 *
 * The original mobile app stored availability times as Unix timestamps (e.g., 1723435200).
 * The backend's normalizeTimeValue() converts these using date('H:i') in UTC, but the
 * timestamps were created in each chef's local timezone. This produces wrong times
 * (e.g., 04:00-03:59 instead of 00:00-23:59) causing zero timeslots for customers.
 *
 * This command converts all timestamp values to "HH:MM" strings in the chef's timezone.
 *
 * Edge cases handled:
 *  - Duration < 30 min (1800s): treated as not available, set to 0/0
 *  - Wrap-around (start >= end after conversion): end capped at 23:59
 */
class ConvertTimestampAvailability extends Command
{
    protected $signature = 'availability:convert-timestamps
        {--execute : Actually perform the update (default is dry-run)}';

    protected $description = 'Convert legacy Unix timestamp availability values to HH:MM format';

    private const DAY_FIELDS = [
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saterday', 'sunday',
    ];

    private const MIN_DURATION_SECS = 1800; // 30 minutes — minimum to fit one slot

    public function handle()
    {
        $dryRun = !$this->option('execute');

        if ($dryRun) {
            $this->info('=== DRY RUN MODE (use --execute to apply changes) ===');
        } else {
            $this->warn('=== EXECUTE MODE — changes will be written to the database ===');
            if (!$this->confirm('Are you sure you want to proceed?')) {
                $this->info('Aborted.');
                return 0;
            }
        }

        // Find all availability records that have at least one timestamp field
        $records = DB::table('tbl_availabilities as a')
            ->join('tbl_users as u', 'u.id', '=', 'a.user_id')
            ->where('u.user_type', 2)
            ->select('a.*', 'u.first_name', 'u.last_name', 'u.state')
            ->get();

        $totalRecords = 0;
        $convertedRecords = 0;
        $totalFieldsConverted = 0;
        $edgeCases = [];

        foreach ($records as $record) {
            $hasTimestamp = false;
            $updates = [];
            $fieldLog = [];

            // Determine chef's timezone from their state
            $timezone = TimezoneHelper::getTimezoneForState($record->state);

            foreach (self::DAY_FIELDS as $day) {
                $startField = $day . '_start';
                $endField = $day . '_end';
                $rawStart = $record->$startField;
                $rawEnd = $record->$endField;

                $startIsTimestamp = $this->isTimestamp($rawStart);
                $endIsTimestamp = $this->isTimestamp($rawEnd);

                if (!$startIsTimestamp && !$endIsTimestamp) {
                    continue; // Both are already HH:MM, null, or 0 — skip
                }

                $hasTimestamp = true;

                // Convert each field
                $newStart = $startIsTimestamp ? $this->convertTimestamp((int)$rawStart, $timezone) : $rawStart;
                $newEnd = $endIsTimestamp ? $this->convertTimestamp((int)$rawEnd, $timezone) : $rawEnd;

                // Edge case: duration too short to be meaningful
                if ($startIsTimestamp && $endIsTimestamp) {
                    $duration = (int)$rawEnd - (int)$rawStart;
                    if (abs($duration) < self::MIN_DURATION_SECS) {
                        $edgeCases[] = sprintf(
                            "  [SHORT] %s %s (id=%d): %s %s→%s (duration=%ds) → setting to 0/0",
                            $record->first_name, $record->last_name, $record->user_id,
                            $day, $rawStart, $rawEnd, $duration
                        );
                        $updates[$startField] = '0';
                        $updates[$endField] = '0';
                        $totalFieldsConverted += 2;
                        $fieldLog[] = sprintf("%s: %s→0 / %s→0 [SHORT]", $day, $rawStart, $rawEnd);
                        continue;
                    }
                }

                // Edge case: wrap-around (start >= end after conversion)
                if ($newStart && $newEnd && $newStart !== '0' && $newEnd !== '0' && $newStart >= $newEnd) {
                    $edgeCases[] = sprintf(
                        "  [WRAP]  %s %s (id=%d): %s %s→%s → %s→23:59 (was %s)",
                        $record->first_name, $record->last_name, $record->user_id,
                        $day, $rawStart, $rawEnd, $newStart, $newEnd
                    );
                    $newEnd = '23:59';
                }

                if ($startIsTimestamp) {
                    $updates[$startField] = $newStart;
                    $totalFieldsConverted++;
                }
                if ($endIsTimestamp) {
                    $updates[$endField] = $newEnd;
                    $totalFieldsConverted++;
                }

                $fieldLog[] = sprintf("%s: %s→%s / %s→%s",
                    $day,
                    $rawStart, $updates[$startField] ?? $rawStart,
                    $rawEnd, $updates[$endField] ?? $rawEnd
                );
            }

            if (!$hasTimestamp) {
                continue;
            }

            $totalRecords++;

            if (empty($updates)) {
                continue;
            }

            $convertedRecords++;

            $this->line(sprintf(
                "\n[%d] %s %s (user_id=%d, state=%s, tz=%s)",
                $record->id, $record->first_name, $record->last_name,
                $record->user_id, $record->state ?? 'NULL', $timezone
            ));
            foreach ($fieldLog as $log) {
                $this->line("  $log");
            }

            if (!$dryRun) {
                $updates['updated_at'] = now();
                DB::table('tbl_availabilities')
                    ->where('id', $record->id)
                    ->update($updates);
                $this->info("  ✓ Updated");
            }
        }

        $this->newLine();
        $this->info("=== Summary ===");
        $this->info("Records scanned:    " . $records->count());
        $this->info("Records with timestamps: $totalRecords");
        $this->info("Records to update:  $convertedRecords");
        $this->info("Fields to convert:  $totalFieldsConverted");

        if (!empty($edgeCases)) {
            $this->newLine();
            $this->warn("Edge cases:");
            foreach ($edgeCases as $case) {
                $this->line($case);
            }
        }

        if ($dryRun) {
            $this->newLine();
            $this->info('Dry run complete. Use --execute to apply changes.');
        } else {
            $this->newLine();
            $this->info('Migration complete!');
            Log::info('ConvertTimestampAvailability: migrated', [
                'records_updated' => $convertedRecords,
                'fields_converted' => $totalFieldsConverted,
            ]);
        }

        return 0;
    }

    /**
     * Check if a value is a legacy Unix timestamp (9+ digit numeric string).
     */
    private function isTimestamp($value): bool
    {
        if (empty($value) || $value === '0' || $value === 0) {
            return false;
        }
        return is_numeric($value) && strlen((string)$value) >= 9;
    }

    /**
     * Convert a Unix timestamp to "HH:MM" in the given timezone.
     */
    private function convertTimestamp(int $timestamp, string $timezone): string
    {
        $dt = new DateTime();
        $dt->setTimezone(new DateTimeZone($timezone));
        $dt->setTimestamp($timestamp);
        return $dt->format('H:i');
    }
}
