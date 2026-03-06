jest.mock('subsonic-api', () => ({
  __esModule: true,
  default: class {},
}));
jest.mock('expo-crypto', () => ({
  getRandomValues: jest.fn((arr: Uint8Array) => arr),
  getRandomBytesAsync: jest.fn().mockResolvedValue(new Uint8Array(16)),
  digestStringAsync: jest.fn().mockResolvedValue('mocktoken'),
  CryptoDigestAlgorithm: { MD5: 'MD5' },
  CryptoEncoding: { HEX: 'hex' },
}));
jest.mock('../../store/authStore', () => ({
  authStore: { getState: jest.fn() },
}));
jest.mock('../../store/offlineModeStore', () => ({
  offlineModeStore: { getState: jest.fn(() => ({ offlineMode: false })) },
}));
jest.mock('../../store/playbackSettingsStore', () => ({
  playbackSettingsStore: { getState: jest.fn() },
}));

import { authStore } from '../../store/authStore';
import { playbackSettingsStore } from '../../store/playbackSettingsStore';
import {
  clearApiCache,
  ensureCoverArtAuth,
  getCoverArtUrl,
  getDownloadStreamUrl,
  getStreamUrl,
  stripCoverArtSuffix,
} from '../subsonicService';

const mockAuthStore = authStore as jest.Mocked<typeof authStore>;
const mockPlaybackSettingsStore = playbackSettingsStore as jest.Mocked<typeof playbackSettingsStore>;

beforeEach(() => {
  clearApiCache();
  mockAuthStore.getState.mockReturnValue({
    isLoggedIn: true,
    serverUrl: 'https://music.example.com',
    username: 'user',
    password: 'pass',
    apiVersion: '1.16',
    rehydrated: true,
  } as any);
  mockPlaybackSettingsStore.getState.mockReturnValue({
    maxBitRate: null,
    streamFormat: 'raw' as const,
    estimateContentLength: false,
    downloadMaxBitRate: null,
    downloadFormat: 'raw' as const,
  } as any);
});

describe('stripCoverArtSuffix', () => {
  it('strips hex suffix', () => {
    expect(stripCoverArtSuffix('al-123_abc123')).toBe('al-123');
    expect(stripCoverArtSuffix('pl-456_def456')).toBe('pl-456');
  });

  it('is idempotent when no suffix', () => {
    expect(stripCoverArtSuffix('al-123')).toBe('al-123');
  });

  it('preserves when suffix is not hex', () => {
    expect(stripCoverArtSuffix('al-123_xyz')).toBe('al-123_xyz');
  });

  it('preserves when no underscore', () => {
    expect(stripCoverArtSuffix('al123')).toBe('al123');
  });

  it('handles empty string', () => {
    expect(stripCoverArtSuffix('')).toBe('');
  });

  it('handles underscore at start', () => {
    expect(stripCoverArtSuffix('_abc123')).toBe('_abc123');
  });

  it('strips only last underscore segment', () => {
    expect(stripCoverArtSuffix('al-123_extra_abc123')).toBe('al-123_extra');
  });
});

describe('getCoverArtUrl', () => {
  it('returns null when not logged in', async () => {
    mockAuthStore.getState.mockReturnValue({
      isLoggedIn: false,
      serverUrl: 'https://x.com',
      username: 'u',
    } as any);
    await ensureCoverArtAuth();
    expect(getCoverArtUrl('al-1')).toBeNull();
  });

  it('returns null for empty coverArtId', async () => {
    await ensureCoverArtAuth();
    expect(getCoverArtUrl('')).toBeNull();
  });

  it('returns null when ensureCoverArtAuth has not been called', () => {
    clearApiCache();
    expect(getCoverArtUrl('al-1')).toBeNull();
  });

  it('builds URL with stripped coverArtId', async () => {
    await ensureCoverArtAuth();
    const url = getCoverArtUrl('al-123_abc');
    expect(url).toContain('https://music.example.com/rest/getCoverArt.view');
    expect(url).toContain('id=al-123');
    expect(url).toContain('u=user');
  });

  it('includes size param when provided', async () => {
    await ensureCoverArtAuth();
    const url = getCoverArtUrl('al-1', 300);
    expect(url).toContain('size=300');
  });

  it('omits size param when not provided', async () => {
    await ensureCoverArtAuth();
    const url = getCoverArtUrl('al-1');
    expect(url).not.toContain('size=');
  });
});

