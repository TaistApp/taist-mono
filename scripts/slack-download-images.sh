#!/bin/bash
# Download images/files from a Slack channel or thread.
# Usage:
#   ./scripts/slack-download-images.sh <channel-id> [options]
#
# Options:
#   --thread <thread_ts>   Download from a specific thread only
#   --limit <N>            Number of messages to scan (default: 20)
#   --output <dir>         Output directory (default: /tmp/slack-images)
#
# Reads the bot token from .mcp.json automatically.
# Downloads all image attachments and prints their local paths.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Read bot token from MCP config
TOKEN=$(python3 -c "
import json
with open('$REPO_ROOT/.mcp.json') as f:
    config = json.load(f)
print(config['mcpServers']['slack']['env']['SLACK_MCP_XOXB_TOKEN'])
")

if [ -z "$TOKEN" ]; then
    echo "ERROR: Could not read Slack bot token from .mcp.json" >&2
    exit 1
fi

# Parse arguments
CHANNEL_ID="${1:?Usage: slack-download-images.sh <channel-id> [--thread ts] [--limit N] [--output dir]}"
shift

THREAD_TS=""
LIMIT=20
OUTPUT_DIR="/tmp/slack-images"

while [[ $# -gt 0 ]]; do
    case $1 in
        --thread) THREAD_TS="$2"; shift 2 ;;
        --limit)  LIMIT="$2"; shift 2 ;;
        --output) OUTPUT_DIR="$2"; shift 2 ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

mkdir -p "$OUTPUT_DIR"

# Fetch messages (channel history or thread replies)
if [ -n "$THREAD_TS" ]; then
    API_URL="https://slack.com/api/conversations.replies?channel=$CHANNEL_ID&ts=$THREAD_TS&limit=$LIMIT"
else
    API_URL="https://slack.com/api/conversations.history?channel=$CHANNEL_ID&limit=$LIMIT"
fi

TMPFILE=$(mktemp /tmp/slack-api-response.XXXXXX.json)
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL" -o "$TMPFILE"

# Check API response
API_OK=$(python3 -c "import json; print(json.load(open('$TMPFILE')).get('ok', False))")
if [ "$API_OK" != "True" ]; then
    echo "ERROR: Slack API call failed" >&2
    python3 -m json.tool "$TMPFILE" >&2
    rm -f "$TMPFILE"
    exit 1
fi

# Extract file URLs, download each image
python3 << PYEOF
import json, subprocess, os

output_dir = "$OUTPUT_DIR"
token = "$TOKEN"

with open("$TMPFILE") as f:
    data = json.load(f)

messages = data.get("messages", [])
files_found = []

for msg in messages:
    # Files directly on the message
    for f in msg.get("files", []):
        if f.get("mimetype", "").startswith("image/"):
            files_found.append({
                "url": f.get("url_private", ""),
                "name": f.get("name", "unknown.jpg"),
                "id": f.get("id", ""),
            })
    # Files in attachments (shared/forwarded from other channels)
    for att in msg.get("attachments", []):
        for f in att.get("files", []):
            if f.get("mimetype", "").startswith("image/"):
                files_found.append({
                    "url": f.get("url_private", ""),
                    "name": f.get("name", "unknown.jpg"),
                    "id": f.get("id", ""),
                })

if not files_found:
    print("No images found in the messages.")
else:
    print(f"Found {len(files_found)} image(s). Downloading...")
    for f in files_found:
        local_path = os.path.join(output_dir, f"{f['id']}_{f['name']}")
        result = subprocess.run(
            ["curl", "-s", "-H", f"Authorization: Bearer {token}", f["url"], "-o", local_path],
            capture_output=True, text=True
        )
        if result.returncode == 0 and os.path.exists(local_path):
            size = os.path.getsize(local_path)
            print(f"Downloaded: {local_path} ({size} bytes)")
        else:
            print(f"FAILED: {f['name']} - {result.stderr}")
    print(f"\nImages saved to: {output_dir}")
PYEOF

rm -f "$TMPFILE"
