import { type StateStorage } from 'zustand/middleware';

const store = new Map<string, string>();

export const sqliteStorage: StateStorage = {
  getItem(key: string): string | null {
    return store.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    store.set(key, value);
  },
  removeItem(key: string): void {
    store.delete(key);
  },
};
