import React from 'react';
import { Platform } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import moment from 'moment';
import { StepChefBirthday } from './StepChefBirthday';
import { ShowErrorToast } from '../../../../utils/toast';
import { IUser } from '../../../../types/index';

// Capture every render of the native date picker so tests can assert on props
const mockPickerRenders: any[] = [];
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: (props: any) => {
    mockPickerRenders.push(props);
    return null;
  },
}));

jest.mock('../../../../utils/toast', () => ({
  ShowErrorToast: jest.fn(),
  ShowSuccessToast: jest.fn(),
}));

const yearsAgoSeconds = (years: number) =>
  moment().subtract(years, 'years').unix();

const renderStep = (birthday?: number) => {
  const onNext = jest.fn();
  const onBack = jest.fn();
  const onUpdateUserInfo = jest.fn();
  render(
    <StepChefBirthday
      userInfo={{ birthday } as unknown as IUser}
      onUpdateUserInfo={onUpdateUserInfo}
      onNext={onNext}
      onBack={onBack}
    />,
  );
  return { onNext, onBack, onUpdateUserInfo };
};

describe('StepChefBirthday', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPickerRenders.length = 0;
  });

  it('blocks continue when no birthday is selected', () => {
    const { onNext } = renderStep(undefined);

    fireEvent.press(screen.getByTestId('signup.chefBirthday.continueButton'));

    expect(ShowErrorToast).toHaveBeenCalledWith('Please select your birthday');
    expect(onNext).not.toHaveBeenCalled();
  });

  it('blocks continue for chefs under 18', () => {
    const { onNext } = renderStep(yearsAgoSeconds(17));

    fireEvent.press(screen.getByTestId('signup.chefBirthday.continueButton'));

    expect(ShowErrorToast).toHaveBeenCalledWith(
      'You must be at least 18 years old to become a chef',
    );
    expect(onNext).not.toHaveBeenCalled();
  });

  it('allows continue for chefs 18 or older (control)', () => {
    const { onNext } = renderStep(yearsAgoSeconds(20));

    fireEvent.press(screen.getByTestId('signup.chefBirthday.continueButton'));

    expect(ShowErrorToast).not.toHaveBeenCalled();
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('uses the spinner (wheel) picker on Android, not the calendar', () => {
    const osSpy = jest.replaceProperty(Platform, 'OS', 'android');

    renderStep(undefined);
    fireEvent.press(screen.getByTestId('signup.chefBirthday.birthdayInput'));

    const picker = mockPickerRenders[mockPickerRenders.length - 1];
    expect(picker).toBeDefined();
    expect(picker.display).toBe('spinner');

    osSpy.restore();
  });

  it('defaults the picker to 18 years ago when no birthday is set', () => {
    renderStep(undefined);
    fireEvent.press(screen.getByTestId('signup.chefBirthday.birthdayInput'));

    const picker = mockPickerRenders[mockPickerRenders.length - 1];
    expect(picker).toBeDefined();
    const defaultAge = moment().diff(moment(picker.value), 'years');
    expect(defaultAge).toBe(18);
  });

  it('calls onBack when Back is pressed', () => {
    const { onBack } = renderStep(undefined);

    fireEvent.press(screen.getByTestId('signup.chefBirthday.backButton'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
