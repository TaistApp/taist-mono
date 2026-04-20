# CLAUDE.md — Project Guidelines for Claude Code

## Account & Credential Changes

When any account, credential, or ownership detail is changed (Expo, Apple, GitHub, Firebase, etc.), always update **all** of the following files to keep them in sync:

- `docs/TECH-STACK.md` — Accounts & Access table
- `docs/TECH-STACK-OVERVIEW.md` — Key Accounts & Access table
- `frontend/README.md` — EAS Build Setup section and developer onboarding section
- `frontend/DEPLOYMENT.md` — Required Access section and any hardcoded account references
- `frontend/CHANGELOG.md` — If the change is infrastructure-level

## Forcing App Updates (Minimum Version)

To force users to update to a new version:
1. Confirm the new version is **live on the App Store**
2. Go to Railway → taist-mono service → Variables → set `MIN_VERSION` to the new version
3. Railway redeploys automatically — `version:sync` writes it to the DB

**Never raise `MIN_VERSION` before the new version is available on the App Store.**
The app version in `app.json` and `MIN_VERSION` are intentionally separate — bumping `app.json` during development must never affect users.

See `frontend/VERSION-BUMP-GUIDE.md` for full details.

## Current Account Ownership

| Service           | Account                   | Owner  |
| ----------------- | ------------------------- | ------ |
| Expo / EAS        | a.daynearnett@gmail.com   | Dayne — org: `taistapp` |
| App Store Connect | a.daynearnett@gmail.com   | Dayne — Apple Team ID: WXY2PMFQB7 |
| Firebase / GCP    | contact@taist.app         | Taist — project: `taist-mobile-app` |
| GitHub            | TaistApp org              | contact@taist.app |

## Expo Project

- **Org slug:** `taistapp`
- **App slug:** `taist`
- **Project ID:** `db11fb8c-995e-4b39-8fa5-8b426fada4dd`
- **EAS Dashboard:** https://expo.dev/accounts/taistapp/projects/taist
