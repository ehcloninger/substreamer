import {
  completedScrobbleStore,
  type CompletedScrobble,
  type ListeningStats,
} from '../completedScrobbleStore';

jest.mock('../sqliteStorage', () => require('../__mocks__/sqliteStorage'));

const EMPTY_STATS: ListeningStats = {
  totalPlays: 0,
  totalListeningSeconds: 0,
  uniqueArtists: {},
};

function validScrobble(overrides?: Partial<CompletedScrobble>): CompletedScrobble {
  return {
    id: 'scrobble-1',
    song: { id: 's1', title: 'Song', artist: 'Artist', duration: 180 },
    time: Date.now(),
    ...overrides,
  } as CompletedScrobble;
}

function resetStore() {
  completedScrobbleStore.setState({
    completedScrobbles: [],
    stats: { ...EMPTY_STATS },
  });
}

beforeEach(resetStore);

describe('addCompleted', () => {
  it('adds valid scrobble and increments stats', () => {
    const s = validScrobble();
    completedScrobbleStore.getState().addCompleted(s);

    const state = completedScrobbleStore.getState();
    expect(state.completedScrobbles).toHaveLength(1);
    expect(state.completedScrobbles[0]).toEqual(s);
    expect(state.stats.totalPlays).toBe(1);
    expect(state.stats.totalListeningSeconds).toBe(180);
    expect(state.stats.uniqueArtists).toEqual({ Artist: true });
  });

  it('rejects when id is missing', () => {
    completedScrobbleStore.getState().addCompleted(validScrobble({ id: '' }));
    expect(completedScrobbleStore.getState().completedScrobbles).toHaveLength(0);
  });

  it('rejects when song.id is missing', () => {
    completedScrobbleStore.getState().addCompleted(
      validScrobble({ song: { id: '', title: 'X', artist: 'A' } as any }),
    );
    expect(completedScrobbleStore.getState().completedScrobbles).toHaveLength(0);
  });

  it('rejects when song.title is missing', () => {
    completedScrobbleStore.getState().addCompleted(
      validScrobble({ song: { id: 's1', title: '', artist: 'A' } as any }),
    );
    expect(completedScrobbleStore.getState().completedScrobbles).toHaveLength(0);
  });

  it('rejects duplicates by id', () => {
    const s = validScrobble();
    completedScrobbleStore.getState().addCompleted(s);
    completedScrobbleStore.getState().addCompleted(s);
    expect(completedScrobbleStore.getState().completedScrobbles).toHaveLength(1);
  });

  it('handles missing duration', () => {
    completedScrobbleStore.getState().addCompleted(
      validScrobble({ song: { id: 's1', title: 'X', artist: 'A' } as any }),
    );
    expect(completedScrobbleStore.getState().stats.totalListeningSeconds).toBe(0);
  });

  it('handles missing artist', () => {
    completedScrobbleStore.getState().addCompleted(
      validScrobble({ song: { id: 's1', title: 'X' } as any }),
    );
    expect(completedScrobbleStore.getState().stats.uniqueArtists).toEqual({});
  });

  it('tracks multiple unique artists', () => {
    completedScrobbleStore.getState().addCompleted(validScrobble({ id: '1', song: { id: 's1', title: 'A', artist: 'Artist1', duration: 100 } as any }));
    completedScrobbleStore.getState().addCompleted(validScrobble({ id: '2', song: { id: 's2', title: 'B', artist: 'Artist2', duration: 200 } as any }));
    expect(completedScrobbleStore.getState().stats.uniqueArtists).toEqual({
      Artist1: true,
      Artist2: true,
    });
  });

  it('rejects when song is null', () => {
    completedScrobbleStore.getState().addCompleted(
      { id: 'x', song: null as any, time: Date.now() } as CompletedScrobble,
    );
    expect(completedScrobbleStore.getState().completedScrobbles).toHaveLength(0);
  });

  it('accumulates stats correctly over many adds', () => {
    for (let i = 0; i < 10; i++) {
      completedScrobbleStore.getState().addCompleted(
        validScrobble({
          id: `s-${i}`,
          song: { id: `song-${i}`, title: `T${i}`, artist: `A${i % 3}`, duration: 100 } as any,
        }),
      );
    }
    const { stats } = completedScrobbleStore.getState();
    expect(stats.totalPlays).toBe(10);
    expect(stats.totalListeningSeconds).toBe(1000);
    expect(Object.keys(stats.uniqueArtists)).toHaveLength(3);
  });
});

