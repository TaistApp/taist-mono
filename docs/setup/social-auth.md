# Social authentication setup

This doc lists the provider-side credentials needed to ship Google, Apple, and
Facebook sign-in. The code is already wired — once each provider is configured
and the placeholders below are replaced, an EAS build will work end-to-end.

## What's already in the repo

- **Backend**
  - `POST /mapi/social-login` — `app/Http/Controllers/SocialAuthController.php`
  - Migration `2026_05_03_000001_add_social_auth_to_users.php` adds
    `social_provider`, `social_id`, `email_verified` columns to `tbl_users`.
  - Token verification done server-side for each provider.
- **Frontend**
  - `app/services/socialAuth.ts` — per-provider native sign-in helpers.
  - `app/services/api.ts::SocialLoginAPI` — same login plumbing as `LoginAPI`.
  - Splash screen (`app/screens/common/splash/index.tsx`) shows the three
    buttons above the email login/signup pair.
  - `app.json` has the plugin entries and `extra` keys with placeholders.

Social signups always create a **customer** (`user_type = 1`). When we add chef
profile creation under an existing user, the same social login keeps working —
the user just adds a chef profile after authenticating.

## Required env vars (Railway → taist-mono)

| Var                        | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| `GOOGLE_OAUTH_CLIENT_IDS`  | Comma-separated list of accepted Google OAuth client IDs (iOS + Web).   |
| `APPLE_OAUTH_AUDIENCES`    | Comma-separated list of accepted Apple audiences (iOS bundle id).       |
| `FACEBOOK_APP_ID`          | Meta app id used to verify access tokens with `/debug_token`.           |
| `FACEBOOK_APP_SECRET`      | Meta app secret. Required to build the app access token. **Never ship to the client.** |

## Required `app.json` placeholders to replace

The following strings in `frontend/app.json` are placeholders — replace each
with the real value before doing an EAS build:

| Placeholder                                          | Replace with                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| `REPLACE_WITH_REVERSED_GOOGLE_IOS_CLIENT_ID`         | The reversed iOS client id (from the iOS plist Google gives you). |
| `REPLACE_WITH_GOOGLE_IOS_CLIENT_ID`                  | The full iOS client id (`...apps.googleusercontent.com`).     |
| `REPLACE_WITH_GOOGLE_WEB_CLIENT_ID`                  | The Web client id (used for `idToken` audience).              |
| `REPLACE_WITH_FACEBOOK_APP_ID`                       | Meta app id (numeric).                                        |
| `REPLACE_WITH_FACEBOOK_CLIENT_TOKEN`                 | Meta app client token (from app dashboard → settings → advanced). |

## Provider setup

### Apple

1. In Apple Developer → Identifiers, edit `org.taist.taist`.
2. Under Capabilities, enable **Sign In with Apple**. Save.
3. In Xcode, EAS Build will pick up `usesAppleSignIn: true` from `app.json`
   automatically — no further config needed.
4. Set `APPLE_OAUTH_AUDIENCES=org.taist.taist` in Railway.

### Google

1. In Google Cloud Console (project: `taist-mobile-app`) → APIs & Services →
   Credentials.
2. Create an **iOS** OAuth 2.0 client id with bundle id `org.taist.taist`.
   Note the client id and the reversed client id from the downloaded plist.
3. Create a **Web application** OAuth 2.0 client id (no redirect URIs needed
   for native flows). Note the client id — this is what Google embeds as the
   audience in the issued `id_token`.
4. Plug both into `app.json` placeholders and into Railway:
   `GOOGLE_OAUTH_CLIENT_IDS=<ios_client_id>,<web_client_id>`.

### Facebook

1. <https://developers.facebook.com/apps> → Create App → "Authenticate and
   request data from users with Facebook Login" → Other → Consumer.
   Use `contact@taist.app` as the developer email.
2. Add the **Facebook Login for iOS** product. Bundle id: `org.taist.taist`.
3. Settings → Basic — note the **App ID** and **App Secret**. Generate the
   **Client Token** from Settings → Advanced.
4. Replace the placeholders in `app.json` and set `FACEBOOK_APP_ID` /
   `FACEBOOK_APP_SECRET` in Railway.
5. Before the public release, the Facebook app needs to go through
   App Review for the `email` permission. For TestFlight builds you can
   add yourself + testers as developers/testers in the Roles tab.

## Build + ship checklist

- [ ] Apple capability enabled in dev portal; `APPLE_OAUTH_AUDIENCES` set.
- [ ] Google iOS + Web OAuth client IDs created; placeholders in `app.json`
      replaced; `GOOGLE_OAUTH_CLIENT_IDS` set in Railway.
- [ ] Facebook app created; placeholders in `app.json` replaced;
      `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` set in Railway.
- [ ] Run `php artisan migrate` on Railway (the new migration will run
      automatically on deploy if migrations are part of the deploy script).
- [ ] `eas build --platform ios --profile preview` and submit to TestFlight.

## Reference: response shape

`POST /mapi/social-login`

Request:
```json
{
  "provider": "google" | "apple" | "facebook",
  "token": "<provider id token / access token>",
  "email": "optional fallback (Apple only sends on first sign-in)",
  "first_name": "optional",
  "last_name": "optional"
}
```

Success response (mirrors `/mapi/login`):
```json
{
  "success": 1,
  "data": {
    "api_token": "...",
    "user": { /* tbl_users row */ }
  }
}
```
