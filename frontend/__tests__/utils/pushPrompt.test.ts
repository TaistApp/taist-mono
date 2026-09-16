import {
  PUSH_PROMPT_KEYS,
  shouldShowPushPrompt,
} from '../../app/utils/pushPrompt';

/**
 * Notification permission was only ever requested from the customer order
 * detail screen, so a chef was never asked. getToken() still returns a token
 * without permission, so the backend sent the approval push successfully and
 * Android silently dropped it — email arrived, push didn't, nothing logged.
 */
describe('push permission prompt', () => {
  it('asks a chef who has not been asked before', () => {
    expect(shouldShowPushPrompt({ alreadyShown: false, userId: 42 })).toBe(true);
  });

  it('never asks twice — the OS prompt only appears once', () => {
    expect(shouldShowPushPrompt({ alreadyShown: true, userId: 42 })).toBe(false);
  });

  it('does not prompt over a screen that is navigating away', () => {
    expect(
      shouldShowPushPrompt({ alreadyShown: false, userId: 42, redirecting: true }),
    ).toBe(false);
  });

  it('does not prompt before a real user is loaded', () => {
    expect(shouldShowPushPrompt({ alreadyShown: false })).toBe(false);
    expect(shouldShowPushPrompt({ alreadyShown: false, userId: null })).toBe(false);
    expect(shouldShowPushPrompt({ alreadyShown: false, userId: 0 })).toBe(false);
  });

  // Control: the two surfaces record their answers separately, so a customer
  // who declined is still asked when they later onboard as a chef.
  it('keeps the chef and customer prompt keys distinct', () => {
    expect(PUSH_PROMPT_KEYS.chef).not.toBe(PUSH_PROMPT_KEYS.customer);
  });
});
