/**
 * The API hands back booleans as 0/1 (and sometimes "0"/"1") from MySQL
 * tinyint columns, so anything that isn't an explicit truthy flag is false.
 *
 * Lives here rather than in utils/functions so it can be imported (and
 * tested) without pulling in services/api and its native dependencies.
 */
export const toBool = (value?: boolean | number | string | null): boolean => {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return v === '1' || v === 'true';
  }
  return false;
};
