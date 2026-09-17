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
