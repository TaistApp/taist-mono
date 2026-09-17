import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import DiscountCodeInput from '../../app/components/DiscountCodeInput';

jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: 'FontAwesomeIcon',
}));

const applied = { code: 'TAIST30', discount_amount: 15.23 };

const renderInput = (props = {}) =>
  render(
    <DiscountCodeInput
      code=""
      onCodeChange={jest.fn()}
      onApply={jest.fn()}
      onRemove={jest.fn()}
      appliedDiscount={null}
      error=""
      isLoading={false}
      {...props}
    />,
  );

/**
 * The applied-code row ended in a red X crammed against the savings text, which
 * read as an error on an otherwise successful green row. A plain "Remove" label
 * keeps the code removable without the alarming glyph.
 */
describe('DiscountCodeInput applied state', () => {
  it('offers a plain Remove control instead of a red X', () => {
    renderInput({ appliedDiscount: applied });

    expect(screen.getByTestId('discount.remove')).toHaveTextContent('Remove');
  });

  it('still removes the applied code', () => {
    const onRemove = jest.fn();
    renderInput({ appliedDiscount: applied, onRemove });

    fireEvent.press(screen.getByTestId('discount.remove'));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('puts the saving on its own line under the code', () => {
    renderInput({ appliedDiscount: applied });

    // One combined line wrapped awkwardly against the Remove control.
    expect(screen.getByText('TAIST30 applied')).toBeTruthy();
    expect(screen.getByText('Save $15.23')).toBeTruthy();
    expect(screen.queryByText('TAIST30 applied - Save $15.23')).toBeNull();
  });

  // Control: with no code applied the entry field and Apply button still show.
  it('shows the entry form when nothing is applied', () => {
    renderInput();

    expect(screen.queryByTestId('discount.remove')).toBeNull();
    expect(screen.getByText('Apply')).toBeTruthy();
  });
});
