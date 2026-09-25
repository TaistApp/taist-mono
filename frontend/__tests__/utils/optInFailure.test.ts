import { enablePushForUser, optInFailureReason } from '../../app/utils/pushPrompt';

/**
 * push_opted_in was 0 for all 174 chefs in production and nothing could say
 * why. The opt-in call goes through the shared API helper, which catches every
 * HTTP error and resolves with `{ success: 0, message }` instead of throwing —
 * so the try/catch that wrapped it never ran, and a 401, a 404 or a 500 was
 * indistinguishable from a recorded opt-in.
 */
describe('recognising a failed opt-in', () => {
  it('reads the server message out of a rejected response', () => {
    expect(optInFailureReason({ success: 0, message: 'Unauthenticated.' })).toBe(
      'Unauthenticated.',
    );
    expect(optInFailureReason({ success: false, error: 'User not found' })).toBe(
      'User not found',
    );
  });

  it('still reports a rejection that carries no message', () => {
    expect(optInFailureReason({ success: 0 })).toBe('opt-in rejected by the server');
  });

  it('treats a missing response as a failure', () => {
    expect(optInFailureReason(undefined)).toBe('no response from opt-in');
    expect(optInFailureReason(null)).toBe('no response from opt-in');
  });

  // Control: the shapes the endpoint actually returns on success must stay quiet.
  it('says nothing when the opt-in succeeded', () => {
    expect(optInFailureReason({ success: true })).toBeNull();
    expect(optInFailureReason({ success: 1 })).toBeNull();
    expect(optInFailureReason(true)).toBeNull();
  });
});

describe('surfacing a failed opt-in from the accept path', () => {
  const deps = (optInResult: unknown) => ({
    requestPermission: jest.fn(async () => true),
    registerToken: jest.fn(async () => 'fcm-token'),
    optIn: jest.fn(async () => optInResult),
    reportOptInFailure: jest.fn(),
  });

  it('reports a 401 that the API helper turned into a resolved value', async () => {
    const d = deps({ success: 0, message: 'Unauthenticated.' });

    await expect(enablePushForUser(d, 42)).resolves.toBe(true);

    expect(d.reportOptInFailure).toHaveBeenCalledWith('Unauthenticated.');
  });

  it('reports a thrown opt-in without aborting push', async () => {
    const d = {
      ...deps({ success: true }),
      optIn: jest.fn(async () => {
        throw new Error('opt-in 500');
      }),
    };

    await expect(enablePushForUser(d, 42)).resolves.toBe(true);

    expect(d.registerToken).toHaveBeenCalledTimes(1);
    expect(d.reportOptInFailure).toHaveBeenCalledWith('opt-in 500');
  });

  // Control: a successful opt-in must not raise a false alarm.
  it('reports nothing when the opt-in is recorded', async () => {
    const d = deps({ success: true });

    await expect(enablePushForUser(d, 42)).resolves.toBe(true);

    expect(d.optIn).toHaveBeenCalledWith(42);
    expect(d.reportOptInFailure).not.toHaveBeenCalled();
  });
});
