import { Directory, File, Paths } from 'expo-file-system';

import { listDirectoryAsync } from 'expo-async-fs';
import { compressToFile, decompressFromFile } from 'expo-gzip';

import { backupStore } from '../store/backupStore';
import { completedScrobbleStore } from '../store/completedScrobbleStore';
import { mbidOverrideStore } from '../store/mbidOverrideStore';

import { type CompletedScrobble } from '../store/completedScrobbleStore';
import { type MbidOverride } from '../store/mbidOverrideStore';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BackupDatasetMeta {
  itemCount: number;
  sizeBytes: number;
}

interface BackupMeta {
  version: 2;
  createdAt: string;
  scrobbles: BackupDatasetMeta | null;
  mbidOverrides: BackupDatasetMeta | null;
}

export interface BackupEntry {
  createdAt: string;
  scrobbleCount: number;
  scrobbleSizeBytes: number;
  mbidOverrideCount: number;
  mbidOverrideSizeBytes: number;
  stem: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BACKUP_DIR_NAME = 'backups';
const MAX_BACKUPS = 5;
const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/*  Directory setup                                                    */
/* ------------------------------------------------------------------ */

const backupDir = new Directory(Paths.document, BACKUP_DIR_NAME);

export function initBackupDir() {
  if (!backupDir.exists) {
    backupDir.create();
  }
}

initBackupDir();

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeTimestamp(): string {
  return new Date().toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, '');
}

function metaFileName(stem: string): string {
  return `${stem}.meta.json`;
}

function scrobblesFileName(stem: string): string {
  return `${stem}.scrobbles.gz`;
}

function mbidFileName(stem: string): string {
  return `${stem}.mbid.gz`;
}

/* ------------------------------------------------------------------ */
/*  Create backup                                                      */
/* ------------------------------------------------------------------ */

export async function createBackup(): Promise<void> {
  initBackupDir();
  const timestamp = makeTimestamp();
  const stem = `backup-${timestamp}`;

  let scrobblesMeta: BackupDatasetMeta | null = null;
  let mbidMeta: BackupDatasetMeta | null = null;

  const scrobbles = completedScrobbleStore.getState().completedScrobbles;
  if (scrobbles.length > 0) {
    const tmpFile = new File(backupDir, scrobblesFileName(stem) + '.tmp');
    const destFile = new File(backupDir, scrobblesFileName(stem));
    try {
      const { bytes } = await compressToFile(JSON.stringify(scrobbles), tmpFile.uri);
      if (destFile.exists) {
        try { destFile.delete(); } catch { /* best-effort */ }
      }
      tmpFile.move(destFile);
      scrobblesMeta = { itemCount: scrobbles.length, sizeBytes: bytes };
    } catch (e) {
      if (tmpFile.exists) {
        try { tmpFile.delete(); } catch { /* best-effort */ }
      }
      throw e;
    }
  }

  const overrides = mbidOverrideStore.getState().overrides;
  const overrideCount = Object.keys(overrides).length;
  if (overrideCount > 0) {
    const tmpFile = new File(backupDir, mbidFileName(stem) + '.tmp');
    const destFile = new File(backupDir, mbidFileName(stem));
    try {
      const { bytes } = await compressToFile(JSON.stringify(overrides), tmpFile.uri);
      if (destFile.exists) {
        try { destFile.delete(); } catch { /* best-effort */ }
      }
      tmpFile.move(destFile);
      mbidMeta = { itemCount: overrideCount, sizeBytes: bytes };
    } catch (e) {
      if (tmpFile.exists) {
        try { tmpFile.delete(); } catch { /* best-effort */ }
      }
      throw e;
    }
  }

  if (!scrobblesMeta && !mbidMeta) return;

  const meta: BackupMeta = {
    version: 2,
    createdAt: new Date().toISOString(),
    scrobbles: scrobblesMeta,
    mbidOverrides: mbidMeta,
  };

  const metaFile = new File(backupDir, metaFileName(stem));
  metaFile.write(JSON.stringify(meta));

  backupStore.getState().setLastBackupTime(Date.now());
}

/* ------------------------------------------------------------------ */
/*  List backups                                                       */
/* ------------------------------------------------------------------ */

