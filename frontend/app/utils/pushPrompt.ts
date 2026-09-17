/**
 * When to ask for notification permission.
 *
 * Permission was only ever requested from one screen — customer order detail —
 * so a chef was never asked at all. `messaging().getToken()` still returns a
 * valid token without permission, so the backend stored a token, FirebaseChannel
 * sent successfully, and Android silently dropped the display: a chef approved
 * by an admin got the welcome email but no push, with nothing logged anywhere.
 *
 * The OS prompt can only be shown once, so each surface records that it asked
 * under its own key and never re-prompts.
 */
export const PUSH_PROMPT_KEYS = {
  customer: '@push_prompt_shown',
  chef: '@chef_push_prompt_shown',
} as const;

/** Delay before the modal appears, so it doesn't race the screen's first paint. */
export const PUSH_PROMPT_DELAY_MS = 2000;

type PromptArgs = {
  /** Has this surface already asked (from storage)? */
  alreadyShown: boolean;
  /** The signed-in user's id; absent means the screen has no user yet. */
  userId?: number | null;
  /** True when the screen is about to navigate elsewhere. */
  redirecting?: boolean;
};

/**
 * Ask only once, only with a real user, and never over a screen that is
 * already navigating away.
 */
export const shouldShowPushPrompt = ({
  alreadyShown,
  userId,
  redirecting = false,
}: PromptArgs): boolean => {
  if (alreadyShown) return false;
  if (redirecting) return false;
  return typeof userId === 'number' && userId > 0;
};

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
