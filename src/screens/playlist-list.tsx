import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PlaylistListView, type PlaylistLayout } from '../components/PlaylistListView';
import { useTheme } from '../hooks/useTheme';
import { playlistLibraryStore } from '../store/playlistLibraryStore';
import { minDelay } from '../utils/stringHelpers';

export function PlaylistListScreen({ layout = 'list' }: { layout?: PlaylistLayout }) {
  const { colors } = useTheme();
  const playlists = playlistLibraryStore((s) => s.playlists);
  const loading = playlistLibraryStore((s) => s.loading);
  const error = playlistLibraryStore((s) => s.error);
  const fetchAllPlaylists = playlistLibraryStore((s) => s.fetchAllPlaylists);

  // Auto-fetch when mounted if the store has no data
  useEffect(() => {
    if (playlists.length === 0 && !loading) {
      fetchAllPlaylists();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const delay = minDelay();
    await fetchAllPlaylists();
    await delay;
    setRefreshing(false);
  }, [fetchAllPlaylists]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PlaylistListView
        playlists={playlists}
        layout={layout}
        loading={loading}
        error={error}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        showAlphabetScroller
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
