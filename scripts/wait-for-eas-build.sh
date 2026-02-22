#!/bin/bash
# Polls EAS for a build and outputs the artifact URL when done.
# Usage: ./scripts/wait-for-eas-build.sh [--platform ios|android] [build-id]
#
# If no build-id is given, finds the latest build for the platform.
# Polls every 30 minutes for up to 4 hours.
# Exit codes: 0 = finished, 1 = errored/canceled, 2 = timeout

set -uo pipefail

POLL_INTERVAL=1800
MAX_WAIT=14400
PLATFORM="android"
FRONTEND_DIR="$(cd "$(dirname "$0")/../frontend" && pwd)"

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --platform)
            PLATFORM="$2"
            shift 2
            ;;
        *)
            BUILD_ID="$1"
            shift
            ;;
    esac
done

# Helper: run eas build:view and extract just the JSON object
eas_build_view() {
    cd "$FRONTEND_DIR" && eas build:view "$1" --json 2>/dev/null | sed -n '/^{/,/^}/p'
}

# Helper: run eas build:list and extract just the JSON array
eas_build_list() {
    cd "$FRONTEND_DIR" && eas build:list --platform "$1" --limit 1 --json --non-interactive 2>/dev/null | sed -n '/^\[/,/^\]/p'
}

# Get build ID
if [ -z "${BUILD_ID:-}" ]; then
    BUILD_ID=$(eas_build_list "$PLATFORM" | jq -r '.[0].id')
    if [ -z "$BUILD_ID" ] || [ "$BUILD_ID" = "null" ]; then
        echo "ERROR: Could not find any $PLATFORM builds"
        exit 1
    fi
fi

echo "PLATFORM=$PLATFORM"
echo "BUILD_ID=$BUILD_ID"

# Get initial info
BUILD_INFO=$(eas_build_view "$BUILD_ID")
if [ -n "$BUILD_INFO" ]; then
    PROFILE=$(echo "$BUILD_INFO" | jq -r '.buildProfile // "unknown"')
    APP_VERSION=$(echo "$BUILD_INFO" | jq -r '.appVersion // "unknown"')
    BUILD_VERSION=$(echo "$BUILD_INFO" | jq -r '.appBuildVersion // "unknown"')
    COMMIT_MSG=$(echo "$BUILD_INFO" | jq -r '.gitCommitMessage // "unknown"' | head -1)

    echo "PROFILE=$PROFILE"
    echo "APP_VERSION=$APP_VERSION"
    echo "BUILD_VERSION=$BUILD_VERSION"
    echo "COMMIT_MSG=$COMMIT_MSG"
fi

ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    BUILD_INFO=$(eas_build_view "$BUILD_ID")
    STATUS=$(echo "$BUILD_INFO" | jq -r '.status')

    if [ "$STATUS" = "FINISHED" ]; then
        ARTIFACT_URL=$(echo "$BUILD_INFO" | jq -r '.artifacts.buildUrl')
        echo "STATUS=FINISHED"
        echo "ARTIFACT_URL=$ARTIFACT_URL"
        exit 0
    elif [ "$STATUS" = "ERRORED" ] || [ "$STATUS" = "CANCELED" ]; then
        echo "STATUS=$STATUS"
        exit 1
    fi

    echo "POLL: status=$STATUS elapsed=${ELAPSED}s"
    sleep $POLL_INTERVAL
    ELAPSED=$((ELAPSED + POLL_INTERVAL))
done

echo "STATUS=TIMEOUT"
exit 2
