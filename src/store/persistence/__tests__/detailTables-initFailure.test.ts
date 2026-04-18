// Tests the module-init failure path (openDatabaseSync throws). Isolated to
// its own file because module init runs once per jest module-registry load
// and detailTables.test.ts exercises the success path.
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: () => {
    throw new Error('synthetic init failure');
  },
}));

import {
  countAlbumDetails,
  countSongIndex,
  detailTablesHealthy,
  detailTablesInitError,
  hydrateAlbumDetails,
  upsertAlbumDetail,
} from '../detailTables';

describe('detailTables — init failure', () => {
  it('marks detailTablesHealthy false and captures the error', () => {
    expect(detailTablesHealthy).toBe(false);
    expect(detailTablesInitError).toBeInstanceOf(Error);
    expect(detailTablesInitError?.message).toContain('synthetic init failure');
  });

  it('every public function gracefully falls through to null-db defaults', () => {
    expect(() =>
      upsertAlbumDetail('x', { id: 'x', name: 'X', songCount: 0, duration: 0, created: '' } as any, 1),
    ).not.toThrow();
    expect(countAlbumDetails()).toBe(0);
    expect(countSongIndex()).toBe(0);
    expect(hydrateAlbumDetails()).toEqual({});
  });
});
