<?php

namespace App\Helpers;

use DateTime;
use DateTimeZone;
use Exception;
use Illuminate\Support\Facades\Log;

/**
 * Timezone Helper for US-based operations
 *
 * Maps US states to their primary timezone.
 * Note: Some states span multiple timezones (e.g., Indiana, Texas).
 * We use the most common timezone for each state.
 */
class TimezoneHelper
{
    /**
     * US State to Timezone mapping
     * Uses IANA timezone identifiers
     */
    private static $stateTimezones = [
        // Eastern Time (UTC-5 / UTC-4 DST)
        'CT' => 'America/New_York',
        'DE' => 'America/New_York',
        'DC' => 'America/New_York',
        'FL' => 'America/New_York',  // Most of FL is Eastern
        'GA' => 'America/New_York',
        'IN' => 'America/Indiana/Indianapolis',  // Most of IN is Eastern
        'KY' => 'America/New_York',  // Most of KY is Eastern
        'ME' => 'America/New_York',
        'MD' => 'America/New_York',
        'MA' => 'America/New_York',
        'MI' => 'America/Detroit',
        'NH' => 'America/New_York',
        'NJ' => 'America/New_York',
        'NY' => 'America/New_York',
        'NC' => 'America/New_York',
        'OH' => 'America/New_York',
        'PA' => 'America/New_York',
        'RI' => 'America/New_York',
        'SC' => 'America/New_York',
        'VT' => 'America/New_York',
        'VA' => 'America/New_York',
        'WV' => 'America/New_York',

        // Central Time (UTC-6 / UTC-5 DST)
        'AL' => 'America/Chicago',
        'AR' => 'America/Chicago',
        'IL' => 'America/Chicago',
        'IA' => 'America/Chicago',
        'KS' => 'America/Chicago',  // Most of KS is Central
        'LA' => 'America/Chicago',
        'MN' => 'America/Chicago',
        'MS' => 'America/Chicago',
        'MO' => 'America/Chicago',
        'NE' => 'America/Chicago',  // Most of NE is Central
        'ND' => 'America/Chicago',  // Most of ND is Central
        'OK' => 'America/Chicago',
        'SD' => 'America/Chicago',  // Most of SD is Central
        'TN' => 'America/Chicago',  // Most of TN is Central
        'TX' => 'America/Chicago',  // Most of TX is Central
        'WI' => 'America/Chicago',

        // Mountain Time (UTC-7 / UTC-6 DST)
        'AZ' => 'America/Phoenix',  // AZ doesn't observe DST (except Navajo Nation)
        'CO' => 'America/Denver',
        'ID' => 'America/Boise',    // Most of ID is Mountain
        'MT' => 'America/Denver',
        'NM' => 'America/Denver',
        'UT' => 'America/Denver',
        'WY' => 'America/Denver',

        // Pacific Time (UTC-8 / UTC-7 DST)
        'CA' => 'America/Los_Angeles',
        'NV' => 'America/Los_Angeles',
        'OR' => 'America/Los_Angeles',  // Most of OR is Pacific
        'WA' => 'America/Los_Angeles',

        // Alaska Time (UTC-9 / UTC-8 DST)
        'AK' => 'America/Anchorage',

        // Hawaii-Aleutian Time (UTC-10, no DST)
        'HI' => 'Pacific/Honolulu',

        // US Territories
        'PR' => 'America/Puerto_Rico',  // Atlantic Time, no DST
        'VI' => 'America/Virgin',       // Atlantic Time, no DST
        'GU' => 'Pacific/Guam',         // Chamorro Time
        'AS' => 'Pacific/Pago_Pago',    // Samoa Time
    ];

    /**
     * Default timezone if state is unknown or not provided
     */
    private static $defaultTimezone = 'America/Chicago';

    /**
     * Get timezone identifier for a US state
     *
     * @param string|null $state State abbreviation (e.g., 'IL', 'CA') or full name
     * @return string IANA timezone identifier (e.g., 'America/Chicago')
     */
    public static function getTimezoneForState(?string $state): string
    {
        if (empty($state)) {
            return self::$defaultTimezone;
        }

        // Normalize to uppercase 2-letter abbreviation
        $stateAbbrev = AppHelper::getStateAbbreviation($state);
        $stateAbbrev = strtoupper(trim($stateAbbrev));

        return self::$stateTimezones[$stateAbbrev] ?? self::$defaultTimezone;
    }

