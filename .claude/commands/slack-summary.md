# Slack Summary & Prioritize

Pull recent Slack messages from ALL accessible channels, summarize discussions, prioritize issues, and track changes from previous summaries.

## Usage

The user's argument controls the time range:

| Argument | Behavior |
|----------|----------|
| (none) | Last 1 day of messages |
| `week` | Last 7 days of messages |
| `3d` | Last 3 days of messages |
| Any `Nd` format | Last N days of messages |

## Phase 1: Gather Data (Main Context)

Run these steps sequentially in the main context to collect all raw data before spawning subagents.

### 1. Load Previous Summary + Discover Channels (parallel)

Do both in parallel:

**Previous summary:** Check for the most recent summary file in `docs/slack-summaries/`. Files are named `YYYY-MM-DD.md`. Read the latest one if it exists.

**Channel discovery:** Call `channels_list` with `channel_types: "public_channel,private_channel"` and `limit: 200`.

Also include these known channels that may not appear in the listing:
- `C0AG74NANAH` (#payments)
- `C0AGB51FJMC` (#ios-builds)

Skip #random unless it has recent messages.

### 2. Fetch Messages from All Channels (parallel)

For each discovered channel, call `conversations_history` with the `limit` parameter based on the user's time range argument (e.g., `1d`, `7d`, `3d`). Note: `12h` is not supported — use `1d` and filter manually.

Fetch all channels in parallel. If a channel fetch fails, skip it and note it.

### 3. Download Full Message JSON via Slack API

The Slack MCP tool strips file attachments from its output. To get image URLs, fetch the raw JSON for channels that had activity:

```bash
TOKEN=$(python3 -c "import json; print(json.load(open('$(git rev-parse --show-toplevel)/.mcp.json'))['mcpServers']['slack']['env']['SLACK_MCP_XOXB_TOKEN'])")
curl -s -H "Authorization: Bearer $TOKEN" "https://slack.com/api/conversations.history?channel=CHANNEL_ID&limit=20" -o /tmp/slack-CHANNELNAME.json
```

Then extract file URLs:
```bash
python3 -c "
import json
data = json.load(open('/tmp/slack-CHANNELNAME.json'))
for m in data.get('messages', []):
    files = m.get('files', [])
    if files:
        ts = m.get('ts', '')
        text = m.get('text', '')[:80]
        print(f'MSG ts={ts} text=\"{text}\"')
        for f in files:
            print(f'  FILE: {f.get(\"name\",\"\")} | url={f.get(\"url_private\",\"\")}')
"
```

### 4. Download All Images

Download every image attachment to `/tmp/slack-images/`:

```bash
mkdir -p /tmp/slack-images
TOKEN=$(python3 -c "import json; print(json.load(open('$(git rev-parse --show-toplevel)/.mcp.json'))['mcpServers']['slack']['env']['SLACK_MCP_XOXB_TOKEN'])")
curl -s -H "Authorization: Bearer $TOKEN" "IMAGE_URL" -o /tmp/slack-images/DESCRIPTIVE_NAME.ext
```

Use descriptive filenames based on the message context (e.g., `background-check-error.png`, `missing-profile-pic.jpg`).

### 5. Build Issue List

Before spawning subagents, compile a numbered list of every distinct issue/topic found in the messages. For each, note:
- Issue number and short title
- Channel and message timestamp
- Reporter name
- Brief description from message text
- Whether it has screenshots (and their file paths in `/tmp/slack-images/`)

Save this list to `/tmp/slack-issue-list.md` — subagents will read it.

---

## Phase 2: Parallel Analysis (Subagents)

Spawn **3 subagents in parallel** using the Task tool. Each reads `/tmp/slack-issue-list.md` and does independent analysis. All subagents should write their results to files.

### Subagent A: Screenshot Analysis

**Type:** `general-purpose`

**Prompt:** Read `/tmp/slack-issue-list.md` for the list of issues. For each issue that has screenshots, use the Read tool to view the image files in `/tmp/slack-images/`. For each screenshot, describe:
- What screen/flow is shown
- Any error messages or toasts visible
- UI bugs (layout issues, missing elements, wrong data)
- Device type (Android vs iOS) from status bar
- How the screenshot relates to the reported issue

Write your findings to `/tmp/slack-analysis-screenshots.md` with one section per issue number.

### Subagent B: Git & Code Cross-Reference

**Type:** `general-purpose`

**Prompt:** Read `/tmp/slack-issue-list.md` for the list of issues. For each bug or feature request:

1. **Git history** — Search commit messages for keywords. Check which branch(es) any fix is on:
   - `git log --oneline staging --since="X days ago" --grep="KEYWORD"`
   - `git log --oneline main --since="X days ago" --grep="KEYWORD"`
   - `git diff main..staging --stat` (run once for overall picture)

2. **Codebase search** — Use Grep/Glob to verify fixes exist in code.

3. **Environment context** — Most discussion is about staging/TestFlight. Look for cues:
   - "TestFlight", "staging", "test build", "APK" → **staging**
   - "production", "live", "users reporting" → **production**
   - If ambiguous, assume **staging**

4. **Mark each item's status:**
   - `[FIXED IN STAGING]` — fix on `staging` but not `main`
   - `[FIXED IN PROD]` — fix on both `staging` and `main`
   - `[IN PROGRESS]` — partial fix or WIP
   - `[NOT STARTED]` — no related code changes
   - `[NEEDS VERIFICATION]` — fix deployed but unconfirmed

Write findings to `/tmp/slack-analysis-code.md` with one section per issue number. Include file paths, line numbers, and relevant commit hashes.

### Subagent C: Previous Summary Comparison

**Type:** `general-purpose`

**Prompt:** Read `/tmp/slack-issue-list.md` for the current issues. Read the previous summary at `docs/slack-summaries/YYYY-MM-DD.md` (the most recent one). Compare and categorize:

- **New items**: Issues not in the previous summary
- **Updated items**: Ongoing topics with new activity or status changes
- **Resolved items**: Previous items that appear resolved or no longer active
- **Unchanged items**: Ongoing work with no new activity

Write findings to `/tmp/slack-analysis-comparison.md`.

---

## Phase 3: Compile & Present (Main Context)

After all 3 subagents complete, read their output files and compile the final summary.

### 6. Merge Subagent Results

Read:
- `/tmp/slack-analysis-screenshots.md`
- `/tmp/slack-analysis-code.md`
- `/tmp/slack-analysis-comparison.md`

Combine into a unified view per issue: screenshot observations + code status + new/ongoing tag.

### 7. Prioritize

Assign priority levels:
- **P0 — Blocking / Urgent**: Production issues, broken builds, blockers preventing work
- **P1 — Important**: Bugs, feature requests with deadlines, questions needing answers
- **P2 — Normal**: Feature discussions, planning, general updates
- **P3 — FYI**: Status updates, completed work, informational posts

### 8. Present the Summary

Format the output as:

```
## Slack Summary — [date range] ([today's date])

> Environment context line (e.g., "All discussion is staging. X commits on main...")

### Changes Since Last Summary ([previous summary date])
- X new items, Y updated, Z resolved

### P0 — Blocking / Urgent
(items or "None")

### P1 — Important
(items with [NEW]/[UPDATED]/[ONGOING] tags and code status)

### P2 — Normal
(items)

### P3 — FYI
(items)

### Resolved Since Last Summary
- Item that was previously tracked but is now resolved

---

### Action Items for Billy
- [ ] Item 1 (from #channel) [NEW]
- [ ] Item 2 (from #channel) [ONGOING]

### Questions Needing Response
- Question (from @person in #channel)
```

For each issue include:
- **Priority** (P0-P3)
- **Channel** where it was discussed
- **Status tag**: `[NEW]`, `[UPDATED]`, `[ONGOING]`, or `[RESOLVED]`
- **Code status**: `[FIXED IN STAGING]`, `[NOT STARTED]`, etc.
- **Summary** (1-2 sentences)
- **Key participants** (display names)
- **Screenshot observations** if applicable

Specifically call out anything directed at or mentioning Billy (`U09N5L27YQM`) in the "Action Items" section.

### 9. Save Summary to Disk

Save the full summary to `docs/slack-summaries/YYYY-MM-DD.md` (today's date). Overwrite if exists.

Create `docs/slack-summaries/` if it doesn't exist. It should already be in `.gitignore`.

## Important Notes

- The Slack MCP bot can only see channels it has access to — if a channel fetch fails, skip it
- User IDs for reference: Billy (`U09N5L27YQM`), Daryl (`U09MTL5R6CX`), Dayne (`U09N5L0PS7P`)
- Don't include bot messages or automated notifications unless they indicate a real issue (e.g., build failure)
- If there are no messages in a channel for the time range, skip it silently
- Keep summaries concise — the value is in prioritization and change tracking, not transcription
