import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BottomSheet } from './BottomSheet';
import { CachedImage } from './CachedImage';
import { useTheme } from '../hooks/useTheme';
import type { Child } from '../services/subsonicService';
import { formatTrackDuration } from '../utils/formatters';
import { getGenreNames } from '../utils/genreHelpers';

export interface TrackDetailsModalProps {
  track: Child;
  visible: boolean;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTrackNumber(track: Child): string | null {
  if (track.track == null) return null;
  if (track.discNumber != null && track.discNumber > 0) {
    return `Disc ${track.discNumber}, Track ${track.track}`;
  }
  return String(track.track);
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function TrackDetailsModal({ track, visible, onClose }: TrackDetailsModalProps) {
  const { colors } = useTheme();

  const rows = useMemo(() => {
    const result: { label: string; value: string }[] = [];

    const artist = track.artist ?? track.displayArtist;
    if (artist) result.push({ label: 'Artist', value: artist });

    if (track.album) result.push({ label: 'Album', value: track.album });

    if (track.year != null && track.year > 0) {
      result.push({ label: 'Year', value: String(track.year) });
    }

    const genreNames = getGenreNames(track);
    const genre = genreNames.length > 0 ? genreNames.join(', ') : null;
    if (genre) result.push({ label: 'Genre', value: genre });

    const trackNum = formatTrackNumber(track);
    if (trackNum) result.push({ label: 'Track', value: trackNum });

    if (track.duration != null && track.duration > 0) {
      result.push({ label: 'Duration', value: formatTrackDuration(track.duration) });
    }

    if (track.playCount != null) {
      result.push({ label: 'Play Count', value: String(track.playCount) });
    }

    if (track.suffix) {
      result.push({ label: 'Format', value: track.suffix.toUpperCase() });
    }

    if (track.bitRate != null) {
      result.push({ label: 'Bitrate', value: `${track.bitRate} kbps` });
    }

    if (track.size != null) {
      result.push({ label: 'Size', value: formatSize(track.size) });
    }

    if (track.bpm != null && track.bpm > 0) {
      result.push({ label: 'BPM', value: String(track.bpm) });
    }

    if (track.contentType) {
      result.push({ label: 'Content Type', value: track.contentType });
    }

    if (track.displayComposer) {
      result.push({ label: 'Composer', value: track.displayComposer });
    }

    if (track.musicBrainzId) {
      result.push({ label: 'MusicBrainz ID', value: track.musicBrainzId });
    }

    if (track.replayGain?.trackGain != null) {
      result.push({ label: 'Replay Gain', value: `${track.replayGain.trackGain.toFixed(1)} dB` });
    }
    if (track.replayGain?.trackPeak != null) {
      result.push({ label: 'Track Peak', value: track.replayGain.trackPeak.toFixed(2) });
    }

    result.push({ label: 'ID', value: track.id });

    if (track.path) {
      result.push({ label: 'Path', value: track.path });
    }

    if (track.created) {
      result.push({ label: 'Added', value: formatDate(track.created) });
    }

    if (track.played) {
      result.push({ label: 'Last Played', value: formatDate(track.played) });
    }

    return result;
  }, [track]);

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight="60%">
      <View style={styles.header}>
        {track.coverArt && (
          <CachedImage coverArtId={track.coverArt} size={150} style={styles.coverArt} resizeMode="cover" />
        )}
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Track Details
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {track.title}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} bounces={false}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {row.label}
            </Text>
            <Text
              style={[styles.value, { color: colors.textPrimary }]}
              numberOfLines={2}
            >
              {row.value}
            </Text>
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  coverArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.12)',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  scrollArea: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 0,
    marginRight: 16,
  },
  value: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'right',
    flexShrink: 1,
  },
});
