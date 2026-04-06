jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#ff6600',
      textPrimary: '#ffffff',
      textSecondary: '#888888',
      border: '#333333',
      red: '#ff0000',
      background: '#000000',
      card: '#1e1e1e',
    },
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: (props: { name: string; color: string; size: number }) => (
      <Text testID={`icon-${props.name}`}>{props.name}</Text>
    ),
  };
});

jest.mock('react-native-track-player', () => ({
  __esModule: true,
  default: {
    setSleepTimer: jest.fn().mockResolvedValue(undefined),
    clearSleepTimer: jest.fn().mockResolvedValue(undefined),
  },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TrackPlayer from 'react-native-track-player';

import { sleepTimerStore } from '../../store/sleepTimerStore';

// Must import after mocks
const { SleepTimerSheet } = require('../SleepTimerSheet');

beforeEach(() => {
  sleepTimerStore.setState({
    endTime: null,
    endOfTrack: false,
    remaining: null,
    sheetVisible: true,
  });
  jest.clearAllMocks();
});

describe('SleepTimerSheet', () => {
  it('renders title', () => {
    const { getByText } = render(<SleepTimerSheet />);
    expect(getByText('sleepTimer')).toBeTruthy();
  });

  it('renders all four time options', () => {
    const { getByText } = render(<SleepTimerSheet />);
    expect(getByText('sleepTimer15')).toBeTruthy();
    expect(getByText('sleepTimer30')).toBeTruthy();
    expect(getByText('sleepTimer45')).toBeTruthy();
    expect(getByText('sleepTimer60')).toBeTruthy();
  });

  it('renders end of track option', () => {
    const { getByText } = render(<SleepTimerSheet />);
    expect(getByText('sleepTimerEndOfTrack')).toBeTruthy();
  });

  it('calls setSleepTimer with 15 minutes and hides sheet', () => {
    const { getByText } = render(<SleepTimerSheet />);
    fireEvent.press(getByText('sleepTimer15'));
    expect(TrackPlayer.setSleepTimer).toHaveBeenCalledWith(15 * 60);
    expect(sleepTimerStore.getState().sheetVisible).toBe(false);
  });

  it('calls setSleepTimer with 30 minutes', () => {
    const { getByText } = render(<SleepTimerSheet />);
    fireEvent.press(getByText('sleepTimer30'));
    expect(TrackPlayer.setSleepTimer).toHaveBeenCalledWith(30 * 60);
  });

  it('calls setSleepTimer with 45 minutes', () => {
    const { getByText } = render(<SleepTimerSheet />);
    fireEvent.press(getByText('sleepTimer45'));
    expect(TrackPlayer.setSleepTimer).toHaveBeenCalledWith(45 * 60);
  });

  it('calls setSleepTimer with 60 minutes', () => {
    const { getByText } = render(<SleepTimerSheet />);
    fireEvent.press(getByText('sleepTimer60'));
    expect(TrackPlayer.setSleepTimer).toHaveBeenCalledWith(60 * 60);
  });

  it('calls setSleepTimer with -1 for end of track', () => {
    const { getByText } = render(<SleepTimerSheet />);
    fireEvent.press(getByText('sleepTimerEndOfTrack'));
    expect(TrackPlayer.setSleepTimer).toHaveBeenCalledWith(-1);
    expect(sleepTimerStore.getState().sheetVisible).toBe(false);
  });

  it('does not show cancel button when inactive', () => {
    const { queryByText } = render(<SleepTimerSheet />);
    expect(queryByText('sleepTimerCancel')).toBeNull();
  });

  it('shows cancel button when timed timer is active', () => {
    sleepTimerStore.setState({ endTime: Date.now() / 1000 + 600 });
    const { getByText } = render(<SleepTimerSheet />);
    expect(getByText('sleepTimerCancel')).toBeTruthy();
  });

  it('shows cancel button when endOfTrack is active', () => {
    sleepTimerStore.setState({ endOfTrack: true });
    const { getByText } = render(<SleepTimerSheet />);
    expect(getByText('sleepTimerCancel')).toBeTruthy();
  });

  it('calls clearSleepTimer and hides sheet on cancel', () => {
    sleepTimerStore.setState({ endTime: Date.now() / 1000 + 600 });
    const { getByText } = render(<SleepTimerSheet />);
    fireEvent.press(getByText('sleepTimerCancel'));
    expect(TrackPlayer.clearSleepTimer).toHaveBeenCalled();
    expect(sleepTimerStore.getState().sheetVisible).toBe(false);
  });
});
