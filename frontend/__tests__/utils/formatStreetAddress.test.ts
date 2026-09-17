import { formatStreetAddress } from '../../app/utils/text';

/**
 * Order screens rendered "8755 Lindsey Ct, null". address2 was a plain
 * truthiness check, and the value stored was the literal *string* "null" —
 * FormData stringifies a null field on its way to the server — so the guard
 * never fired.
 */
describe('formatStreetAddress', () => {
  it('drops a second line stored as the string "null"', () => {
    expect(formatStreetAddress('8755 Lindsey Ct', 'null')).toBe('8755 Lindsey Ct');
    expect(formatStreetAddress('8755 Lindsey Ct', 'NULL')).toBe('8755 Lindsey Ct');
    expect(formatStreetAddress('8755 Lindsey Ct', 'undefined')).toBe('8755 Lindsey Ct');
  });

  it('drops a genuinely empty second line', () => {
    for (const empty of [null, undefined, '', '   ']) {
      expect(formatStreetAddress('8755 Lindsey Ct', empty)).toBe('8755 Lindsey Ct');
    }
  });

  it('never renders a bare comma', () => {
    expect(formatStreetAddress('8755 Lindsey Ct', 'null')).not.toContain(',');
    expect(formatStreetAddress('', 'Apt 4B')).toBe('Apt 4B');
    expect(formatStreetAddress(null, null)).toBe('');
  });

  // Control: a real second line is still joined onto the first.
  it('joins a real apartment line', () => {
    expect(formatStreetAddress('8755 Lindsey Ct', 'Apt 4B')).toBe('8755 Lindsey Ct, Apt 4B');
  });
});
