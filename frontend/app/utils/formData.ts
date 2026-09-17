/**
 * Pure — no imports — so it stays testable without pulling services/api.ts
 * (and firebase) along with it.
 */

/**
 * Build a FormData body, omitting keys with no value.
 *
 * FormData stringifies whatever it is handed, so a null field reaches the
 * server as the literal text "null" and gets stored — which is how
 * "8755 Lindsey Ct, null" ended up rendered on an order. Any nullable field
 * sent through here was affected, not just address2.
 *
 * Omitting the key is safe: the backend already defaults a missing field to ''.
 * Genuine falsy values (0, false, '') are preserved — only null and undefined
 * are dropped.
 */
export const toFormData = (obj: Record<string, any>): FormData => {
  const formData = new FormData();

  for (const key in obj) {
    const value = obj[key];
    if (value === null || value === undefined) {
      continue;
    }
    formData.append(key, value as any);
  }

  return formData;
};
