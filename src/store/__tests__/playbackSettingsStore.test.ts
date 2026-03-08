jest.mock('../sqliteStorage', () => require('../__mocks__/sqliteStorage'));

import { playbackSettingsStore } from '../playbackSettingsStore';

beforeEach(() => {
  playbackSettingsStore.setState({
    maxBitRate: null,
    streamFormat: 'raw',
    estimateContentLength: false,
    repeatMode: 'off',
    playbackRate: 1,
    downloadMaxBitRate: 320,
    downloadFormat: 'mp3',
  });
});

describe('playbackSettingsStore', () => {
  it('setMaxBitRate updates bitrate', () => {
    playbackSettingsStore.getState().setMaxBitRate(320);
    expect(playbackSettingsStore.getState().maxBitRate).toBe(320);
  });

  it('setMaxBitRate to null removes limit', () => {
    playbackSettingsStore.getState().setMaxBitRate(320);
    playbackSettingsStore.getState().setMaxBitRate(null);
    expect(playbackSettingsStore.getState().maxBitRate).toBeNull();
  });

  it('setStreamFormat updates format', () => {
    playbackSettingsStore.getState().setStreamFormat('mp3');
    expect(playbackSettingsStore.getState().streamFormat).toBe('mp3');
  });

  it('setEstimateContentLength updates flag', () => {
    playbackSettingsStore.getState().setEstimateContentLength(true);
    expect(playbackSettingsStore.getState().estimateContentLength).toBe(true);
  });

  it('setRepeatMode updates repeat mode', () => {
    playbackSettingsStore.getState().setRepeatMode('all');
    expect(playbackSettingsStore.getState().repeatMode).toBe('all');
  });

  it('setPlaybackRate updates rate', () => {
    playbackSettingsStore.getState().setPlaybackRate(1.5);
    expect(playbackSettingsStore.getState().playbackRate).toBe(1.5);
  });

  it('setDownloadMaxBitRate updates download bitrate', () => {
    playbackSettingsStore.getState().setDownloadMaxBitRate(128);
    expect(playbackSettingsStore.getState().downloadMaxBitRate).toBe(128);
  });

  it('setDownloadFormat updates download format', () => {
    playbackSettingsStore.getState().setDownloadFormat('raw');
    expect(playbackSettingsStore.getState().downloadFormat).toBe('raw');
  });
});
