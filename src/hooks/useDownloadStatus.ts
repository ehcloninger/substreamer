/**
 * Hook that checks the download status of a song, album, or playlist
 * by looking up `musicCacheStore` and the in-memory track URI map –
 * the single source of truth for offline cache state.
 *
 * Mirrors the `useIsStarred` pattern: subscribes reactively to the
 * store so consumers re-render automatically when status changes.
 */

import { useCallback } from 'react';

import { getLocalTrackUri, getTrackQueueStatus } from '../services/musicCacheService';
import { musicCacheStore, type MusicCacheState } from '../store/musicCacheStore';

export type DownloadStatus = 'none' | 'queued' | 'downloading' | 'complete';

/**
 * Returns the download status for the given item.
 *
 * - **song:** checks the in-memory track URI map for `'complete'`,
 *   then falls back to queue membership for `'queued'`/`'downloading'`.
 * - **album/playlist:** checks `cachedItems` for `'complete'`,
 *   then `downloadQueue` for `'queued'`/`'downloading'`.
 */
export function useDownloadStatus(
  type: 'song' | 'album' | 'playlist',
  id: string,
): DownloadStatus {
  return musicCacheStore(
    useCallback(
      (s: MusicCacheState): DownloadStatus => {
        if (!id) return 'none';

        if (type === 'song') {
          if (getLocalTrackUri(id)) return 'complete';
          const queueStatus = getTrackQueueStatus(id);
          if (queueStatus) return queueStatus;
          return 'none';
        }

        // Album or playlist
        if (id in s.cachedItems) return 'complete';
        const queueItem = s.downloadQueue.find((q) => q.itemId === id);
        if (queueItem) {
          return queueItem.status === 'downloading' ? 'downloading' : 'queued';
        }
        return 'none';
      },
      [type, id],
    ),
  );
}
