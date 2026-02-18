import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  deleteShare as apiDeleteShare,
  getShares,
  type Share,
} from '../services/subsonicService';
import { sqliteStorage } from './sqliteStorage';

interface SharesState {
  shares: Share[];
  loading: boolean;
  error: string | null;

  fetchShares: () => Promise<void>;
  removeShare: (id: string) => Promise<boolean>;
  clear: () => void;
}

export const sharesStore = create<SharesState>()(
  persist(
    (set, get) => ({
      shares: [],
      loading: false,
      error: null,

      fetchShares: async () => {
        set({ loading: true, error: null });
        try {
          const result = await getShares();
          if (result) {
            set({ shares: result, loading: false });
          } else {
            set({ loading: false, error: 'Failed to load shares.' });
          }
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : 'Failed to load shares.',
          });
        }
      },

      removeShare: async (id: string) => {
        const success = await apiDeleteShare(id);
        if (success) {
          set({ shares: get().shares.filter((s) => s.id !== id) });
        }
        return success;
      },

      clear: () => set({ shares: [], loading: false, error: null }),
    }),
    {
      name: 'substreamer-shares',
      storage: createJSONStorage(() => sqliteStorage),
      partialize: (state) => ({ shares: state.shares }),
    },
  ),
);
