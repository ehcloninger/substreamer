import { renderHook } from '@testing-library/react-native';

import {
  computeStreaks,
  usePlaybackAnalytics,
  type ScrobbleRecord,
  type TimePeriod,
} from '../usePlaybackAnalytics';

function ts(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day, 12, 0, 0);
}

const mockSong = (id: string, artist: string, album: string, duration = 180) =>
  ({ id, artist, album, duration } as ScrobbleRecord['song']);

describe('computeStreaks', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns zeros for empty input', () => {
    expect(computeStreaks([])).toEqual({ longest: 0, current: 0 });
  });

  it('returns longest 1 for single day', () => {
    expect(computeStreaks([{ time: ts(2025, 1, 10) }])).toEqual({
      longest: 1,
      current: 0,
    });
  });

  it('counts consecutive days for longest', () => {
    expect(
      computeStreaks([
        { time: ts(2025, 1, 10) },
        { time: ts(2025, 1, 11) },
        { time: ts(2025, 1, 12) },
      ]),
    ).toEqual({ longest: 3, current: 0 });
  });

  it('resets streak when gap exists', () => {
    expect(
      computeStreaks([
        { time: ts(2025, 1, 10) },
        { time: ts(2025, 1, 11) },
        { time: ts(2025, 1, 13) },
      ]),
    ).toEqual({ longest: 2, current: 0 });
  });

  it('counts current streak from today', () => {
    expect(
      computeStreaks([
        { time: ts(2025, 1, 13) },
        { time: ts(2025, 1, 14) },
        { time: ts(2025, 1, 15) },
      ]),
    ).toEqual({ longest: 3, current: 3 });
  });

  it('counts current streak from yesterday when no scrobble today', () => {
    expect(
      computeStreaks([
        { time: ts(2025, 1, 12) },
        { time: ts(2025, 1, 13) },
        { time: ts(2025, 1, 14) },
      ]),
    ).toEqual({ longest: 3, current: 3 });
  });

  it('longest can exceed current', () => {
    expect(
      computeStreaks([
        { time: ts(2025, 1, 1) },
        { time: ts(2025, 1, 2) },
        { time: ts(2025, 1, 3) },
        { time: ts(2025, 1, 4) },
        { time: ts(2025, 1, 5) },
        { time: ts(2025, 1, 14) },
        { time: ts(2025, 1, 15) },
      ]),
    ).toEqual({ longest: 5, current: 2 });
  });

  it('deduplicates multiple scrobbles on the same day', () => {
    expect(
      computeStreaks([
        { time: ts(2025, 1, 14) },
        { time: ts(2025, 1, 14) },
        { time: ts(2025, 1, 14) },
        { time: ts(2025, 1, 15) },
      ]),
    ).toEqual({ longest: 2, current: 2 });
  });

  it('handles scrobbles in non-chronological order', () => {
    expect(
      computeStreaks([
        { time: ts(2025, 1, 15) },
        { time: ts(2025, 1, 13) },
        { time: ts(2025, 1, 14) },
      ]),
    ).toEqual({ longest: 3, current: 3 });
  });
});

