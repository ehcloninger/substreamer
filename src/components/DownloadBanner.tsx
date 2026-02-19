/**
 * Persistent download progress banner rendered above the MiniPlayer.
 *
 * Visible when there are items queued or downloading. Shows the
 * currently active item's name and track-count progress with a
 * slim progress bar. Tapping navigates to the download queue screen.
 * Animates in/out with a height + opacity transition.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../hooks/useTheme';
import { musicCacheStore } from '../store/musicCacheStore';

const BANNER_HEIGHT = 44;
const ANIM_DURATION = 250;

export function DownloadBanner() {
  const { colors } = useTheme();
  const router = useRouter();

  const activeItem = musicCacheStore((s) =>
    s.downloadQueue.find((q) => q.status === 'downloading'),
  );
  const queueCount = musicCacheStore((s) => s.downloadQueue.length);
  const visible = queueCount > 0;

  const height = useSharedValue(visible ? BANNER_HEIGHT : 0);
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    height.value = withTiming(visible ? BANNER_HEIGHT : 0, { duration: ANIM_DURATION });
    opacity.value = withTiming(visible ? 1 : 0, { duration: ANIM_DURATION });
  }, [visible, height, opacity]);

  const containerStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  const handlePress = useCallback(() => {
    router.push('/download-queue');
  }, [router]);

  const progress = useMemo(() => {
    if (!activeItem || activeItem.totalTracks === 0) return 0;
    return activeItem.completedTracks / activeItem.totalTracks;
  }, [activeItem]);

  const label = activeItem
    ? activeItem.name
    : `${queueCount} ${queueCount === 1 ? 'item' : 'items'} queued`;

  const trackText = activeItem
    ? `${activeItem.completedTracks}/${activeItem.totalTracks}`
    : '';

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.card }, containerStyle]}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.content, pressed && styles.pressed]}
      >
        <Ionicons
          name="arrow-down-circle"
          size={20}
          color={colors.primary}
          style={styles.icon}
        />
        <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={1}>
          {label}
        </Text>
        {trackText ? (
          <Text style={[styles.trackCount, { color: colors.textSecondary }]}>
            {trackText}
          </Text>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </Pressable>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: colors.primary, width: `${Math.round(progress * 100)}%` },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.6,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  trackCount: {
    fontSize: 13,
    marginRight: 6,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  progressFill: {
    height: '100%',
  },
});
