import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { sqliteStorage } from './sqliteStorage';

import { type Child } from '../services/subsonicService';

export interface CompletedScrobble {
  /** Unique identifier (carried over from the pending entry). */
  id: string;
  /** Full Subsonic songID3 object. */
  song: Child;
  /** Unix timestamp (ms) when playback completed. */
  time: number;
}

export interface CompletedScrobbleState {
  completedScrobbles: CompletedScrobble[];

  addCompleted: (scrobble: CompletedScrobble) => void;
}

const PERSIST_KEY = 'substreamer-completed-scrobbles';

export const completedScrobbleStore = create<CompletedScrobbleState>()(
  persist(
    (set) => ({
      completedScrobbles: [],

      addCompleted: (scrobble) =>
        set((state) => ({
          completedScrobbles: [...state.completedScrobbles, scrobble],
        })),
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => sqliteStorage),
      partialize: (state) => ({
        completedScrobbles: state.completedScrobbles,
      }),
    }
  )
);
