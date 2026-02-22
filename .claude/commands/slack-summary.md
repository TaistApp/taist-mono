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

## Steps

### 1. Load Previous Summary

Check for the most recent summary file in `docs/slack-summaries/`. Files are named `YYYY-MM-DD.md`. Read the latest one if it exists — you'll use it in step 5 to identify what's new vs. ongoing vs. resolved.

### 2. Discover All Channels

Call `channels_list` with `channel_types: "public_channel,private_channel"` and `limit: 200` to dynamically get all channels the bot can access.

Also include these known channels that may not appear in the listing:
- `C0AG74NANAH` (#payments)

Skip channels that are clearly inactive or irrelevant (e.g., #random) unless they have recent messages.

### 3. Fetch Messages from All Channels

For each discovered channel, call `conversations_history` with the `limit` parameter based on the user's time range argument (e.g., `1d`, `7d`, `3d`).

Fetch all channels in parallel. If a channel fetch fails, skip it and note it.

### 4. Fetch Thread Replies for Active Discussions

For messages that appear to have substantive thread activity, fetch replies using `conversations_replies` to get full context.

Limit to the 5 most active/recent threads per channel to avoid excessive API calls.

### 5. Determine Environment Context & Cross-Reference Code

**Important:** Most Slack discussion is about staging/TestFlight testing, NOT production. Before cross-referencing code, figure out which environment each issue applies to.

#### 5a. Identify environment per issue

Look for cues in Slack messages:
- "TestFlight", "staging", "test build", "APK" → **staging** (testers using `staging` branch builds)
- "production", "live", "users reporting", "App Store" → **production** (real users on `main` branch)
- If ambiguous, assume **staging** — that's where most testing happens

#### 5b. Check the right branch diffs

Our deploy model: `staging` branch → Railway staging + TestFlight/APK previews, `main` branch → Railway production + App Store.

Run these git commands:
- `git log --oneline staging --since="X days ago"` — what's been deployed to staging
- `git log --oneline main --since="X days ago"` — what's been deployed to production
- `git diff main..staging --stat` — what's in staging but NOT yet in production (pending prod deploy)

This tells you:
- If a fix is on `staging` but not `main`, it's fixed for testers but NOT for production users yet
- If a fix is on both, it's fully deployed
- If a fix is on neither, it's not started

#### 5c. Cross-reference each issue against code

For each bug/feature request found in Slack:

**Git history** — Search commit messages for keywords related to the issue. Check which branch(es) the fix is on.

**Codebase search** — Use Grep/Glob to verify the fix actually exists in code (commit messages can be misleading).

#### 5d. Mark each item's actual status

- `[FIXED IN STAGING]` — fix exists on `staging` branch, testers can verify on next TestFlight/APK
- `[FIXED IN PROD]` — fix deployed to both `staging` and `main`
- `[IN PROGRESS]` — partial fix or WIP changes found
- `[NOT STARTED]` — no code changes found related to this issue
- `[NEEDS VERIFICATION]` — fix deployed but no confirmation from reporter yet

This prevents reporting things as "open" when they've already been handled in code, and clarifies whether fixes have reached production or just staging.

### 6. Compare with Previous Summary

If a previous summary exists, compare to identify:

- **New items**: Issues/topics that weren't in the previous summary
- **Updated items**: Ongoing topics with new activity or status changes
- **Resolved items**: Things from the previous summary that appear to be resolved or no longer active
- **Unchanged items**: Ongoing work with no new activity (briefly mention, don't repeat details)

### 7. Analyze & Prioritize

Organize findings into this structure:

#### Priority Levels
- **P0 — Blocking / Urgent**: Production issues, broken builds, blockers preventing work
- **P1 — Important**: Bugs, feature requests with deadlines, questions needing answers
- **P2 — Normal**: Feature discussions, planning, general updates
- **P3 — FYI**: Status updates, completed work, informational posts

#### For Each Issue/Topic Found:
- **Priority** (P0-P3)
- **Channel** where it was discussed
- **Status tag**: `[NEW]`, `[UPDATED]`, `[ONGOING]`, or `[RESOLVED]`
- **Summary** (1-2 sentences)
- **Key participants** (use display names)
- **Status** (open question, resolved, in progress, needs response)
- **Action items** if any (and who they're for)

### 8. Present the Summary & Propose Replies

Present the summary first (format below), then show a list of proposed Slack replies:

```
### Proposed Slack Replies
| # | Thread | Reply |
|---|--------|-------|
| 1 | Dayne: "Chef not available..." | "Fixed in current build" |
| 2 | Daryl: "Unable to open..." | "Fixed in current build" |
...

Send these replies? (You can edit/remove any before confirming)
```

**Wait for user approval before sending any replies.** The user may want to edit wording, skip certain replies, or add context.

Once approved, reply to each thread using `conversations_add_message` with the channel ID and message's `thread_ts`.

Keep replies extremely short, and **tag the original poster** using `<@USERID>` format:
- `[FIXED IN STAGING]` → "<@U09N5L0PS7P> Fixed in current build"
- `[FIXED IN PROD]` → "<@U09MTL5R6CX> Fixed and deployed to production"
- `[IN PROGRESS]` → "<@U09N5L0PS7P> Working on this"
- `[NEEDS VERIFICATION]` → "<@U09N5L0PS7P> Fix deployed, can you verify?"

User IDs for tagging: Dayne (`<@U09N5L0PS7P>`), Daryl (`<@U09MTL5R6CX>`)

Rules:
- **Always tag the person who posted the original message** so they get notified
- Reply **in the thread** (use `thread_ts`), not as a new channel message
- Only reply to messages that don't already have a fix confirmation in the thread
- Skip items that the reporter already confirmed as working
- Skip items that are just FYI/discussion (no fix needed)
- Track which threads you replied to in the saved summary under "### Slack Replies Sent"

### 9. Present the Summary

Format the output as:

```
## Slack Summary — [date range] ([today's date])

### Changes Since Last Summary ([previous summary date])
- X new items, Y updated, Z resolved

### P0 — Blocking / Urgent
(items or "None")

### P1 — Important
(items with [NEW]/[UPDATED]/[ONGOING] tags)

### P2 — Normal
(items)

### P3 — FYI
(items)

### Resolved Since Last Summary
- Item that was previously tracked but is now resolved

---

### Action Items for You
- [ ] Item 1 (from #channel) [NEW]
- [ ] Item 2 (from #channel) [ONGOING]

### Questions Needing Response
- Question (from @person in #channel)
```

Specifically call out anything directed at or mentioning Billy (`U09N5L27YQM`) in the "Action Items for You" section.

### 10. Save Summary to Disk

Save the full summary to `docs/slack-summaries/YYYY-MM-DD.md` (using today's date). If a file for today already exists, overwrite it.

Create the `docs/slack-summaries/` directory if it doesn't exist. Add `docs/slack-summaries/` to `.gitignore` if not already there — these are local working files, not for the repo.

## Important Notes

- The Slack MCP bot can only see channels it has access to — if a channel fetch fails, skip it and note it
- User IDs for reference: Billy (`U09N5L27YQM`), Daryl (`U09MTL5R6CX`), Dayne (`U09N5L0PS7P`)
- Don't include bot messages or automated notifications unless they indicate a real issue (e.g., build failure)
- If there are no messages in a channel for the time range, skip it silently
- Keep summaries concise — the value is in prioritization and change tracking, not transcription
