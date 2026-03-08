jest.mock('../sqliteStorage', () => require('../__mocks__/sqliteStorage'));

import { mbidOverrideStore } from '../mbidOverrideStore';

beforeEach(() => {
  mbidOverrideStore.setState({ overrides: {} });
});

describe('mbidOverrideStore', () => {
  it('setOverride adds an override entry', () => {
    mbidOverrideStore.getState().setOverride('ar1', 'Radiohead', 'mbid-123');
    const entry = mbidOverrideStore.getState().overrides['ar1'];
    expect(entry).toEqual({
      artistId: 'ar1',
      artistName: 'Radiohead',
      mbid: 'mbid-123',
    });
  });

  it('setOverride overwrites existing entry', () => {
    mbidOverrideStore.getState().setOverride('ar1', 'Radiohead', 'old-mbid');
    mbidOverrideStore.getState().setOverride('ar1', 'Radiohead', 'new-mbid');
    expect(mbidOverrideStore.getState().overrides['ar1'].mbid).toBe('new-mbid');
  });

  it('removeOverride removes the entry', () => {
    mbidOverrideStore.getState().setOverride('ar1', 'Radiohead', 'mbid-123');
    mbidOverrideStore.getState().setOverride('ar2', 'Muse', 'mbid-456');
    mbidOverrideStore.getState().removeOverride('ar1');
    expect(mbidOverrideStore.getState().overrides['ar1']).toBeUndefined();
    expect(mbidOverrideStore.getState().overrides['ar2']).toBeDefined();
  });

  it('removeOverride is safe when key does not exist', () => {
    mbidOverrideStore.getState().removeOverride('nonexistent');
    expect(mbidOverrideStore.getState().overrides).toEqual({});
  });

  it('clearOverrides removes all entries', () => {
    mbidOverrideStore.getState().setOverride('ar1', 'Radiohead', 'mbid-123');
    mbidOverrideStore.getState().setOverride('ar2', 'Muse', 'mbid-456');
    mbidOverrideStore.getState().clearOverrides();
    expect(mbidOverrideStore.getState().overrides).toEqual({});
  });
});