describe('rebuildStats', () => {
  it('recomputes stats from scrobbles', () => {
    completedScrobbleStore.getState().addCompleted(validScrobble({ id: '1', song: { id: 's1', title: 'A', artist: 'A', duration: 100 } as any }));
    completedScrobbleStore.getState().addCompleted(validScrobble({ id: '2', song: { id: 's2', title: 'B', artist: 'B', duration: 200 } as any }));

    completedScrobbleStore.setState({ stats: EMPTY_STATS });
    completedScrobbleStore.getState().rebuildStats();

    const { stats } = completedScrobbleStore.getState();
    expect(stats.totalPlays).toBe(2);
    expect(stats.totalListeningSeconds).toBe(300);
    expect(stats.uniqueArtists).toEqual({ A: true, B: true });
  });

  it('rebuild is idempotent', () => {
    completedScrobbleStore.getState().addCompleted(validScrobble({ id: '1', song: { id: 's1', title: 'A', artist: 'A', duration: 100 } as any }));
    const statsAfterAdd = { ...completedScrobbleStore.getState().stats };
    completedScrobbleStore.getState().rebuildStats();
    const statsAfterRebuild = completedScrobbleStore.getState().stats;
    expect(statsAfterRebuild).toEqual(statsAfterAdd);
  });

  it('rebuild matches incremental stats exactly', () => {
    for (let i = 0; i < 5; i++) {
      completedScrobbleStore.getState().addCompleted(
        validScrobble({
          id: `s-${i}`,
          song: { id: `song-${i}`, title: `T${i}`, artist: `A${i % 2}`, duration: 50 * (i + 1) } as any,
        }),
      );
    }
    const incrementalStats = { ...completedScrobbleStore.getState().stats };
    completedScrobbleStore.setState({ stats: EMPTY_STATS });
    completedScrobbleStore.getState().rebuildStats();
    expect(completedScrobbleStore.getState().stats).toEqual(incrementalStats);
  });
});

describe('onRehydrateStorage', () => {
  it('deduplicates scrobbles with same id and rebuilds stats', () => {
    const duped: CompletedScrobble[] = [
      validScrobble({ id: 'a', song: { id: 's1', title: 'X', artist: 'A', duration: 100 } as any }),
      validScrobble({ id: 'a', song: { id: 's1', title: 'X', artist: 'A', duration: 100 } as any }),
      validScrobble({ id: 'b', song: { id: 's2', title: 'Y', artist: 'B', duration: 200 } as any }),
    ];
    completedScrobbleStore.setState({
      completedScrobbles: duped,
      stats: { totalPlays: 3, totalListeningSeconds: 400, uniqueArtists: { A: true, B: true } },
    });
    // Trigger rehydrate callback
    completedScrobbleStore.persist.rehydrate();
    const state = completedScrobbleStore.getState();
    expect(state.completedScrobbles).toHaveLength(2);
    expect(state.stats.totalPlays).toBe(2);
    expect(state.stats.totalListeningSeconds).toBe(300);
  });

  it('removes scrobbles with missing id or song fields', () => {
    const dirty = [
      validScrobble({ id: 'ok', song: { id: 's1', title: 'X', artist: 'A', duration: 100 } as any }),
      { id: '', song: { id: 's2', title: 'Y' }, time: Date.now() } as CompletedScrobble,
      { id: 'bad-song', song: { id: '', title: 'Z' }, time: Date.now() } as CompletedScrobble,
      { id: 'no-title', song: { id: 's3', title: '' }, time: Date.now() } as CompletedScrobble,
    ];
    completedScrobbleStore.setState({
      completedScrobbles: dirty,
      stats: { totalPlays: 4, totalListeningSeconds: 0, uniqueArtists: {} },
    });
    completedScrobbleStore.persist.rehydrate();
    expect(completedScrobbleStore.getState().completedScrobbles).toHaveLength(1);
    expect(completedScrobbleStore.getState().stats.totalPlays).toBe(1);
  });

  it('rebuilds stats when totalPlays is 0 but scrobbles exist', () => {
    completedScrobbleStore.setState({
      completedScrobbles: [
        validScrobble({ id: 'a', song: { id: 's1', title: 'X', artist: 'A', duration: 100 } as any }),
      ],
      stats: { ...EMPTY_STATS },
    });
    completedScrobbleStore.persist.rehydrate();
    expect(completedScrobbleStore.getState().stats.totalPlays).toBe(1);
    expect(completedScrobbleStore.getState().stats.totalListeningSeconds).toBe(100);
  });

  it('does not rebuild when stats are already correct', () => {
    const scrobble = validScrobble({ id: 'a', song: { id: 's1', title: 'X', artist: 'A', duration: 100 } as any });
    completedScrobbleStore.setState({
      completedScrobbles: [scrobble],
      stats: { totalPlays: 1, totalListeningSeconds: 100, uniqueArtists: { A: true } },
    });
    completedScrobbleStore.persist.rehydrate();
    const statsAfter = completedScrobbleStore.getState().stats;
    expect(statsAfter.totalPlays).toBe(1);
    expect(statsAfter.totalListeningSeconds).toBe(100);
  });
});
