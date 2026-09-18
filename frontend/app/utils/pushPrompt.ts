/**
 * When to ask for notification permission.
 *
 * Permission was only ever requested from one screen — customer order detail —
 * so a chef was never asked at all. `messaging().getToken()` still returns a
 * valid token without permission, so the backend stored a token, FirebaseChannel
 * sent successfully, and Android silently dropped the display: a chef approved
 * by an admin got the welcome email but no push, with nothing logged anywhere.
 *
 * Asking exactly once was the first fix, and it was too blunt: a chef who
 * declined at onboarding stayed permanently unreachable with no route back
 * short of reinstalling. The prompt now returns after a cooldown, a bounded
 * number of times, and never again once accepted.
 */
export const PUSH_PROMPT_KEYS = {
  customer: '@push_prompt_shown',
  chef: '@chef_push_prompt_shown',
} as const;

/** Delay before the modal appears, so it doesn't race the screen's first paint. */
export const PUSH_PROMPT_DELAY_MS = 2000;

/** How long to leave someone alone after they decline. */
export const PUSH_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** Stop asking after this many declines — a nag is worse than no push. */
export const PUSH_PROMPT_MAX_DECLINES = 3;

export type PushPromptRecord = {
  /** Accepted once; never ask again. */
  accepted?: boolean;
  declineCount: number;
  /** Unix ms of the last time the modal was shown. */
  lastPromptedAt: number;
};

/**
 * Normalise whatever storage holds.
 *
 * Earlier builds stored a bare `true` meaning "asked once, outcome unknown".
 * Those users are exactly the ones stuck unreachable, so a legacy value counts
 * as one old decline: they get asked again on upgrade rather than needing a
 * reinstall.
 */
export const parsePushPromptRecord = (raw: unknown): PushPromptRecord | null => {
  if (raw == null || raw === false || raw === '') return null;

  if (raw === true || raw === 'true') {
    return { declineCount: 1, lastPromptedAt: 0 };
  }

  if (typeof raw === 'object') {
    const r = raw as Partial<PushPromptRecord>;
    return {
      accepted: !!r.accepted,
      declineCount: Number(r.declineCount ?? 0),
      lastPromptedAt: Number(r.lastPromptedAt ?? 0),
    };
  }

  return null;
};

type PromptArgs = {
  /** Whatever storage held for this surface, already parsed. */
  record?: PushPromptRecord | null;
  /** The signed-in user's id; absent means the screen has no user yet. */
  userId?: number | null;
  /** True when the screen is about to navigate elsewhere. */
  redirecting?: boolean;
  now?: number;
};

/**
 * Ask when there is a real user, the screen is staying put, and either we have
 * never asked or the cooldown since the last decline has elapsed.
 */
export const shouldShowPushPrompt = ({
  record,
  userId,
  redirecting = false,
  now = Date.now(),
}: PromptArgs): boolean => {
  if (redirecting) return false;
  if (typeof userId !== 'number' || userId <= 0) return false;

  if (!record) return true;
  if (record.accepted) return false;
  if (record.declineCount >= PUSH_PROMPT_MAX_DECLINES) return false;

  return now - record.lastPromptedAt >= PUSH_PROMPT_COOLDOWN_MS;
};

/** The record to store after the viewer answers. */
export const recordPushPromptOutcome = (
  record: PushPromptRecord | null | undefined,
  outcome: 'accepted' | 'declined',
  now: number = Date.now(),
): PushPromptRecord => ({
  accepted: outcome === 'accepted',
  declineCount: (record?.declineCount ?? 0) + (outcome === 'declined' ? 1 : 0),
  lastPromptedAt: now,
});

/**
 * Whether to send the viewer to system settings instead of the OS dialog.
 *
 * Android stops showing the permission dialog after repeated denials and just
 * returns "denied" immediately, so a second in-app prompt that silently does
 * nothing is worse than useless. Once someone has declined before, settings is
 * the only route that actually works.
 */
export const shouldOpenSystemSettings = (
  record?: PushPromptRecord | null,
): boolean => (record?.declineCount ?? 0) >= 1;

export type EnablePushDeps = {
  /** Shows the OS permission dialog; resolves true when granted. */
  requestPermission: () => Promise<boolean>;
  /** Fetches the FCM token and registers it with the backend. */
  registerToken: () => Promise<unknown>;
  /** Records the opt-in server-side. Best effort. */
  optIn?: (userId: number) => Promise<unknown>;
};

/**
 * Turn push on for a user who just accepted the prompt.
 *
 * The token MUST be re-registered after the grant. Android 13+ can refuse
 * getToken() before POST_NOTIFICATIONS exists, so the token captured at login
 * is often missing — and FirebaseChannel returns silently for a user with no
 * token, which is why a chef could accept the prompt and still receive nothing,
 * with no error logged anywhere.
 *
 * Dependencies are injected so this stays testable without native mocks.
 */
export const enablePushForUser = async (
  deps: EnablePushDeps,
  userId?: number | null,
): Promise<boolean> => {
  const granted = await deps.requestPermission();
  if (!granted) {
    return false;
  }

  await deps.registerToken();

  if (userId && deps.optIn) {
    try {
      await deps.optIn(userId);
    } catch {
      // Opt-in is bookkeeping; the token is what actually delivers the push.
    }
  }

  return true;
};
