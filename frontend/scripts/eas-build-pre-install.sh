#!/bin/bash
# Restore Firebase config files from EAS Secrets during EAS Build.
# These files are not checked into git to avoid leaking API keys.

set -euo pipefail

if [ -n "${GOOGLE_SERVICE_INFO_PLIST_BASE64:-}" ]; then
  echo "Restoring GoogleService-Info.plist from EAS secret..."
  echo "$GOOGLE_SERVICE_INFO_PLIST_BASE64" | base64 -d > ./GoogleService-Info.plist
fi

if [ -n "${GOOGLE_SERVICES_JSON_BASE64:-}" ]; then
  echo "Restoring google-services.json from EAS secret..."
  echo "$GOOGLE_SERVICES_JSON_BASE64" | base64 -d > ./google-services.json
fi