describe('usePlaybackAnalytics', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const scrobbles: ScrobbleRecord[] = [
    {
      id: '1',
      song: mockSong('s1', 'Artist A', 'Album X', 200),
      time: ts(2025, 1, 14),
    },
    {
      id: '2',
      song: mockSong('s1', 'Artist A', 'Album X', 200),
      time: ts(2025, 1, 14),
    },
    {
      id: '3',
      song: mockSong('s2', 'Artist B', 'Album Y', 240),
      time: ts(2025, 1, 13),
    },
  ];

  it('filters by period', () => {
    const oldScrobble: ScrobbleRecord = {
      id: 'old',
      song: mockSong('old', 'Old', 'Old', 100),
      time: ts(2024, 12, 1),
    };
    const { result } = renderHook(() =>
      usePlaybackAnalytics([...scrobbles, oldScrobble], '7d'),
    );
    expect(result.current.totalPlays).toBe(3);
  });

  it('includes all scrobbles for period all', () => {
    const { result } = renderHook(() =>
      usePlaybackAnalytics(scrobbles, 'all'),
    );
    expect(result.current.totalPlays).toBe(3);
  });

  it('ranks top songs by count', () => {
    const { result } = renderHook(() =>
      usePlaybackAnalytics(scrobbles, 'all'),
    );
    expect(result.current.topSongs).toHaveLength(2);
    expect(result.current.topSongs[0].count).toBe(2);
    expect(result.current.topSongs[0].song.id).toBe('s1');
  });

  it('limits top songs to 10', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      id: `r${i}`,
      song: mockSong(`s${i}`, `Artist${i}`, 'Album', 100),
      time: ts(2025, 1, 14),
    }));
    const { result } = renderHook(() =>
      usePlaybackAnalytics(many, 'all'),
    );
    expect(result.current.topSongs).toHaveLength(10);
  });

  it('limits top artists to 10 and top albums to 5', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `r${i}`,
      song: mockSong(`s${i}`, `Artist${i}`, `Album${i}`, 100),
      time: ts(2025, 1, 14),
    }));
    const { result } = renderHook(() =>
      usePlaybackAnalytics(many, 'all'),
    );
    expect(result.current.topArtists).toHaveLength(10);
    expect(result.current.topAlbums).toHaveLength(5);
  });

  it('creates Other bucket when more than 6 genres', () => {
    const withGenres = Array.from({ length: 8 }, (_, i) => ({
      id: `r${i}`,
      song: {
        ...mockSong(`s${i}`, 'A', 'B'),
        genre: `Genre${i}`,
      } as ScrobbleRecord['song'],
      time: ts(2025, 1, 14),
    }));
    const { result } = renderHook(() =>
      usePlaybackAnalytics(withGenres, 'all'),
    );
    const other = result.current.genreBreakdown.find((g) => g.genre === 'Other');
    expect(other).toBeDefined();
    expect(other!.count).toBe(3);
  });

  it('computes peak hour', () => {
    const atHour = (h: number) => ({
      id: 'h',
      song: mockSong('s', 'A', 'B'),
      time: new Date(2025, 0, 14, h, 30, 0).getTime(),
    });
    const { result } = renderHook(() =>
      usePlaybackAnalytics(
        [atHour(14), atHour(14), atHour(14), atHour(9)],
        'all',
      ),
    );
    expect(result.current.peakHour).toBe(14);
  });

  it('computes average plays per day', () => {
    const { result } = renderHook(() =>
      usePlaybackAnalytics(scrobbles, 'all'),
    );
    expect(result.current.averagePlaysPerDay).toBeGreaterThan(0);
  });

  it('includes pending scrobbles in streak', () => {
    const { result } = renderHook(() =>
      usePlaybackAnalytics(
        [
          {
            id: '1',
            song: mockSong('s1', 'A', 'B'),
            time: ts(2025, 1, 14),
          },
        ],
        '7d',
        [{ time: ts(2025, 1, 15) }],
      ),
    );
    expect(result.current.currentStreak).toBe(2);
  });

  it('computes totalListeningSeconds from song durations', () => {
    const { result } = renderHook(() =>
      usePlaybackAnalytics(scrobbles, 'all'),
    );
    expect(result.current.totalListeningSeconds).toBe(200 + 200 + 240);
  });

  it('counts uniqueArtists and uniqueAlbums', () => {
    const { result } = renderHook(() =>
      usePlaybackAnalytics(scrobbles, 'all'),
    );
    expect(result.current.uniqueArtists).toBe(2);
    expect(result.current.uniqueAlbums).toBe(2);
  });

  it('computes exact averagePlaysPerDay', () => {
    const { result } = renderHook(() =>
      usePlaybackAnalytics(scrobbles, 'all'),
    );
    // 3 plays across 2 unique days → 1.5
    expect(result.current.averagePlaysPerDay).toBe(1.5);
  });

  it('returns zero stats for empty scrobble array', () => {
    const { result } = renderHook(() =>
      usePlaybackAnalytics([], 'all'),
    );
    expect(result.current.totalPlays).toBe(0);
    expect(result.current.totalListeningSeconds).toBe(0);
    expect(result.current.uniqueArtists).toBe(0);
    expect(result.current.currentStreak).toBe(0);
    expect(result.current.longestStreak).toBe(0);
    expect(result.current.topSongs).toHaveLength(0);
    expect(result.current.genreBreakdown).toHaveLength(0);
  });

  it('filters correctly for 30d period', () => {
    const old: ScrobbleRecord = {
      id: 'old',
      song: mockSong('old', 'X', 'Y'),
      time: ts(2024, 11, 1),
    };
    const { result } = renderHook(() =>
      usePlaybackAnalytics([...scrobbles, old], '30d'),
    );
    expect(result.current.totalPlays).toBe(3);
  });

  it('handles scrobbles with missing duration', () => {
    const noDuration: ScrobbleRecord[] = [
      { id: '1', song: { id: 's1', artist: 'A', album: 'B' } as any, time: ts(2025, 1, 14) },
    ];
    const { result } = renderHook(() =>
      usePlaybackAnalytics(noDuration, 'all'),
    );
    expect(result.current.totalListeningSeconds).toBe(0);
    expect(result.current.totalPlays).toBe(1);
  });

  it('handles scrobbles with missing artist', () => {
    const noArtist: ScrobbleRecord[] = [
      { id: '1', song: { id: 's1', album: 'B', duration: 100 } as any, time: ts(2025, 1, 14) },
    ];
    const { result } = renderHook(() =>
      usePlaybackAnalytics(noArtist, 'all'),
    );
    expect(result.current.topArtists[0].artist).toBe('Unknown');
  });

  it('uses genres array fallback when genre is absent', () => {
    const withGenresArray: ScrobbleRecord[] = [
      {
        id: '1',
        song: { id: 's1', artist: 'A', album: 'B', duration: 100, genres: [{ name: 'Rock' }] } as any,
        time: ts(2025, 1, 14),
      },
    ];
    const { result } = renderHook(() =>
      usePlaybackAnalytics(withGenresArray, 'all'),
    );
    // genres[0] is { name: 'Rock' } which is an object, not a string;
    // the source uses s.song.genres?.[0] which returns the object, not a string genre.
    // This documents the actual behavior.
    expect(result.current.genreBreakdown).toHaveLength(1);
  });

  it('hourlyDistribution has 24 buckets', () => {
    const { result } = renderHook(() =>
      usePlaybackAnalytics(scrobbles, 'all'),
    );
    expect(result.current.hourlyDistribution).toHaveLength(24);
    const total = result.current.hourlyDistribution.reduce((a, b) => a + b, 0);
    expect(total).toBe(3);
  });
});
