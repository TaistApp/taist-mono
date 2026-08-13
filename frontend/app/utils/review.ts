// Maximum length of a customer review. The DB column is TEXT, so this is a
// product limit, not a storage one — keep the input slice and the counter
// label reading from the same constant.
export const REVIEW_MAX_LENGTH = 150;

export const truncateReview = (text: string): string =>
  text.slice(0, REVIEW_MAX_LENGTH);
