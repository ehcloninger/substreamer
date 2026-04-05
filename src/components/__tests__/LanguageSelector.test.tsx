jest.mock('../../store/sqliteStorage', () => require('../../store/__mocks__/sqliteStorage'));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      card: '#1c1c1e',
      primary: '#3478f6',
      textPrimary: '#fff',
      textSecondary: '#888',
      border: '#333',
    },
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: { name: string }) => <Text>{props.name}</Text> };
});

const mockChangeLanguage = jest.fn().mockResolvedValue(undefined);

jest.mock('../../i18n', () => ({
  i18n: {
    language: 'en',
    changeLanguage: (...args: unknown[]) => mockChangeLanguage(...args),
  },
}));

import { localeStore } from '../../store/localeStore';

// Must import after mocks
const { LanguageSelector } = require('../LanguageSelector');

beforeEach(() => {
  localeStore.setState({ locale: null });
  mockChangeLanguage.mockClear();
});

describe('LanguageSelector', () => {
  it('renders with "Language" label', () => {
    const { getByText } = render(<LanguageSelector />);
    expect(getByText('Language')).toBeTruthy();
  });

  it('renders globe icon', () => {
    const { getByText } = render(<LanguageSelector />);
    expect(getByText('globe-outline')).toBeTruthy();
  });

  it('shows "Device default" when locale is null', () => {
    const { getByText } = render(<LanguageSelector />);
    expect(getByText('Device default')).toBeTruthy();
  });

  it('shows language native name when locale is set', () => {
    localeStore.setState({ locale: 'en' });
    const { getByText } = render(<LanguageSelector />);
    expect(getByText('English')).toBeTruthy();
  });

  it('shows chevron-down when dropdown is closed', () => {
    const { getByText } = render(<LanguageSelector />);
    expect(getByText('chevron-down')).toBeTruthy();
  });

  it('opens dropdown on press and shows chevron-up', () => {
    const { getByText } = render(<LanguageSelector />);
    fireEvent.press(getByText('Language'));
    expect(getByText('chevron-up')).toBeTruthy();
  });

  it('shows "Device default" option in dropdown', () => {
    const { getByText, getAllByText } = render(<LanguageSelector />);
    fireEvent.press(getByText('Language'));
    // "Device default" appears both in the header value and as a dropdown option
    const matches = getAllByText('Device default');
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('shows language options in dropdown', () => {
    const { getByText } = render(<LanguageSelector />);
    fireEvent.press(getByText('Language'));
    // English should appear as an option in the dropdown
    expect(getByText('English')).toBeTruthy();
  });

  it('shows checkmark next to "Device default" when locale is null', () => {
    const { getByText, getAllByText } = render(<LanguageSelector />);
    fireEvent.press(getByText('Language'));
    // The checkmark icon should appear
    const checkmarks = getAllByText('checkmark');
    expect(checkmarks.length).toBeGreaterThanOrEqual(1);
  });

  it('selecting a language calls setLocale and changeLanguage', () => {
    const { getByText } = render(<LanguageSelector />);
    fireEvent.press(getByText('Language'));
    // Tap on "English" option in the dropdown
    fireEvent.press(getByText('English'));
    expect(localeStore.getState().locale).toBe('en');
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });

  it('selecting "Device default" sets locale to null and calls changeLanguage with "en"', () => {
    localeStore.setState({ locale: 'en' });
    const { getByText, getAllByText } = render(<LanguageSelector />);
    fireEvent.press(getByText('Language'));
    // The "Device default" option in the list
    const defaults = getAllByText('Device default');
    // Tap the option (last one should be the dropdown item)
    fireEvent.press(defaults[defaults.length - 1]);
    expect(localeStore.getState().locale).toBeNull();
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });

  it('closes dropdown after selecting a language', () => {
    const { getByText, queryByText } = render(<LanguageSelector />);
    fireEvent.press(getByText('Language'));
    expect(getByText('chevron-up')).toBeTruthy();
    fireEvent.press(getByText('English'));
    // Dropdown should be closed now
    expect(queryByText('chevron-up')).toBeNull();
    expect(getByText('chevron-down')).toBeTruthy();
  });

  it('toggles dropdown open and closed', () => {
    const { getByText } = render(<LanguageSelector />);
    // Open
    fireEvent.press(getByText('Language'));
    expect(getByText('chevron-up')).toBeTruthy();
    // Close
    fireEvent.press(getByText('Language'));
    expect(getByText('chevron-down')).toBeTruthy();
  });

  it('renders with login variant palette', () => {
    const { getByText } = render(<LanguageSelector variant="login" />);
    expect(getByText('Language')).toBeTruthy();
    expect(getByText('Device default')).toBeTruthy();
  });

  it('shows checkmark next to selected language when locale is set', () => {
    localeStore.setState({ locale: 'en' });
    const { getByText, getAllByText } = render(<LanguageSelector />);
    fireEvent.press(getByText('Language'));
    const checkmarks = getAllByText('checkmark');
    expect(checkmarks.length).toBeGreaterThanOrEqual(1);
  });
});
