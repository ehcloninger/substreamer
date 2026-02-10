/**
 * Shared TrackRow component used by album-detail and playlist-detail screens.
 *
 * Displays a single track with an optional track number, title, optional artist
 * subtitle, starred indicator, user rating, and duration.
 */

import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ThemeColors } from '../constants/theme';
import type { Child } from '../services/subsonicService';
import { formatTrackDuration } from '../utils/formatters';

export interface TrackRowProps {
  track: Child;
  /** Formatted track number label, e.g. "3. " or "1. ". Omit to hide the number. */
  trackNumber?: string;
  /** Whether to show the track.artist subtitle below the title. */
  showArtist?: boolean;
  colors: ThemeColors;
}

export function TrackRow({ track, trackNumber, showArtist, colors }: TrackRowProps) {
  const duration = track.duration != null ? formatTrackDuration(track.duration) : '—';
  const starred = Boolean(track.starred);
  const rating = track.userRating;

  return (
    <View style={[styles.trackRow, { borderBottomColor: colors.border }]}>
      <View style={styles.trackLeft}>
        {trackNumber != null && (
          <Text style={[styles.trackNum, { color: colors.textSecondary }]}>
            {trackNumber}
          </Text>
        )}
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {track.title}
          </Text>
          {showArtist && track.artist && (
            <Text style={[styles.trackArtist, { color: colors.textSecondary }]} numberOfLines={1}>
              {track.artist}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.trackRight}>
        {starred && (
          <Ionicons name="star" size={14} color={colors.primary} />
        )}
        {rating != null && rating > 0 && (
          <Text style={[styles.trackRating, { color: colors.textSecondary }]}>
            {rating}/5
          </Text>
        )}
        <Text style={[styles.trackDuration, { color: colors.textSecondary }]}>
          {duration}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  trackLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  trackNum: {
    fontSize: 15,
    minWidth: 28,
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
  },
  trackTitle: {
    fontSize: 16,
  },
  trackArtist: {
    fontSize: 13,
    marginTop: 2,
  },
  trackRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 12,
  },
  trackRating: {
    fontSize: 12,
  },
  trackDuration: {
    fontSize: 15,
  },
});
