import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';

import { syncStatusStore } from '../store/syncStatusStore';

const TAG = 'library-sync';

/**
 * Keep the device awake while a full album-detail walk is running. Mirrors
 * `useDownloadKeepAwake` — the walk can take many minutes on large libraries
 * and letting the screen sleep would stall progress on some devices.
 */
export function useLibrarySyncKeepAwake() {
  const isWalking = syncStatusStore((s) => s.detailSyncPhase === 'syncing');

  useEffect(() => {
    if (isWalking) {
      activateKeepAwakeAsync(TAG).catch(() => { /* activity may be unavailable */ });
    } else {
      deactivateKeepAwake(TAG).catch(() => { /* activity may be unavailable */ });
    }
    return () => {
      deactivateKeepAwake(TAG).catch(() => { /* activity may be unavailable during backgrounding */ });
    };
  }, [isWalking]);
}
