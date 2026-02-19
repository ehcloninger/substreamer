import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { memo, useCallback, useMemo } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CachedImage } from '../components/CachedImage';
import { useTheme } from '../hooks/useTheme';
import { cancelDownload, retryDownload } from '../services/musicCacheService';
import {
  musicCacheStore,
  type DownloadQueueItem,
} from '../store/musicCacheStore';

/* ------------------------------------------------------------------ */
/*  Queue Row                                                          */
/* ------------------------------------------------------------------ */

const QueueRow = memo(function QueueRow({
  item,
  colors,
  onMoveUp,
  onMoveDown,
  onRemove,
  onRetry,
  isFirst,
  isLast,
}: {
  item: DownloadQueueItem;
  colors: ReturnType<typeof useTheme>['colors'];
  onMoveUp: (queueId: string) => void;
  onMoveDown: (queueId: string) => void;
  onRemove: (queueId: string) => void;
  onRetry: (queueId: string) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const isActive = item.status === 'downloading';
  const isQueued = item.status === 'queued';
  const isError = item.status === 'error';

  const overallProgress = item.totalTracks > 0
    ? item.completedTracks / item.totalTracks
    : 0;

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <CachedImage
        coverArtId={item.coverArtId}
        size={300}
        style={[styles.thumb, { backgroundColor: colors.border }]}
        resizeMode="cover"
      />
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.name}
        </Text>
        {item.artist && (
          <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.artist}
          </Text>
        )}

        {isActive && (
          <View style={styles.progressSection}>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {item.completedTracks} of {item.totalTracks} tracks
            </Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: `${Math.round(overallProgress * 100)}%` },
                ]}
              />
            </View>
          </View>
        )}

        {isQueued && (
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {item.totalTracks} {item.totalTracks === 1 ? 'track' : 'tracks'} · Queued
          </Text>
        )}

        {isError && (
          <Text style={[styles.statusText, { color: colors.red }]}>
            {item.error ?? 'Download failed'}
          </Text>
        )}
      </View>

      <View style={styles.rowActions}>
        {isQueued && (
          <>
            <Pressable
              onPress={() => onMoveUp(item.queueId)}
              disabled={isFirst}
              hitSlop={6}
              style={({ pressed }) => [pressed && styles.pressed, isFirst && styles.disabled]}
            >
              <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => onMoveDown(item.queueId)}
              disabled={isLast}
              hitSlop={6}
              style={({ pressed }) => [pressed && styles.pressed, isLast && styles.disabled]}
            >
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </Pressable>
          </>
        )}
        {isError && (
          <Pressable
            onPress={() => onRetry(item.queueId)}
            hitSlop={6}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Ionicons name="refresh" size={20} color={colors.primary} />
          </Pressable>
        )}
        <Pressable
          onPress={() => onRemove(item.queueId)}
          hitSlop={6}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Ionicons name="close-circle-outline" size={20} color={colors.red} />
        </Pressable>
      </View>
    </View>
  );
});

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */

export function DownloadQueueScreen() {
  const { colors } = useTheme();
  const downloadQueue = musicCacheStore((s) => s.downloadQueue);

  const handleMoveUp = useCallback((queueId: string) => {
    const queue = musicCacheStore.getState().downloadQueue;
    const idx = queue.findIndex((q) => q.queueId === queueId);
    if (idx > 0) {
      musicCacheStore.getState().reorderQueue(idx, idx - 1);
    }
  }, []);

  const handleMoveDown = useCallback((queueId: string) => {
    const queue = musicCacheStore.getState().downloadQueue;
    const idx = queue.findIndex((q) => q.queueId === queueId);
    if (idx >= 0 && idx < queue.length - 1) {
      musicCacheStore.getState().reorderQueue(idx, idx + 1);
    }
  }, []);

  const handleRetry = useCallback((queueId: string) => {
    retryDownload(queueId);
  }, []);

  const handleRemove = useCallback((queueId: string) => {
    const item = musicCacheStore.getState().downloadQueue.find(
      (q) => q.queueId === queueId,
    );
    if (!item) return;

    const isActive = item.status === 'downloading';
    const message = isActive
      ? `Cancel the download of "${item.name}"?`
      : `Remove "${item.name}" from the download queue?`;

    Alert.alert('Remove Download', message, [
      { text: 'Keep', style: 'cancel' },
      {
        text: isActive ? 'Cancel Download' : 'Remove',
        style: 'destructive',
        onPress: () => cancelDownload(queueId),
      },
    ]);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: DownloadQueueItem; index: number }) => (
      <QueueRow
        item={item}
        colors={colors}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        onRemove={handleRemove}
        onRetry={handleRetry}
        isFirst={index === 0}
        isLast={index === downloadQueue.length - 1}
      />
    ),
    [colors, handleMoveUp, handleMoveDown, handleRemove, handleRetry, downloadQueue.length],
  );

  const keyExtractor = useCallback(
    (item: DownloadQueueItem) => item.queueId,
    [],
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons name="cloud-download-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No downloads in queue
        </Text>
      </View>
    ),
    [colors.textSecondary],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlashList
        data={downloadQueue}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={downloadQueue.length === 0 ? styles.emptyListContent : undefined}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyListContent: {
    flex: 1,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 6,
  },
  rowContent: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  progressSection: {
    marginTop: 6,
  },
  progressText: {
    fontSize: 11,
    marginBottom: 4,
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  statusText: {
    fontSize: 12,
    marginTop: 4,
  },
  rowActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    marginLeft: 12,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.25,
  },
});
