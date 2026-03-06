import { ratingStore } from '../ratingStore';

jest.mock('../sqliteStorage', () => require('../__mocks__/sqliteStorage'));

beforeEach(() => {
  ratingStore.getState().clearOverrides();
});

describe('setOverride', () => {
  it('stores rating and baseRating', () => {
    ratingStore.getState().setOverride('song-1', 5, 3);
    expect(ratingStore.getState().overrides['song-1']).toEqual({
      rating: 5,
      baseRating: 3,
    });
  });

  it('overwrites existing override', () => {
    ratingStore.getState().setOverride('song-1', 3, 1);
    ratingStore.getState().setOverride('song-1', 5, 1);
    expect(ratingStore.getState().overrides['song-1']!.rating).toBe(5);
  });
});

describe('removeOverride', () => {
  it('removes a specific override', () => {
    ratingStore.getState().setOverride('song-1', 4, 2);
    ratingStore.getState().setOverride('song-2', 3, 1);
    ratingStore.getState().removeOverride('song-1');
    expect(ratingStore.getState().overrides['song-1']).toBeUndefined();
    expect(ratingStore.getState().overrides['song-2']).toBeDefined();
  });

  it('is a no-op for nonexistent override', () => {
    ratingStore.getState().setOverride('song-1', 4, 2);
    ratingStore.getState().removeOverride('nonexistent');
    expect(Object.keys(ratingStore.getState().overrides)).toHaveLength(1);
  });
});

describe('clearOverrides', () => {
  it('removes all overrides', () => {
    ratingStore.getState().setOverride('song-1', 4, 2);
    ratingStore.getState().setOverride('song-2', 3, 1);
    ratingStore.getState().clearOverrides();
    expect(ratingStore.getState().overrides).toEqual({});
  });
});

describe('syncOverride', () => {
  it('updates override to server rating when it diverges', () => {
    ratingStore.getState().setOverride('song-1', 4, 2);
    ratingStore.getState().syncOverride('song-1', 5);
    expect(ratingStore.getState().overrides['song-1']).toEqual({
      rating: 5,
      baseRating: 2,
    });
  });

  it('does nothing when override matches server', () => {
    ratingStore.getState().setOverride('song-1', 4, 2);
    ratingStore.getState().syncOverride('song-1', 4);
    expect(ratingStore.getState().overrides['song-1']!.rating).toBe(4);
    expect(ratingStore.getState().overrides['song-1']!.baseRating).toBe(2);
  });

  it('does nothing when no override exists', () => {
    ratingStore.getState().syncOverride('song-1', 5);
    expect(ratingStore.getState().overrides['song-1']).toBeUndefined();
  });
});