export async function listBackups(): Promise<BackupEntry[]> {
  initBackupDir();

  let fileNames: string[];
  try {
    fileNames = await listDirectoryAsync(backupDir.uri);
  } catch {
    return [];
  }

  const entries: BackupEntry[] = [];

  for (const name of fileNames) {
    if (!name.endsWith('.meta.json')) continue;

    const metaFile = new File(backupDir, name);
    try {
      const raw = await metaFile.text();
      const meta: BackupMeta = JSON.parse(raw);

      if (meta.version !== 2) continue;

      const stem = name.replace(/\.meta\.json$/, '');

      const hasScrobbles = meta.scrobbles && new File(backupDir, scrobblesFileName(stem)).exists;
      const hasMbid = meta.mbidOverrides && new File(backupDir, mbidFileName(stem)).exists;
      if (!hasScrobbles && !hasMbid) continue;

      entries.push({
        createdAt: meta.createdAt,
        scrobbleCount: meta.scrobbles?.itemCount ?? 0,
        scrobbleSizeBytes: meta.scrobbles?.sizeBytes ?? 0,
        mbidOverrideCount: meta.mbidOverrides?.itemCount ?? 0,
        mbidOverrideSizeBytes: meta.mbidOverrides?.sizeBytes ?? 0,
        stem,
      });
    } catch {
      continue;
    }
  }

  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return entries;
}

/* ------------------------------------------------------------------ */
/*  Restore backup                                                     */
/* ------------------------------------------------------------------ */

export async function restoreBackup(
  entry: BackupEntry,
): Promise<{ scrobbleCount: number; mbidOverrideCount: number }> {
  let scrobbleCount = 0;
  let mbidOverrideCount = 0;

  if (entry.scrobbleCount > 0) {
    const dataFile = new File(backupDir, scrobblesFileName(entry.stem));
    if (!dataFile.exists) {
      throw new Error('Scrobble backup data file not found');
    }
    const json = await decompressFromFile(dataFile.uri);
    const scrobbles: CompletedScrobble[] = JSON.parse(json);
    completedScrobbleStore.setState({ completedScrobbles: scrobbles });
    completedScrobbleStore.getState().rebuildStats();
    scrobbleCount = scrobbles.length;
  }

  if (entry.mbidOverrideCount > 0) {
    const dataFile = new File(backupDir, mbidFileName(entry.stem));
    if (!dataFile.exists) {
      throw new Error('MBID override backup data file not found');
    }
    const json = await decompressFromFile(dataFile.uri);
    const overrides: Record<string, MbidOverride> = JSON.parse(json);
    mbidOverrideStore.setState({ overrides });
    mbidOverrideCount = Object.keys(overrides).length;
  }

  return { scrobbleCount, mbidOverrideCount };
}

/* ------------------------------------------------------------------ */
/*  Prune old backups                                                  */
/* ------------------------------------------------------------------ */

export async function pruneBackups(keep = MAX_BACKUPS): Promise<void> {
  const all = await listBackups();
  if (all.length <= keep) return;

  const toDelete = all.slice(keep);
  for (const entry of toDelete) {
    const filesToRemove = [
      metaFileName(entry.stem),
      scrobblesFileName(entry.stem),
      mbidFileName(entry.stem),
    ];
    for (const name of filesToRemove) {
      try {
        const f = new File(backupDir, name);
        if (f.exists) f.delete();
      } catch { /* best-effort */ }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Startup cleanup                                                    */
/* ------------------------------------------------------------------ */

/**
 * Scan the backup directory for incomplete files left behind by an
 * interrupted backup (e.g. app killed mid-write, battery death).
 *
 * Removes:
 *  - .tmp files from interrupted compressions
 *  - orphaned .gz data files that have no matching .meta.json
 */
async function cleanUpOrphanedFiles(): Promise<void> {
  initBackupDir();

  let fileNames: string[];
  try {
    fileNames = await listDirectoryAsync(backupDir.uri);
  } catch {
    return;
  }

  const metaStems = new Set<string>();

  for (const name of fileNames) {
    if (name.endsWith('.tmp')) {
      try { new File(backupDir, name).delete(); } catch { /* best-effort */ }
    } else if (name.endsWith('.meta.json')) {
      metaStems.add(name.replace(/\.meta\.json$/, ''));
    }
  }

  for (const name of fileNames) {
    if (name.endsWith('.tmp')) continue;
    if (name.endsWith('.meta.json')) continue;

    const stem = name.replace(/\.(scrobbles|mbid)\.gz$/, '');
    if (stem !== name && !metaStems.has(stem)) {
      try { new File(backupDir, name).delete(); } catch { /* best-effort */ }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Auto-backup                                                        */
/* ------------------------------------------------------------------ */

export async function runAutoBackupIfNeeded(): Promise<void> {
  await cleanUpOrphanedFiles();

  const { autoBackupEnabled, lastBackupTime } = backupStore.getState();

  if (!autoBackupEnabled) return;

  const now = Date.now();
  if (lastBackupTime && now - lastBackupTime < AUTO_BACKUP_INTERVAL_MS) return;

  try {
    await createBackup();
    await pruneBackups();
  } catch {
    /* Auto-backup is best-effort; don't crash the app on failure */
  }
}
