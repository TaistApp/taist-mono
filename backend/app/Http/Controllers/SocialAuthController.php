<?php

namespace App\Http\Controllers;

use App\Listener;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use GuzzleHttp\Client as GuzzleClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * Social-auth login/signup endpoint for Google, Apple, and Facebook.
 *
 * The flow:
 *   1. Mobile client runs the native sign-in flow with the provider and obtains
 *      an ID token (Google, Apple) or access token (Facebook).
 *   2. Client POSTs that token here along with the provider name.
 *   3. We verify the token server-side with the provider, extract the
 *      provider's stable user id and email, then either look up an existing
 *      user or create a new customer (`user_type = 1`).
 *   4. Response shape matches MapiController::login — `{success, data: {api_token, user}}`
 *      so the frontend reuses the same login plumbing.
 */
class SocialAuthController extends Controller
{
    private const PROVIDER_GOOGLE = 'google';
    private const PROVIDER_APPLE = 'apple';
    private const PROVIDER_FACEBOOK = 'facebook';

    private function _taistApiKey()
    {
        return 'ra_jk6YK9QmAVqTazHIrF1vi3qnbtagCIJoZAzCR51lCpYY9nkTN6aPVeX15J49k';
    }

    private function _checktaistApiKey($mToken)
    {
        return $this->_taistApiKey() == $mToken;
    }

    private function _generateToken()
    {
        return Str::random(30) . uniqid() . Str::random(30);
    }

    public function login(Request $request)
    {
        if ($this->_checktaistApiKey($request->header('apiKey')) === false) {
            return response()->json(['success' => 0, 'error' => 'Access denied. Api key is not valid.']);
        }

        $validator = Validator::make($request->all(), [
            'provider' => 'required|string|in:google,apple,facebook',
            'token' => 'required|string',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => 0, 'error' => $validator->errors()->all()[0]]);
        }

        $provider = $request->input('provider');
        $token = $request->input('token');
        // Apple only returns first/last name on the FIRST sign-in — the client
        // forwards them so we can persist on user creation.
        $clientFirstName = trim((string) $request->input('first_name', ''));
        $clientLastName = trim((string) $request->input('last_name', ''));
        $clientEmail = trim((string) $request->input('email', ''));

        try {
            $verified = $this->verifyProviderToken($provider, $token);
        } catch (\Throwable $e) {
            Log::warning('[social-auth] token verification failed', [
                'provider' => $provider,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['success' => 0, 'error' => 'Could not verify ' . ucfirst($provider) . ' sign-in. Please try again.']);
        }

        $providerId = $verified['id'];
        $email = $verified['email'] ?: $clientEmail;
        $firstName = $verified['first_name'] ?: $clientFirstName;
        $lastName = $verified['last_name'] ?: $clientLastName;

        // 1. Match by (provider, social_id) — the only stable, spoof-proof key.
        $user = Listener::where('social_provider', $provider)
            ->where('social_id', $providerId)
            ->first();

        // 2. Otherwise, try to link to an existing email/password account so a
        //    user who originally signed up by email can later use social login.
        if (!$user && $email) {
            $user = Listener::where('email', $email)->first();
            if ($user) {
                $user->update([
                    'social_provider' => $provider,
                    'social_id' => $providerId,
                    'email_verified' => $verified['email_verified'] ? 1 : (int) $user->email_verified,
                ]);
            }
        }

        // 3. New user — create as customer (user_type = 1).
        if (!$user) {
            if (!$email) {
                return response()->json([
                    'success' => 0,
                    'error' => 'No email was returned by ' . ucfirst($provider) . '. Please try a different sign-in method.',
                ]);
            }
            // Belt-and-braces: a different account may already own this email
            // without a linked social_id (we handled that above), but if the
            // unique constraint still trips, return a friendly error.
            if (Listener::where('email', $email)->exists()) {
                return response()->json([
                    'success' => 0,
                    'error' => 'An account with this email already exists. Please log in with email and password, then link your social account from settings.',
                ]);
            }

            $apiToken = $this->_generateToken();
            $user = Listener::create([
                'email' => $email,
                'password' => '', // no password — social-only
                'api_token' => $apiToken,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'user_type' => 1, // customer
                'is_pending' => 0,
                'quiz_completed' => 1,
                'verified' => 1,
                'social_provider' => $provider,
                'social_id' => $providerId,
                'email_verified' => $verified['email_verified'] ? 1 : 0,
            ]);
        } else {
            // Existing user — refresh api_token if missing so the session is usable.
            if (empty($user->api_token)) {
                $user->update(['api_token' => $this->_generateToken()]);
            }
            // Backfill any name fields the user account never had set.
            $patch = [];
            if (empty($user->first_name) && $firstName) $patch['first_name'] = $firstName;
            if (empty($user->last_name) && $lastName) $patch['last_name'] = $lastName;
            if ($patch) $user->update($patch);
        }

        if ($user->verified != 1) {
            return response()->json(['success' => 0, 'error' => 'You need to verify the account first.']);
        }

        // Re-fetch so the response includes the latest fields.
        $user = Listener::find($user->id);

        return response()->json([
            'success' => 1,
            'data' => [
                'api_token' => $user->api_token,
                'user' => $user,
            ],
        ]);
    }

