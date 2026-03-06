jest.mock('../subsonicService', () => ({
  getApi: jest.fn(),
}));
jest.mock('../../store/sqliteStorage', () => require('../../store/__mocks__/sqliteStorage'));
jest.mock('../../store/albumListsStore', () => ({
  albumListsStore: {
    getState: jest.fn(() => ({
      refreshRecentlyPlayed: jest.fn(),
    })),
  },
}));

import { completedScrobbleStore } from '../../store/completedScrobbleStore';
import { pendingScrobbleStore } from '../../store/pendingScrobbleStore';
import { getApi } from '../subsonicService';
import {
  addCompletedScrobble,
  sendNowPlaying,
  initScrobbleService,
} from '../scrobbleService';

const mockGetApi = getApi as jest.Mock;

beforeEach(() => {
  pendingScrobbleStore.setState({ pendingScrobbles: [] });
  completedScrobbleStore.setState({ completedScrobbles: [], stats: { totalPlays: 0, totalListeningSeconds: 0, uniqueArtists: {} } });
  mockGetApi.mockReturnValue(null);
});

describe('addCompletedScrobble', () => {
  it('adds valid song to pending queue', () => {
    addCompletedScrobble({
      id: 's1',
      title: 'Song',
      artist: 'Artist',
      duration: 180,
    } as any);
    expect(pendingScrobbleStore.getState().pendingScrobbles).toHaveLength(1);
    expect(pendingScrobbleStore.getState().pendingScrobbles[0].song.id).toBe('s1');
  });

  it('does nothing when song has no id', () => {
    addCompletedScrobble({ title: 'Song', artist: 'A' } as any);
    expect(pendingScrobbleStore.getState().pendingScrobbles).toHaveLength(0);
  });

  it('does nothing when song has no title', () => {
    addCompletedScrobble({ id: 's1', artist: 'A' } as any);
    expect(pendingScrobbleStore.getState().pendingScrobbles).toHaveLength(0);
  });

  it('does nothing when song is null', () => {
    addCompletedScrobble(null as any);
    expect(pendingScrobbleStore.getState().pendingScrobbles).toHaveLength(0);
  });

  it('does nothing when song is undefined', () => {
    addCompletedScrobble(undefined as any);
    expect(pendingScrobbleStore.getState().pendingScrobbles).toHaveLength(0);
  });

  it('stores the time as a number', () => {
    addCompletedScrobble({ id: 's1', title: 'X', artist: 'A' } as any);
    const pending = pendingScrobbleStore.getState().pendingScrobbles[0];
    expect(typeof pending.time).toBe('number');
    expect(pending.time).toBeGreaterThan(0);
  });
});

describe('sendNowPlaying', () => {
  it('does nothing when api is null', async () => {
    mockGetApi.mockReturnValue(null);
    await expect(sendNowPlaying('track-1')).resolves.toBeUndefined();
  });

  it('calls api.scrobble with submission=false', async () => {
    const mockScrobble = jest.fn().mockResolvedValue(undefined);
    mockGetApi.mockReturnValue({ scrobble: mockScrobble });
    await sendNowPlaying('track-1');
    expect(mockScrobble).toHaveBeenCalledWith({ id: 'track-1', submission: false });
  });

  it('swallows errors silently', async () => {
    const mockScrobble = jest.fn().mockRejectedValue(new Error('network'));
    mockGetApi.mockReturnValue({ scrobble: mockScrobble });
    await expect(sendNowPlaying('track-1')).resolves.toBeUndefined();
  });
});

describe('processScrobbles (via addCompletedScrobble)', () => {
  it('submits pending scrobble to API and moves to completed', async () => {
    const mockScrobble = jest.fn().mockResolvedValue(undefined);
    mockGetApi.mockReturnValue({ scrobble: mockScrobble });

    addCompletedScrobble({ id: 's1', title: 'Song', artist: 'A', duration: 100 } as any);

    // processScrobbles is async and fire-and-forget; wait for it
    await new Promise((r) => setTimeout(r, 50));

    expect(mockScrobble).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1', submission: true }),
    );
    expect(pendingScrobbleStore.getState().pendingScrobbles).toHaveLength(0);
    expect(completedScrobbleStore.getState().completedScrobbles).toHaveLength(1);
  });

  it('retries once on first failure, succeeds on retry', async () => {
    const mockScrobble = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(undefined);
    mockGetApi.mockReturnValue({ scrobble: mockScrobble });

    addCompletedScrobble({ id: 's1', title: 'Song', artist: 'A' } as any);
    await new Promise((r) => setTimeout(r, 50));

    expect(mockScrobble).toHaveBeenCalledTimes(2);
    expect(pendingScrobbleStore.getState().pendingScrobbles).toHaveLength(0);
    expect(completedScrobbleStore.getState().completedScrobbles).toHaveLength(1);
  });

  it('stops processing on double failure, keeps scrobble pending', async () => {
    const mockScrobble = jest.fn().mockRejectedValue(new Error('fail'));
    mockGetApi.mockReturnValue({ scrobble: mockScrobble });

    addCompletedScrobble({ id: 's1', title: 'Song', artist: 'A' } as any);
    await new Promise((r) => setTimeout(r, 50));

    expect(mockScrobble).toHaveBeenCalledTimes(2);
    expect(pendingScrobbleStore.getState().pendingScrobbles).toHaveLength(1);
    expect(completedScrobbleStore.getState().completedScrobbles).toHaveLength(0);
  });

  it('skips scrobbles already in completed store', async () => {
    const mockScrobble = jest.fn().mockResolvedValue(undefined);
    mockGetApi.mockReturnValue({ scrobble: mockScrobble });

    // Add a scrobble to pending manually with a known ID
    pendingScrobbleStore.setState({
      pendingScrobbles: [{
        id: 'dup-1',
        song: { id: 's1', title: 'Song', artist: 'A' } as any,
        time: Date.now(),
      }],
    });
    // Also put the same ID in completed
    completedScrobbleStore.getState().addCompleted({
      id: 'dup-1',
      song: { id: 's1', title: 'Song', artist: 'A' } as any,
      time: Date.now(),
    });

    // Trigger processing by adding another scrobble
    addCompletedScrobble({ id: 's2', title: 'Song2', artist: 'B' } as any);
    await new Promise((r) => setTimeout(r, 50));

    // The duplicate should have been removed without calling scrobble for it
    const pending = pendingScrobbleStore.getState().pendingScrobbles;
    expect(pending.find((p) => p.id === 'dup-1')).toBeUndefined();
  });

  it('does nothing when api is null', async () => {
    mockGetApi.mockReturnValue(null);
    addCompletedScrobble({ id: 's1', title: 'Song', artist: 'A' } as any);
    await new Promise((r) => setTimeout(r, 50));
    // Scrobble stays in pending since API is unavailable
    expect(pendingScrobbleStore.getState().pendingScrobbles).toHaveLength(1);
  });
});
