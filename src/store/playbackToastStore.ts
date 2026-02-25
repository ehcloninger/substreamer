import { create } from 'zustand';

export type PlaybackToastStatus = 'idle' | 'loading' | 'success' | 'error';

const MIN_LOADING_MS = 1200;

export interface PlaybackToastState {
  status: PlaybackToastStatus;
  errorMessage: string | null;
  /** Timestamp when `show()` was called — used to enforce minimum loading duration. */
  _showedAt: number;

  show: () => void;
  succeed: () => void;
  fail: (message: string) => void;
  hide: () => void;
}

export const playbackToastStore = create<PlaybackToastState>()((set, get) => ({
  status: 'idle',
  errorMessage: null,
  _showedAt: 0,

  show: () => set({ status: 'loading', errorMessage: null, _showedAt: Date.now() }),

  succeed: () => {
    const elapsed = Date.now() - get()._showedAt;
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
    setTimeout(() => set({ status: 'success', errorMessage: null }), remaining);
  },

  fail: (message) => {
    const elapsed = Date.now() - get()._showedAt;
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
    setTimeout(() => set({ status: 'error', errorMessage: message }), remaining);
  },

  hide: () => set({ status: 'idle', errorMessage: null }),
}));
