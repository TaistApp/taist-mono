import { PREP_SECTIONS } from '../../app/screens/chef/components/prepList';

/**
 * "All ingredients" is the only section with no bullet list, so sitting between
 * the two bulleted sections it broke up the screen. Ending on it keeps the two
 * lists together and the layout symmetric.
 */
describe('chef prep list order', () => {
  it('puts the single-line ingredients section last', () => {
    expect(PREP_SECTIONS.map(s => s.title)).toEqual([
      'Your mobile equipment',
      'Cleaning supplies',
      'All ingredients',
    ]);
  });

  // Control: reordering must not drop any bullet content.
  it('keeps every bullet intact', () => {
    const byTitle = Object.fromEntries(PREP_SECTIONS.map(s => [s.title, s]));

    expect(byTitle['Your mobile equipment'].items).toHaveLength(3);
    expect(byTitle['Cleaning supplies'].items).toHaveLength(3);
    expect(byTitle['All ingredients'].note).toBe('(bring extras just in case!)');
    expect(byTitle['All ingredients'].items).toBeUndefined();
  });
});
