/**
 * Pure text helpers.
 *
 * Deliberately free of imports: utils/functions.ts pulls in services/api.ts
 * (for Photo_URL), which drags firebase and other native modules along with it,
 * making anything defined there untestable in isolation.
 */

/** Trims, and treats the literal strings "null"/"undefined" as empty. */
export const cleanText = (value?: string | null): string => {
  if (value == null) return '';
  const trimmed = String(value).trim();
  if (
    trimmed === '' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'undefined'
  ) {
    return '';
  }
  return trimmed;
};

/**
 * A street address as one line, skipping an empty or junk second line.
 *
 * address2 has historically been stored as the literal text "null" — FormData
 * stringifies a null field on its way to the server — so a plain truthiness
 * check still rendered "8755 Lindsey Ct, null". Both order screens share this
 * so they cannot drift apart.
 */
export const formatStreetAddress = (
  address?: string | null,
  address2?: string | null,
): string => {
  const line1 = cleanText(address);
  const line2 = cleanText(address2);

  if (!line1) return line2;
  return line2 ? `${line1}, ${line2}` : line1;
};
