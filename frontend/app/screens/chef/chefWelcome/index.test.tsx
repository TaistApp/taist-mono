import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import ChefWelcome from './index';
import { navigate } from '../../../utils/navigation';

jest.mock('../../../utils/navigation', () => ({
  navigate: {
    toChef: {
      safetyQuiz: jest.fn(),
    },
  },
}));

describe('ChefWelcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the benefits and insurance/background info on page 1', () => {
    render(<ChefWelcome />);

    expect(screen.getByText('What Chefs Love')).toBeOnTheScreen();
    expect(screen.getByText('Work 24/7')).toBeOnTheScreen();
    expect(screen.getByText('Set Your Prices')).toBeOnTheScreen();
    expect(screen.getByText('Custom Menus')).toBeOnTheScreen();
    expect(screen.getByText('We cover your insurance')).toBeOnTheScreen();
    expect(screen.getByText('Background check required')).toBeOnTheScreen();
  });

  it('renders the What You\'ll Need checklist on page 2', () => {
    render(<ChefWelcome />);

    expect(screen.getByText("What You'll Need")).toBeOnTheScreen();
    expect(screen.getByText('Cooler with ice')).toBeOnTheScreen();
    expect(screen.getByText('Dish soap')).toBeOnTheScreen();
  });

  it('advances to page 2 on Continue, then starts the safety quiz', () => {
    render(<ChefWelcome />);

    // Page 1: CTA reads Continue and does not navigate yet
    fireEvent.press(screen.getByText('Continue'));
    expect(navigate.toChef.safetyQuiz).not.toHaveBeenCalled();

    // Page 2: CTA reads Start Safety Quiz and navigates
    fireEvent.press(screen.getByText('Start Safety Quiz'));
    expect(navigate.toChef.safetyQuiz).toHaveBeenCalledTimes(1);
  });
});
