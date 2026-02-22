# Maestro Session Lock Protocol

## Why This Exists

Maestro's MCP server uses a hardcoded gRPC driver port (7001). When two Claude Code sessions both use Maestro MCP tools simultaneously, they fight over this port and end up controlling the same simulator regardless of `device_id`. There is no fix in Maestro itself yet ([Issue #2921](https://github.com/mobile-dev-inc/Maestro/issues/2921), [PR #2821](https://github.com/mobile-dev-inc/Maestro/pull/2821)).

**Solution:** Only one session uses Maestro at a time, enforced by a lock file.

## Lock File

- **Path:** `/tmp/maestro-session.lock`
- **Format:** Single line — `<unix_timestamp>|<description>`
- **Example:** `1740000000|Running login flow tests`

## Protocol

### Before Your First Maestro MCP Tool Call

1. **Check the lock:** `cat /tmp/maestro-session.lock 2>/dev/null`
2. **If no lock exists** → create it and proceed (step 4)
3. **If a lock exists:**
   - Parse the timestamp from the file
   - If **less than 15 minutes old** → the lock is active. Wait 2 minutes, then check again. Repeat up to 5 times (10 min total wait). If still locked after 5 retries, **tell the user** another session appears to be using Maestro and ask how to proceed.
   - If **more than 15 minutes old** → the lock is stale (other session probably crashed or forgot to clean up). Take ownership by overwriting the lock.
4. **Create/update the lock:**
   ```bash
   echo "$(date +%s)|<brief description of what you're doing>" > /tmp/maestro-session.lock
   ```

### While Using Maestro

- **Refresh the lock** every time you make a Maestro MCP tool call:
  ```bash
  echo "$(date +%s)|<current activity>" > /tmp/maestro-session.lock
  ```
  This keeps the timestamp fresh so other sessions know you're still active.

### When Done With Maestro

- **Remove the lock** as soon as you're finished with all Maestro work for the current task:
  ```bash
  rm -f /tmp/maestro-session.lock
  ```
- "Done" means you've completed the Maestro portion of your task — don't hold the lock while doing non-Maestro work (editing code, reading files, etc.)

## Rules

1. **Never skip the lock check.** Every session must check before its first Maestro tool call.
2. **Don't hold the lock longer than needed.** Release it between Maestro phases if you're doing other work in between.
3. **Always clean up.** Remove the lock when your Maestro work is done, even if the task isn't fully complete.
4. **15-minute stale threshold** handles crashed sessions — `/tmp` also clears on reboot.
5. **The lock only applies to Maestro MCP tools** (`mcp__maestro__*`). It does not apply to reading files, editing code, or other non-Maestro work.

## Quick Reference

| Step | Command |
|------|---------|
| Check lock | `cat /tmp/maestro-session.lock 2>/dev/null` |
| Acquire lock | `echo "$(date +%s)\|Doing X" > /tmp/maestro-session.lock` |
| Refresh lock | Same as acquire — update timestamp + description |
| Release lock | `rm -f /tmp/maestro-session.lock` |
| Check staleness | Compare timestamp to `$(date +%s)`, stale if diff > 900 |