describe('getStreamUrl', () => {
  it('returns null when not logged in', async () => {
    mockAuthStore.getState.mockReturnValue({ isLoggedIn: false } as any);
    await ensureCoverArtAuth();
    expect(getStreamUrl('track-1')).toBeNull();
  });

  it('returns null for empty trackId', async () => {
    await ensureCoverArtAuth();
    expect(getStreamUrl('')).toBeNull();
  });

  it('builds stream URL with playback settings', async () => {
    await ensureCoverArtAuth();
    mockPlaybackSettingsStore.getState.mockReturnValue({
      maxBitRate: 320,
      streamFormat: 'mp3' as const,
      estimateContentLength: true,
    } as any);
    const url = getStreamUrl('track-1');
    expect(url).toContain('https://music.example.com/rest/stream.view');
    expect(url).toContain('id=track-1');
    expect(url).toContain('maxBitRate=320');
    expect(url).toContain('format=mp3');
    expect(url).toContain('estimateContentLength=true');
  });

  it('omits format and bitrate when set to raw/null', async () => {
    await ensureCoverArtAuth();
    const url = getStreamUrl('track-1');
    expect(url).not.toContain('format=');
    expect(url).not.toContain('maxBitRate=');
    expect(url).not.toContain('estimateContentLength=');
  });

  it('includes timeOffset when provided', async () => {
    await ensureCoverArtAuth();
    const url = getStreamUrl('track-1', 120);
    expect(url).toContain('timeOffset=120');
  });

  it('omits timeOffset when zero', async () => {
    await ensureCoverArtAuth();
    const url = getStreamUrl('track-1', 0);
    expect(url).not.toContain('timeOffset');
  });
});

describe('getDownloadStreamUrl', () => {
  it('returns null when not logged in', async () => {
    mockAuthStore.getState.mockReturnValue({ isLoggedIn: false } as any);
    await ensureCoverArtAuth();
    expect(getDownloadStreamUrl('track-1')).toBeNull();
  });

  it('returns null for empty trackId', async () => {
    await ensureCoverArtAuth();
    expect(getDownloadStreamUrl('')).toBeNull();
  });

  it('builds download URL with estimateContentLength', async () => {
    await ensureCoverArtAuth();
    const url = getDownloadStreamUrl('track-1');
    expect(url).toContain('estimateContentLength=true');
  });

  it('includes download format when set', async () => {
    await ensureCoverArtAuth();
    mockPlaybackSettingsStore.getState.mockReturnValue({
      downloadMaxBitRate: 256,
      downloadFormat: 'mp3' as const,
    } as any);
    const url = getDownloadStreamUrl('track-1');
    expect(url).toContain('maxBitRate=256');
    expect(url).toContain('format=mp3');
  });

  it('omits format and bitrate when using raw defaults', async () => {
    await ensureCoverArtAuth();
    const url = getDownloadStreamUrl('track-1');
    expect(url).not.toContain('format=');
    expect(url).not.toContain('maxBitRate=');
  });
});

