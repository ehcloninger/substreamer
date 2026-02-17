import { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CachedImage } from './CachedImage';
import { LongPressable } from './LongPressable';
import { useTheme } from '../hooks/useTheme';
import { type Child } from '../services/subsonicService';
import { moreOptionsStore } from '../store/moreOptionsStore';

const COVER_SIZE = 300;

export const SongCard = memo(function SongCard({
  song,
  width,
  onPress,
}: {
  song: Child;
  width: number;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const imageSize = width - 16; // 8px padding on each side

  const onLongPress = useCallback(() => {
    moreOptionsStore.getState().show({ type: 'song', item: song });
  }, [song]);

  return (
    <LongPressable onPress={onPress} onLongPress={onLongPress}>
      <View style={[styles.card, { backgroundColor: colors.card, width }]}>
        <CachedImage
          coverArtId={song.coverArt}
          size={COVER_SIZE}
          style={[styles.cover, { width: imageSize, height: imageSize }]}
          resizeMode="cover"
        />
        <Text
          style={[styles.songName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Text
          style={[styles.artistName, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {song.artist ?? 'Unknown Artist'}
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
  songName: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  artistName: {
    fontSize: 13,
    marginTop: 2,
  },
});
