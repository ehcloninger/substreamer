import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ArtistListView, type ArtistLayout } from '../components/ArtistListView';
import { useTheme } from '../hooks/useTheme';
import { artistLibraryStore } from '../store/artistLibraryStore';
import { minDelay } from '../utils/stringHelpers';

export function ArtistListScreen({ layout = 'list' }: { layout?: ArtistLayout }) {
  const { colors } = useTheme();
  const artists = artistLibraryStore((s) => s.artists);
  const loading = artistLibraryStore((s) => s.loading);
  const error = artistLibraryStore((s) => s.error);
  const fetchAllArtists = artistLibraryStore((s) => s.fetchAllArtists);

  // Auto-fetch when mounted if the store has no data
  useEffect(() => {
    if (artists.length === 0 && !loading) {
      fetchAllArtists();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const delay = minDelay();
    await fetchAllArtists();
    await delay;
    setRefreshing(false);
  }, [fetchAllArtists]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ArtistListView
        artists={artists}
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