    /**
     * Verify a provider token and return a normalized payload:
     *   ['id' => string, 'email' => ?string, 'email_verified' => bool,
     *    'first_name' => ?string, 'last_name' => ?string]
     *
     * Throws on invalid token.
     */
    private function verifyProviderToken(string $provider, string $token): array
    {
        switch ($provider) {
            case self::PROVIDER_GOOGLE:
                return $this->verifyGoogleToken($token);
            case self::PROVIDER_APPLE:
                return $this->verifyAppleToken($token);
            case self::PROVIDER_FACEBOOK:
                return $this->verifyFacebookToken($token);
        }
        throw new \RuntimeException("Unknown provider: $provider");
    }

    /**
     * Google: verify the ID token via Google's tokeninfo endpoint and check
     * the audience matches one of our configured client IDs.
     */
    private function verifyGoogleToken(string $idToken): array
    {
        $client = new GuzzleClient(['timeout' => 10]);
        $resp = $client->get('https://oauth2.googleapis.com/tokeninfo', [
            'query' => ['id_token' => $idToken],
            'http_errors' => false,
        ]);
        if ($resp->getStatusCode() !== 200) {
            throw new \RuntimeException('Google tokeninfo returned ' . $resp->getStatusCode());
        }
        $payload = json_decode((string) $resp->getBody(), true);
        if (!is_array($payload) || empty($payload['sub'])) {
            throw new \RuntimeException('Google tokeninfo returned no sub');
        }

        $allowed = array_filter(array_map('trim', explode(',', (string) env('GOOGLE_OAUTH_CLIENT_IDS', ''))));
        if (!$allowed) {
            throw new \RuntimeException('GOOGLE_OAUTH_CLIENT_IDS env not configured');
        }
        if (!in_array($payload['aud'] ?? '', $allowed, true)) {
            throw new \RuntimeException('Google token audience mismatch');
        }
        if (($payload['iss'] ?? '') !== 'https://accounts.google.com' && ($payload['iss'] ?? '') !== 'accounts.google.com') {
            throw new \RuntimeException('Google token issuer invalid');
        }
        if (isset($payload['exp']) && (int) $payload['exp'] < time()) {
            throw new \RuntimeException('Google token expired');
        }

        return [
            'id' => $payload['sub'],
            'email' => $payload['email'] ?? null,
            'email_verified' => filter_var($payload['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'first_name' => $payload['given_name'] ?? null,
            'last_name' => $payload['family_name'] ?? null,
        ];
    }

    /**
     * Apple: verify the identity-token JWT against Apple's public keys.
     */
    private function verifyAppleToken(string $identityToken): array
    {
        $client = new GuzzleClient(['timeout' => 10]);
        $resp = $client->get('https://appleid.apple.com/auth/keys', ['http_errors' => false]);
        if ($resp->getStatusCode() !== 200) {
            throw new \RuntimeException('Apple keys endpoint returned ' . $resp->getStatusCode());
        }
        $jwks = json_decode((string) $resp->getBody(), true);
        if (!is_array($jwks) || empty($jwks['keys'])) {
            throw new \RuntimeException('Apple keys endpoint returned no keys');
        }

        $keys = JWK::parseKeySet($jwks);
        $decoded = (array) JWT::decode($identityToken, $keys);

        if (($decoded['iss'] ?? '') !== 'https://appleid.apple.com') {
            throw new \RuntimeException('Apple token issuer invalid');
        }

        // Audience can be the iOS bundle id or a Service ID — accept any of the
        // configured values.
        $allowed = array_filter(array_map('trim', explode(',', (string) env('APPLE_OAUTH_AUDIENCES', ''))));
        if (!$allowed) {
            throw new \RuntimeException('APPLE_OAUTH_AUDIENCES env not configured');
        }
        if (!in_array($decoded['aud'] ?? '', $allowed, true)) {
            throw new \RuntimeException('Apple token audience mismatch');
        }

        return [
            'id' => $decoded['sub'] ?? '',
            'email' => $decoded['email'] ?? null,
            'email_verified' => filter_var($decoded['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN),
            // Apple's identity token does not include name. The client must
            // pass first_name/last_name from the initial sign-in response.
            'first_name' => null,
            'last_name' => null,
        ];
    }

    /**
     * Facebook: validate the user access token by calling /debug_token with the
     * app token, then fetch the profile fields.
     */
    private function verifyFacebookToken(string $accessToken): array
    {
        $appId = env('FACEBOOK_APP_ID');
        $appSecret = env('FACEBOOK_APP_SECRET');
        if (!$appId || !$appSecret) {
            throw new \RuntimeException('FACEBOOK_APP_ID / FACEBOOK_APP_SECRET env not configured');
        }
        $appAccessToken = $appId . '|' . $appSecret;

        $client = new GuzzleClient(['timeout' => 10]);

        $debugResp = $client->get('https://graph.facebook.com/debug_token', [
            'query' => [
                'input_token' => $accessToken,
                'access_token' => $appAccessToken,
            ],
            'http_errors' => false,
        ]);
        if ($debugResp->getStatusCode() !== 200) {
            throw new \RuntimeException('Facebook debug_token returned ' . $debugResp->getStatusCode());
        }
        $debug = json_decode((string) $debugResp->getBody(), true);
        $debugData = $debug['data'] ?? [];
        if (empty($debugData['is_valid'])) {
            throw new \RuntimeException('Facebook token not valid');
        }
        if (($debugData['app_id'] ?? '') !== (string) $appId) {
            throw new \RuntimeException('Facebook token app_id mismatch');
        }
        if (isset($debugData['expires_at']) && (int) $debugData['expires_at'] > 0 && (int) $debugData['expires_at'] < time()) {
            throw new \RuntimeException('Facebook token expired');
        }

        $meResp = $client->get('https://graph.facebook.com/me', [
            'query' => [
                'fields' => 'id,email,first_name,last_name',
                'access_token' => $accessToken,
            ],
            'http_errors' => false,
        ]);
        if ($meResp->getStatusCode() !== 200) {
            throw new \RuntimeException('Facebook /me returned ' . $meResp->getStatusCode());
        }
        $me = json_decode((string) $meResp->getBody(), true);
        if (!is_array($me) || empty($me['id'])) {
            throw new \RuntimeException('Facebook /me returned no id');
        }

        return [
            'id' => $me['id'],
            'email' => $me['email'] ?? null,
            // Facebook returns email only when the user granted the email permission.
            'email_verified' => !empty($me['email']),
            'first_name' => $me['first_name'] ?? null,
            'last_name' => $me['last_name'] ?? null,
        ];
    }
}
