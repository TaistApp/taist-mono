<?php
namespace App\Helpers;

class AppHelper
{
    public function getPhotoURL($url, $is_photo=0) {
        if ($url == "") {
            if ($is_photo == 1)
                return '/assets/images/profile.png';
            return '/assets/images/photo_frame.png';
        }
        return '/assets/uploads/images/'.$url;
    }

    public function generateFlag($c) {
        $c = strtolower($c);
        $c = 'https://www.flagpictures.com/static/flags/vector/'.$c.'.svg';
        return $c;
    }

    /**
     * Convert US state name to 2-letter abbreviation
     * Returns the input if already abbreviated or not found
     */
    public static function getStateAbbreviation($state) {
        if (empty($state)) {
            return $state;
        }

        // If already 2 characters, assume it's already abbreviated
        if (strlen(trim($state)) === 2) {
            return strtoupper(trim($state));
        }

        $states = [
            'alabama' => 'AL', 'alaska' => 'AK', 'arizona' => 'AZ', 'arkansas' => 'AR',
            'california' => 'CA', 'colorado' => 'CO', 'connecticut' => 'CT', 'delaware' => 'DE',
            'florida' => 'FL', 'georgia' => 'GA', 'hawaii' => 'HI', 'idaho' => 'ID',
            'illinois' => 'IL', 'indiana' => 'IN', 'iowa' => 'IA', 'kansas' => 'KS',
            'kentucky' => 'KY', 'louisiana' => 'LA', 'maine' => 'ME', 'maryland' => 'MD',
            'massachusetts' => 'MA', 'michigan' => 'MI', 'minnesota' => 'MN', 'mississippi' => 'MS',
            'missouri' => 'MO', 'montana' => 'MT', 'nebraska' => 'NE', 'nevada' => 'NV',
            'new hampshire' => 'NH', 'new jersey' => 'NJ', 'new mexico' => 'NM', 'new york' => 'NY',
            'north carolina' => 'NC', 'north dakota' => 'ND', 'ohio' => 'OH', 'oklahoma' => 'OK',
            'oregon' => 'OR', 'pennsylvania' => 'PA', 'rhode island' => 'RI', 'south carolina' => 'SC',
            'south dakota' => 'SD', 'tennessee' => 'TN', 'texas' => 'TX', 'utah' => 'UT',
            'vermont' => 'VT', 'virginia' => 'VA', 'washington' => 'WA', 'west virginia' => 'WV',
            'wisconsin' => 'WI', 'wyoming' => 'WY',
            'district of columbia' => 'DC', 'puerto rico' => 'PR',
        ];

        $stateLower = strtolower(trim($state));
        return $states[$stateLower] ?? $state;
    }

    /**
     * Format phone number to E.164 format for US numbers
     * Returns null if phone is empty or invalid
     */
    public static function formatPhoneE164($phone) {
        if (empty($phone)) {
            return null;
        }

        // Remove all non-numeric characters
        $cleaned = preg_replace('/[^0-9]/', '', $phone);

        // If empty after cleaning, return null
        if (empty($cleaned)) {
            return null;
        }

        // If it's already 11 digits starting with 1, format it
        if (strlen($cleaned) === 11 && substr($cleaned, 0, 1) === '1') {
            return '+' . $cleaned;
        }

        // If it's 10 digits, assume US and add +1
        if (strlen($cleaned) === 10) {
            return '+1' . $cleaned;
        }

        // If it doesn't start with +, add it
        if (substr($phone, 0, 1) !== '+') {
            return '+' . $cleaned;
        }

        return $phone;
    }

    public static function instance()
    {
        return new AppHelper();
    }

    /**
     * Tiny HTML bounce page that returns the user to the app via a custom-scheme
     * deep link after Stripe onboarding. A bare 302 to taistexpo:// is unreliable
     * in Safari, so we JS-redirect immediately with a manual-tap fallback.
     *
     * Lives on this PSR-4 autoloaded class (not as a function in web.php) so it
     * stays callable even when routes are cached on deploy.
     */
    public static function stripeReturnPage(string $deepLink): \Illuminate\Http\Response
    {
        $json = json_encode($deepLink);
        $safe = htmlspecialchars($deepLink, ENT_QUOTES);
        $html = '<!doctype html><html lang="en"><head><meta charset="utf-8">'
            . '<meta name="viewport" content="width=device-width, initial-scale=1">'
            . '<title>Returning to Taist…</title>'
            . '<script>window.location.replace(' . $json . ');'
            . 'setTimeout(function(){window.location.href=' . $json . ';},600);</script>'
            . '</head><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;'
            . 'text-align:center;padding:48px 24px;color:#1a1a1a;">'
            . '<p style="font-size:18px;font-weight:600;">Returning you to Taist…</p>'
            . '<p style="margin-top:24px;"><a href="' . $safe . '" '
            . 'style="display:inline-block;background:#fa4616;color:#fff;text-decoration:none;'
            . 'font-weight:700;padding:14px 28px;border-radius:24px;">Open the Taist app</a></p>'
            . '</body></html>';
        return response($html)->header('Content-Type', 'text/html');
    }
}