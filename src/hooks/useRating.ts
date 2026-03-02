import { useCallback, useEffect } from 'react';

import { ratingStore } from '../store/ratingStore';

/**
 * Returns the most accurate rating for an item, checking the optimistic
 * override layer first and falling back to the server-provided value.
 *
 * The selector returns a primitive number so that Zustand's `Object.is`
 * comparison reliably detects changes — matching the pattern used by
 * `useIsStarred` (boolean) and `useDownloadStatus` (string).
 *
 * When a screen's data is refreshed and `serverRating` diverges from the
 * override's `baseRating`, the hook trusts the server and syncs the override
 * so un-refreshed screens still get the correct value.
 */
export function useRating(id: string, serverRating?: number): number {
  const sr = serverRating ?? 0;

  const rating = ratingStore(
    useCallback(
      (s) => {
        const override = s.overrides[id];
        if (override && sr === override.baseRating) {
          return override.rating;
        }
        return sr;
      },
      [id, sr],
    ),
  );

  useEffect(() => {
    const override = ratingStore.getState().overrides[id];
    if (override && sr !== override.baseRating && override.rating !== sr) {
      ratingStore.getState().syncOverride(id, sr);
    }
  }, [id, sr, rating]);

  return rating;
}