    /**
     * Format a Unix timestamp for display in a specific state's timezone
     *
     * @param int $timestamp Unix timestamp
     * @param string|null $state State abbreviation or full name
     * @param string $format PHP date format (default: 'M j, gA' = "Dec 24, 2PM")
     * @return string Formatted date/time string
     */
    public static function formatForState(int $timestamp, ?string $state, string $format = 'M j, gA'): string
    {
        try {
            $timezone = self::getTimezoneForState($state);
            $dateTime = new DateTime();
            $dateTime->setTimezone(new DateTimeZone($timezone));
            $dateTime->setTimestamp($timestamp);
            return $dateTime->format($format);
        } catch (Exception $e) {
            Log::error('TimezoneHelper::formatForState failed', [
                'timestamp' => $timestamp,
                'state' => $state,
                'error' => $e->getMessage()
            ]);
            // Fallback to default timezone
            $dateTime = new DateTime();
            $dateTime->setTimezone(new DateTimeZone(self::$defaultTimezone));
            $dateTime->setTimestamp($timestamp);
            return $dateTime->format($format);
        }
    }

    /**
     * Get both formatted date and time for SMS templates
     *
     * @param int $timestamp Unix timestamp
     * @param string|null $state State abbreviation or full name
     * @return array ['formatted' => 'Dec 24, 2PM', 'time' => '2:00 PM', 'timezone' => 'America/Chicago']
     */
    public static function formatForSms(int $timestamp, ?string $state): array
    {
        $timezone = self::getTimezoneForState($state);

        try {
            $dateTime = new DateTime();
            $dateTime->setTimezone(new DateTimeZone($timezone));
            $dateTime->setTimestamp($timestamp);

            return [
                'formatted' => $dateTime->format('M j, gA'),  // "Dec 24, 2PM"
                'time' => $dateTime->format('g:i A'),         // "2:00 PM"
                'timezone' => $timezone,
            ];
        } catch (Exception $e) {
            Log::error('TimezoneHelper::formatForSms failed', [
                'timestamp' => $timestamp,
                'state' => $state,
                'error' => $e->getMessage()
            ]);
            return [
                'formatted' => 'soon',
                'time' => 'soon',
                'timezone' => self::$defaultTimezone,
            ];
        }
    }

    /**
     * Get the default timezone
     *
     * @return string
     */
    public static function getDefaultTimezone(): string
    {
        return self::$defaultTimezone;
    }

    /**
     * Check if a timezone string is valid
     *
     * @param string|null $timezone IANA timezone identifier (e.g., 'America/Chicago')
     * @return bool
     */
    public static function isValidTimezone(?string $timezone): bool
    {
        if (empty($timezone)) {
            return false;
        }

        try {
            new DateTimeZone($timezone);
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Get today's date (YYYY-MM-DD) in a specific timezone
     *
     * @param string|null $timezone IANA timezone identifier (e.g., 'America/Chicago')
     *                              If invalid or null, falls back to default timezone
     * @return string Date in YYYY-MM-DD format
     */
    public static function getTodayInTimezone(?string $timezone): string
    {
        $tz = self::isValidTimezone($timezone) ? $timezone : self::$defaultTimezone;

        try {
            $dateTime = new DateTime('now', new DateTimeZone($tz));
            return $dateTime->format('Y-m-d');
        } catch (Exception $e) {
            Log::error('TimezoneHelper::getTodayInTimezone failed', [
                'timezone' => $timezone,
                'error' => $e->getMessage()
            ]);
            // Ultimate fallback - use server timezone
            return date('Y-m-d');
        }
    }

    /**
     * Get current timestamp in a specific timezone
     *
     * @param string|null $timezone IANA timezone identifier
     * @return DateTime
     */
    public static function getNowInTimezone(?string $timezone): DateTime
    {
        $tz = self::isValidTimezone($timezone) ? $timezone : self::$defaultTimezone;

        try {
            return new DateTime('now', new DateTimeZone($tz));
        } catch (Exception $e) {
            Log::error('TimezoneHelper::getNowInTimezone failed', [
                'timezone' => $timezone,
                'error' => $e->getMessage()
            ]);
            return new DateTime('now', new DateTimeZone(self::$defaultTimezone));
        }
    }

    /**
     * Get current time (HH:MM:SS) in a specific timezone
     *
     * @param string|null $timezone IANA timezone identifier (e.g., 'America/Chicago')
     *                              If invalid or null, falls back to default timezone
     * @return string Time in HH:MM:SS format
     */
    public static function getCurrentTimeInTimezone(?string $timezone): string
    {
        $tz = self::isValidTimezone($timezone) ? $timezone : self::$defaultTimezone;

        try {
            $dateTime = new DateTime('now', new DateTimeZone($tz));
            return $dateTime->format('H:i:s');
        } catch (Exception $e) {
            Log::error('TimezoneHelper::getCurrentTimeInTimezone failed', [
                'timezone' => $timezone,
                'error' => $e->getMessage()
            ]);
            // Ultimate fallback - use server timezone
            return date('H:i:s');
        }
    }
}
