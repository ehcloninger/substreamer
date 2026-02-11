import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Number of size tiers cached per image (50, 150, 300, 600). */
const IMAGE_SIZES_COUNT = 4;

export interface ImageCacheState {
  /** Total bytes used by cached images. */
  totalBytes: number;
  /** Total number of individual cached files (each image has 4 size variants). */
  fileCount: number;

  /** Record a newly cached file. */
  addFile: (bytes: number) => void;
  /** Record removal of cached files. */
  removeFiles: (count: number, bytes: number) => void;
  /** Reset stats to zero (called after cache clear). */
  reset: () => void;
  /** Reconcile stats from the actual filesystem. */
  recalculate: (stats: { totalBytes: number; imageCount: number }) => void;
}

/** Derive the unique image count from the file count. */
export function getImageCount(fileCount: number): number {
  return Math.floor(fileCount / IMAGE_SIZES_COUNT);
}

const PERSIST_KEY = 'substreamer-image-cache-stats';

export const imageCacheStore = create<ImageCacheState>()(
  persist(
    (set) => ({
      totalBytes: 0,
      fileCount: 0,

      addFile: (bytes: number) =>
        set((state) => ({
          totalBytes: state.totalBytes + bytes,
          fileCount: state.fileCount + 1,
        })),

      removeFiles: (count: number, bytes: number) =>
        set((state) => ({
          totalBytes: Math.max(0, state.totalBytes - bytes),
          fileCount: Math.max(0, state.fileCount - count),
        })),

      reset: () => set({ totalBytes: 0, fileCount: 0 }),

      recalculate: (stats: { totalBytes: number; imageCount: number }) => {
        set({
          totalBytes: stats.totalBytes,
          fileCount: stats.imageCount * IMAGE_SIZES_COUNT,
        });
      },
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        totalBytes: state.totalBytes,
        fileCount: state.fileCount,
      }),
    }
  )
);
