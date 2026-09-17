import { enablePushForUser } from '../../app/utils/pushPrompt';

const deps = (granted: boolean, optInFails = false) => {
  const requestPermission = jest.fn(async () => granted);
  const registerToken = jest.fn(async () => 'fcm-token');
  const optIn = jest.fn(async () => {
    if (optInFails) throw new Error('opt-in 500');
    return true;
  });
  return { requestPermission, registerToken, optIn };
};

/**
 * A chef could accept the permission prompt and still receive nothing, with no
 * error logged anywhere. Android 13+ can refuse getToken() before
 * POST_NOTIFICATIONS exists, so the token captured at login is often missing —
 * and FirebaseChannel returns silently for a user with no token. The original
 * handler requested permission and recorded the opt-in, but never re-registered
 * the token, so the account stayed unreachable.
 */
describe('enabling push after the prompt', () => {
  it('re-registers the token once permission is granted', async () => {
    const d = deps(true);

    await enablePushForUser(d, 42);

    expect(d.registerToken).toHaveBeenCalledTimes(1);
  });

  it('records the opt-in and reports success', async () => {
    const d = deps(true);

    await expect(enablePushForUser(d, 42)).resolves.toBe(true);
    expect(d.optIn).toHaveBeenCalledWith(42);
  });

  it('still registers the token when there is no user id to opt in', async () => {
    const d = deps(true);

    await expect(enablePushForUser(d, undefined)).resolves.toBe(true);
    expect(d.registerToken).toHaveBeenCalledTimes(1);
    expect(d.optIn).not.toHaveBeenCalled();
  });

  it('keeps push working when the opt-in call fails', async () => {
    const d = deps(true, true);

    // The token is what delivers the push; opt-in is bookkeeping.
    await expect(enablePushForUser(d, 42)).resolves.toBe(true);
    expect(d.registerToken).toHaveBeenCalledTimes(1);
  });

  // Control: a declined prompt touches nothing at all.
  it('does nothing when permission is declined', async () => {
    const d = deps(false);

    await expect(enablePushForUser(d, 42)).resolves.toBe(false);
    expect(d.registerToken).not.toHaveBeenCalled();
    expect(d.optIn).not.toHaveBeenCalled();
  });
});
