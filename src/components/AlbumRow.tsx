import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../hooks/useTheme';
import { getCoverArtUrl, type AlbumID3 } from '../services/subsonicService';

const COVER_SIZE = 300;

/** Total row height (padding 12*2 + image 56 = 80). Exported for getItemLayout. */
export const ROW_HEIGHT = 80;

export const AlbumRow = memo(function AlbumRow({ album }: { album: AlbumID3 }) {
  const { colors } = useTheme();
  const router = useRouter();
  const uri = getCoverArtUrl(album.coverArt ?? '', COVER_SIZE) ?? undefined;

  const onPress = useCallback(() => {
    router.push(`/album/${album.id}`);
  }, [album.id, router]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card },
        pressed && styles.pressed,
      ]}
    >
      <Image source={{ uri }} style={styles.cover} resizeMode="cover" />
      <View style={styles.text}>
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
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.85,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  text: {
    flex: 1,
    marginLeft: 12,
  },
  albumName: {
    fontSize: 16,
    fontWeight: '600',
  },
  artistName: {
    fontSize: 14,
    marginTop: 2,
  },
});
