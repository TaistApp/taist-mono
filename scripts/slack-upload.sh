#!/bin/bash
# Upload a file to a Slack channel with a message.
# Usage: ./scripts/slack-upload.sh <file-path> <channel-id> <message>
#
# Reads the bot token from .claude/mcp.json automatically.
# Uses Slack's files.upload API.

set -euo pipefail

FILE_PATH="$1"
CHANNEL_ID="$2"
MESSAGE="${3:-}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Read bot token from MCP config
TOKEN=$(python3 -c "
import json
with open('$REPO_ROOT/.mcp.json') as f:
    config = json.load(f)
print(config['mcpServers']['slack']['env']['SLACK_MCP_XOXB_TOKEN'])
")

if [ -z "$TOKEN" ]; then
    echo "ERROR: Could not read Slack bot token from .claude/mcp.json"
    exit 1
fi

FILENAME=$(basename "$FILE_PATH")
FILESIZE=$(stat -f%z "$FILE_PATH" 2>/dev/null || stat -c%s "$FILE_PATH" 2>/dev/null)

echo "Uploading $FILENAME ($FILESIZE bytes) to channel $CHANNEL_ID..."

# Step 1: Get upload URL
UPLOAD_RESPONSE=$(curl -s -X POST "https://slack.com/api/files.getUploadURLExternal" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "filename=$FILENAME&length=$FILESIZE")

UPLOAD_OK=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ok','false'))")
if [ "$UPLOAD_OK" != "True" ]; then
    echo "ERROR: Failed to get upload URL: $UPLOAD_RESPONSE"
    exit 1
fi

UPLOAD_URL=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['upload_url'])")
FILE_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['file_id'])")

# Step 2: Upload the file
curl -s -X POST "$UPLOAD_URL" \
    -F "file=@$FILE_PATH" > /dev/null

# Step 3: Complete the upload and share to channel
COMPLETE_RESPONSE=$(curl -s -X POST "https://slack.com/api/files.completeUploadExternal" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"files\": [{\"id\": \"$FILE_ID\", \"title\": \"$FILENAME\"}],
        \"channel_id\": \"$CHANNEL_ID\",
        \"initial_comment\": \"$MESSAGE\"
    }")

COMPLETE_OK=$(echo "$COMPLETE_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ok','false'))")
if [ "$COMPLETE_OK" != "True" ]; then
    echo "ERROR: Failed to complete upload: $COMPLETE_RESPONSE"
    exit 1
fi

echo "SUCCESS: Uploaded $FILENAME to Slack"
