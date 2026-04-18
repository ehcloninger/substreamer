import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PlaylistListView, type PlaylistLayout } from '../components/PlaylistListView';
import { onPullToRefresh } from '../services/dataSyncService';
import { musicCacheStore } from '../store/musicCacheStore';
import { offlineModeStore } from '../store/offlineModeStore';
import { playlistLibraryStore } from '../store/playlistLibraryStore';

export function PlaylistListScreen({
  layout = 'list',
  downloadedOnly = false,
  contentInsetTop = 0,
}: {
  layout?: PlaylistLayout;
  downloadedOnly?: boolean;
  contentInsetTop?: number;
}) {
  const { t } = useTranslation();
  const offlineMode = offlineModeStore((s) => s.offlineMode);
  const playlists = playlistLibraryStore((s) => s.playlists);
  const loading = playlistLibraryStore((s) => s.loading);
  const error = playlistLibraryStore((s) => s.error);
  const fetchAllPlaylists = playlistLibraryStore((s) => s.fetchAllPlaylists);

  const cachedItems = musicCacheStore((s) => s.cachedItems);

  useEffect(() => {
    if (playlists.length === 0 && !loading) {
      fetchAllPlaylists();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredPlaylists = useMemo(() => {
    if (!downloadedOnly) return playlists;
    return playlists.filter((p) => p.id in cachedItems);
  }, [playlists, downloadedOnly, cachedItems]);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onPullToRefresh('playlists');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const emptyProps = offlineMode
    ? {
        emptyIcon: 'cloud-offline-outline' as const,
        emptyMessage: t('noDownloadedPlaylists'),
        emptySubtitle: t('noDownloadedPlaylistsSubtitle'),
      }
    : {};

  return (
    <View style={styles.container}>
      <PlaylistListView
        playlists={filteredPlaylists}
        layout={layout}
        loading={loading}
        error={error}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        showAlphabetScroller
        scrollToTopTrigger={`${downloadedOnly}`}
        contentInsetTop={contentInsetTop}
        {...emptyProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
