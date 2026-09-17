import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import PushPermissionModal from '../../app/components/PushPermissionModal';

jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: 'FontAwesomeIcon',
}));

/**
 * The modal's copy was hardcoded to the customer framing ("when Chef X adds
 * something to their menu"), which reads as nonsense to a chef being asked to
 * enable notifications for their own approval and orders.
 */
describe('PushPermissionModal copy', () => {
  it('shows the chef framing when copy is supplied', () => {
    render(
      <PushPermissionModal
        visible
        title="Turn on notifications"
        body="We'll let you know the moment your account is approved."
        acceptLabel="Turn on notifications"
        onAccept={jest.fn()}
        onDecline={jest.fn()}
      />,
    );

    expect(screen.getByTestId('pushPermission.title')).toHaveTextContent(
      'Turn on notifications',
    );
    expect(screen.getByTestId('pushPermission.body')).toHaveTextContent(
      "We'll let you know the moment your account is approved.",
    );
  });

  // Control: the customer order screen passes only chefFirstName, so the
  // original wording must survive untouched.
  it('keeps the original customer wording by default', () => {
    render(
      <PushPermissionModal
        visible
        chefFirstName="Stefanie"
        onAccept={jest.fn()}
        onDecline={jest.fn()}
      />,
    );

    expect(screen.getByTestId('pushPermission.title')).toHaveTextContent(
      'Stay in the loop',
    );
    expect(screen.getByTestId('pushPermission.body')).toHaveTextContent(
      'Want to know when Chef Stefanie adds something to their menu?',
    );
  });

  it('reports the viewer\'s choice back to the screen', () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    render(
      <PushPermissionModal visible onAccept={onAccept} onDecline={onDecline} />,
    );

    fireEvent.press(screen.getByTestId('pushPermission.accept'));
    expect(onAccept).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId('pushPermission.decline'));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });
});
