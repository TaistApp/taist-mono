import {
  PUSH_PROMPT_COOLDOWN_MS,
  PUSH_PROMPT_KEYS,
  PUSH_PROMPT_MAX_DECLINES,
  parsePushPromptRecord,
  recordPushPromptOutcome,
  shouldOpenSystemSettings,
  shouldShowPushPrompt,
} from '../../app/utils/pushPrompt';

/**
 * Notification permission was only ever requested from the customer order
 * detail screen, so a chef was never asked. getToken() still returns a token
 * without permission, so the backend sent the approval push successfully and
 * Android silently dropped it — email arrived, push didn't, nothing logged.
 *
 * Asking exactly once then never again was the first fix and was too blunt: a
 * chef who declined stayed permanently unreachable. These cover the re-prompt.
 */
const NOW = 1_700_000_000_000;

describe('push permission prompt', () => {
  it('asks a chef who has not been asked before', () => {
    expect(shouldShowPushPrompt({ record: null, userId: 42, now: NOW })).toBe(true);
  });

  it('does not ask again during the cooldown after a decline', () => {
    const record = recordPushPromptOutcome(null, 'declined', NOW);
    expect(
      shouldShowPushPrompt({ record, userId: 42, now: NOW + PUSH_PROMPT_COOLDOWN_MS - 1000 }),
    ).toBe(false);
  });

  it('asks again once the cooldown has elapsed', () => {
    const record = recordPushPromptOutcome(null, 'declined', NOW);
    expect(
      shouldShowPushPrompt({ record, userId: 42, now: NOW + PUSH_PROMPT_COOLDOWN_MS }),
    ).toBe(true);
  });

  it('stops asking after the decline limit', () => {
    let record = recordPushPromptOutcome(null, 'declined', NOW);
    for (let i = 1; i < PUSH_PROMPT_MAX_DECLINES; i += 1) {
      record = recordPushPromptOutcome(record, 'declined', NOW);
    }
    expect(record.declineCount).toBe(PUSH_PROMPT_MAX_DECLINES);
    expect(
      shouldShowPushPrompt({ record, userId: 42, now: NOW + PUSH_PROMPT_COOLDOWN_MS * 10 }),
    ).toBe(false);
  });

  // Control: accepting is terminal — no cooldown re-prompt, ever.
  it('never asks again once accepted', () => {
    const record = recordPushPromptOutcome(null, 'accepted', NOW);
    expect(
      shouldShowPushPrompt({ record, userId: 42, now: NOW + PUSH_PROMPT_COOLDOWN_MS * 10 }),
    ).toBe(false);
  });

  it('does not prompt over a screen that is navigating away', () => {
    expect(
      shouldShowPushPrompt({ record: null, userId: 42, redirecting: true, now: NOW }),
    ).toBe(false);
  });

  it('does not prompt before a real user is loaded', () => {
    expect(shouldShowPushPrompt({ record: null, now: NOW })).toBe(false);
    expect(shouldShowPushPrompt({ record: null, userId: null, now: NOW })).toBe(false);
    expect(shouldShowPushPrompt({ record: null, userId: 0, now: NOW })).toBe(false);
  });

  // Control: the two surfaces record their answers separately, so a customer
  // who declined is still asked when they later onboard as a chef.
  it('keeps the chef and customer prompt keys distinct', () => {
    expect(PUSH_PROMPT_KEYS.chef).not.toBe(PUSH_PROMPT_KEYS.customer);
  });
});

describe('parsePushPromptRecord', () => {
  it('treats a legacy `true` as one old decline so upgraders get re-asked', () => {
    const record = parsePushPromptRecord(true);
    expect(record).toEqual({ declineCount: 1, lastPromptedAt: 0 });
    expect(shouldShowPushPrompt({ record, userId: 42, now: NOW })).toBe(true);
  });

  it('reads a stored record back unchanged', () => {
    expect(
      parsePushPromptRecord({ accepted: false, declineCount: 2, lastPromptedAt: NOW }),
    ).toEqual({ accepted: false, declineCount: 2, lastPromptedAt: NOW });
  });

  // Control: an empty slot is "never asked", not a malformed record.
  it('returns null for empty storage', () => {
    expect(parsePushPromptRecord(null)).toBeNull();
    expect(parsePushPromptRecord(undefined)).toBeNull();
    expect(parsePushPromptRecord('')).toBeNull();
  });
});

describe('shouldOpenSystemSettings', () => {
  it('sends a previous decliner to settings — the OS dialog no longer shows', () => {
    expect(shouldOpenSystemSettings(recordPushPromptOutcome(null, 'declined', NOW))).toBe(true);
  });

  // Control: a first-time viewer gets the real OS dialog, not a settings detour.
  it('uses the OS dialog for someone who has never declined', () => {
    expect(shouldOpenSystemSettings(null)).toBe(false);
    expect(shouldOpenSystemSettings({ declineCount: 0, lastPromptedAt: 0 })).toBe(false);
  });
});
