import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import ChefRequestToggles from '../../app/components/ChefRequestToggles';
import { toBool } from '../../app/utils/bool';

describe('toBool', () => {
  it('treats the API tinyint shapes as true', () => {
    expect(toBool(true)).toBe(true);
    expect(toBool(1)).toBe(true);
    expect(toBool('1')).toBe(true);
    expect(toBool('true')).toBe(true);
  });

  it('treats everything else as false (control)', () => {
    expect(toBool(false)).toBe(false);
    expect(toBool(0)).toBe(false);
    expect(toBool('0')).toBe(false);
    expect(toBool('false')).toBe(false);
    expect(toBool(undefined)).toBe(false);
    expect(toBool(null)).toBe(false);
  });
});

describe('ChefRequestToggles', () => {
  const setup = (overrides = {}) => {
    const props = {
      shoeCoverings: false,
      containers: false,
      onShoeCoveringsChange: jest.fn(),
      onContainersChange: jest.fn(),
      ...overrides,
    };
    render(<ChefRequestToggles {...props} />);
    return props;
  };

  it('renders both requests with the wording the customer sees', () => {
    setup();
    expect(screen.getByText('Request Chef Wear Shoe Coverings?')).toBeTruthy();
    expect(screen.getByText('Request Chef Bring Containers?')).toBeTruthy();
  });

  it('toggles shoe coverings on', () => {
    const props = setup();
    fireEvent.press(screen.getByTestId('chefRequests.shoeCoveringsToggle'));
    expect(props.onShoeCoveringsChange).toHaveBeenCalledWith(true);
    expect(props.onContainersChange).not.toHaveBeenCalled();
  });

  it('toggles containers on', () => {
    const props = setup();
    fireEvent.press(screen.getByTestId('chefRequests.containersToggle'));
    expect(props.onContainersChange).toHaveBeenCalledWith(true);
    expect(props.onShoeCoveringsChange).not.toHaveBeenCalled();
  });

  it('toggles an already-on request back off (control)', () => {
    const props = setup({ shoeCoverings: true, containers: true });
    fireEvent.press(screen.getByTestId('chefRequests.shoeCoveringsToggle'));
    fireEvent.press(screen.getByTestId('chefRequests.containersToggle'));
    expect(props.onShoeCoveringsChange).toHaveBeenCalledWith(false);
    expect(props.onContainersChange).toHaveBeenCalledWith(false);
  });

  it('hides the section heading in compact mode', () => {
    setup();
    expect(screen.getByText('Chef Requests')).toBeTruthy();

    screen.unmount();
    render(
      <ChefRequestToggles
        shoeCoverings={false}
        containers={false}
        onShoeCoveringsChange={jest.fn()}
        onContainersChange={jest.fn()}
        compact
      />,
    );
    expect(screen.queryByText('Chef Requests')).toBeNull();
  });
});
