import { REVIEW_MAX_LENGTH, truncateReview } from '../../app/utils/review';

describe('truncateReview', () => {
  it('allows reviews up to 150 characters', () => {
    expect(REVIEW_MAX_LENGTH).toBe(150);
    const text = 'a'.repeat(150);
    expect(truncateReview(text)).toBe(text);
  });

  it('truncates reviews longer than 150 characters', () => {
    expect(truncateReview('b'.repeat(200))).toHaveLength(150);
  });

  it('leaves short reviews untouched (control)', () => {
    expect(truncateReview('Great meal!')).toBe('Great meal!');
    expect(truncateReview('')).toBe('');
  });
});
