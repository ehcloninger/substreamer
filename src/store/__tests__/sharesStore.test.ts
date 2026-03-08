jest.mock('../sqliteStorage', () => require('../__mocks__/sqliteStorage'));
jest.mock('../../services/subsonicService');

import { getShares, deleteShare } from '../../services/subsonicService';
import { sharesStore } from '../sharesStore';

const mockGetShares = getShares as jest.MockedFunction<typeof getShares>;
const mockDeleteShare = deleteShare as jest.MockedFunction<typeof deleteShare>;

beforeEach(() => {
  jest.clearAllMocks();
  sharesStore.setState({ shares: [], loading: false, error: null });
});

const makeShare = (id: string) => ({ id, url: `https://example.com/${id}` } as any);

describe('sharesStore', () => {
  describe('fetchShares', () => {
    it('fetches and stores shares', async () => {
      mockGetShares.mockResolvedValue([makeShare('s1')]);
      await sharesStore.getState().fetchShares();
      expect(sharesStore.getState().shares).toEqual([makeShare('s1')]);
      expect(sharesStore.getState().loading).toBe(false);
    });

    it('sets error when API returns null', async () => {
      mockGetShares.mockResolvedValue(null);
      await sharesStore.getState().fetchShares();
      expect(sharesStore.getState().error).toBe('Failed to load shares.');
      expect(sharesStore.getState().loading).toBe(false);
    });

    it('sets error on exception', async () => {
      mockGetShares.mockRejectedValue(new Error('Network'));
      await sharesStore.getState().fetchShares();
      expect(sharesStore.getState().error).toBe('Network');
    });

    it('sets generic error for non-Error throws', async () => {
      mockGetShares.mockRejectedValue('string');
      await sharesStore.getState().fetchShares();
      expect(sharesStore.getState().error).toBe('Failed to load shares.');
    });
  });

  describe('removeShare', () => {
    it('removes share from list on success', async () => {
      sharesStore.setState({ shares: [makeShare('s1'), makeShare('s2')] });
      mockDeleteShare.mockResolvedValue(true);

      const result = await sharesStore.getState().removeShare('s1');

      expect(result).toBe(true);
      expect(sharesStore.getState().shares).toEqual([makeShare('s2')]);
    });

    it('keeps share in list on failure', async () => {
      sharesStore.setState({ shares: [makeShare('s1')] });
      mockDeleteShare.mockResolvedValue(false);

      const result = await sharesStore.getState().removeShare('s1');

      expect(result).toBe(false);
      expect(sharesStore.getState().shares).toEqual([makeShare('s1')]);
    });
  });

  describe('clear', () => {
    it('resets all state', () => {
      sharesStore.setState({ shares: [makeShare('s1')], loading: true, error: 'err' });
      sharesStore.getState().clear();
      const state = sharesStore.getState();
      expect(state.shares).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
