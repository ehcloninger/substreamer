import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { sqliteStorage } from './sqliteStorage';

interface BackupState {
  autoBackupEnabled: boolean;
  lastBackupTime: number | null;

  setAutoBackupEnabled: (enabled: boolean) => void;
  setLastBackupTime: (time: number) => void;
}

const PERSIST_KEY = 'substreamer-backup-settings';

export const backupStore = create<BackupState>()(
  persist(
    (set) => ({
      autoBackupEnabled: true,
      lastBackupTime: null,

      setAutoBackupEnabled: (autoBackupEnabled) => set({ autoBackupEnabled }),
      setLastBackupTime: (lastBackupTime) => set({ lastBackupTime }),
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => sqliteStorage),
      partialize: (state) => ({
        autoBackupEnabled: state.autoBackupEnabled,
        lastBackupTime: state.lastBackupTime,
      }),
    }
  )
);
