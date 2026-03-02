import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { sqliteStorage } from './sqliteStorage';

interface RatingOverride {
  rating: number;
  baseRating: number;
}

interface RatingState {
  overrides: Record<string, RatingOverride>;

  setOverride: (id: string, rating: number, baseRating: number) => void;
  removeOverride: (id: string) => void;
  syncOverride: (id: string, serverRating: number) => void;
  clearOverrides: () => void;
}

const PERSIST_KEY = 'substreamer-ratings';

export const ratingStore = create<RatingState>()(
  persist(
    (set) => ({
      overrides: {},

      setOverride: (id, rating, baseRating) =>
        set((s) => ({
          overrides: { ...s.overrides, [id]: { rating, baseRating } },
        })),

      removeOverride: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.overrides;
          return { overrides: rest };
        }),

      syncOverride: (id, serverRating) =>
        set((s) => {
          const existing = s.overrides[id];
          if (!existing || existing.rating === serverRating) return s;
          return {
            overrides: {
              ...s.overrides,
              [id]: { rating: serverRating, baseRating: existing.baseRating },
            },
          };
        }),

      clearOverrides: () => set({ overrides: {} }),
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => sqliteStorage),
      partialize: (state) => ({ overrides: state.overrides }),
    }
  )
);