describe('getApi', () => {
  it('returns null in offline mode', () => {
    const { offlineModeStore } = require('../../store/offlineModeStore');
    offlineModeStore.getState.mockReturnValue({ offlineMode: true });
    const { getApi } = require('../subsonicService');
    expect(getApi()).toBeNull();
    offlineModeStore.getState.mockReturnValue({ offlineMode: false });
  });

  it('returns null when not logged in', () => {
    mockAuthStore.getState.mockReturnValue({ isLoggedIn: false } as any);
    const { getApi } = require('../subsonicService');
    expect(getApi()).toBeNull();
  });

  it('returns null when serverUrl is missing', () => {
    mockAuthStore.getState.mockReturnValue({ isLoggedIn: true, serverUrl: null, username: 'u', password: 'p' } as any);
    const { getApi } = require('../subsonicService');
    expect(getApi()).toBeNull();
  });

  it('returns an API instance when logged in', () => {
    const { getApi } = require('../subsonicService');
    const api = getApi();
    expect(api).not.toBeNull();
  });

  it('returns cached instance on repeated calls with same credentials', () => {
    const { getApi } = require('../subsonicService');
    const api1 = getApi();
    const api2 = getApi();
    expect(api1).toBe(api2);
  });

  it('creates new instance when credentials change', () => {
    const { getApi } = require('../subsonicService');
    const api1 = getApi();
    clearApiCache();
    mockAuthStore.getState.mockReturnValue({
      isLoggedIn: true,
      serverUrl: 'https://other.example.com',
      username: 'user2',
      password: 'pass2',
      apiVersion: '1.16',
      rehydrated: true,
    } as any);
    const api2 = getApi();
    expect(api2).not.toBe(api1);
  });
});

describe('login', () => {
  const { default: SubsonicAPI } = require('subsonic-api');

  it('returns success with version on successful ping', async () => {
    SubsonicAPI.prototype.ping = jest.fn().mockResolvedValue({
      status: 'ok',
      version: '1.16.0',
    });
    const { login } = require('../subsonicService');
    const result = await login('music.example.com', 'user', 'pass');
    expect(result).toEqual({ success: true, version: '1.16.0' });
  });

  it('adds https:// to bare hostname', async () => {
    SubsonicAPI.prototype.ping = jest.fn().mockResolvedValue({
      status: 'ok',
      version: '1.16.0',
    });
    const { login } = require('../subsonicService');
    const result = await login('music.example.com', 'user', 'pass');
    expect(result.success).toBe(true);
  });

  it('returns error on failed ping', async () => {
    SubsonicAPI.prototype.ping = jest.fn().mockResolvedValue({
      status: 'failed',
      error: { code: 40, message: 'Wrong username or password' },
    });
    const { login } = require('../subsonicService');
    const result = await login('https://music.example.com', 'user', 'wrong');
    expect(result).toEqual({ success: false, error: 'Wrong username or password' });
  });

  it('returns error on code 40 without message', async () => {
    SubsonicAPI.prototype.ping = jest.fn().mockResolvedValue({
      status: 'failed',
      error: { code: 40 },
    });
    const { login } = require('../subsonicService');
    const result = await login('https://music.example.com', 'user', 'wrong');
    expect(result).toEqual({ success: false, error: 'Wrong username or password' });
  });

  it('returns generic error on unknown failure code', async () => {
    SubsonicAPI.prototype.ping = jest.fn().mockResolvedValue({
      status: 'failed',
      error: { code: 99 },
    });
    const { login } = require('../subsonicService');
    const result = await login('https://music.example.com', 'user', 'pass');
    expect(result).toEqual({ success: false, error: 'Authentication failed' });
  });

  it('returns connection error on exception', async () => {
    SubsonicAPI.prototype.ping = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const { login } = require('../subsonicService');
    const result = await login('https://music.example.com', 'user', 'pass');
    expect(result).toEqual({ success: false, error: 'ECONNREFUSED' });
  });

  it('returns generic error on non-Error exception', async () => {
    SubsonicAPI.prototype.ping = jest.fn().mockRejectedValue('something');
    const { login } = require('../subsonicService');
    const result = await login('https://music.example.com', 'user', 'pass');
    expect(result).toEqual({ success: false, error: 'Connection failed' });
  });

  it('prefers serverVersion for OpenSubsonic servers', async () => {
    SubsonicAPI.prototype.ping = jest.fn().mockResolvedValue({
      status: 'ok',
      version: '1.16.0',
      openSubsonic: true,
      serverVersion: '0.52.5',
    });
    const { login } = require('../subsonicService');
    const result = await login('https://music.example.com', 'user', 'pass');
    expect(result).toEqual({ success: true, version: '0.52.5' });
  });
});
