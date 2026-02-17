import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CachedImage } from './CachedImage';
import { LongPressable } from './LongPressable';
import { useTheme } from '../hooks/useTheme';
import { type AlbumID3 } from '../services/subsonicService';
import { moreOptionsStore } from '../store/moreOptionsStore';

const COVER_SIZE = 300;

export const AlbumCard = memo(function AlbumCard({
  album,
  width,
}: {
  album: AlbumID3;
  width: number;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const imageSize = width - 16; // 8px padding on each side

  const onPress = useCallback(() => {
    router.push(`/album/${album.id}`);
  }, [album.id, router]);

  const onLongPress = useCallback(() => {
    moreOptionsStore.getState().show({ type: 'album', item: album });
  }, [album]);

  return (
    <LongPressable onPress={onPress} onLongPress={onLongPress}>
      <View style={[styles.card, { backgroundColor: colors.card, width }]}>
        <CachedImage
          coverArtId={album.coverArt}
          size={COVER_SIZE}
          style={[styles.cover, { width: imageSize, height: imageSize }]}
          resizeMode="cover"
        />
        <Text
          style={[styles.albumName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {album.name}
        </Text>
        <Text
          style={[styles.artistName, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {album.artist ?? 'Unknown Artist'}
        </Text>
      </View>
    </LongPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 8,
  },
  cover: {
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  albumName: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  artistName: {
    fontSize: 13,
    marginTop: 2,
  },
});
