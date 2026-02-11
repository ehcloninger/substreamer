import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';
import {
  starArtist,
  unstarArtist,
  type ArtistID3,
  type ArtistWithAlbumsID3,
} from '../services/subsonicService';
import { favoritesStore } from '../store/favoritesStore';

export interface ArtistOptionsSheetProps {
  /** The artist to show options for */
  artist: ArtistID3 | ArtistWithAlbumsID3;
  /** Whether the sheet is visible */
  visible: boolean;
  /** Called to dismiss the sheet */
  onClose: () => void;
  /** Called after the starred state changes so the parent can update its own state */
  onStarChanged?: (artistId: string, starred: boolean) => void;
}

export function ArtistOptionsSheet({
  artist,
  visible,
  onClose,
  onStarChanged,
}: ArtistOptionsSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const isStarred = Boolean(artist.starred);

  const handleToggleStar = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (isStarred) {
        await unstarArtist(artist.id);
      } else {
        await starArtist(artist.id);
      }
      onStarChanged?.(artist.id, !isStarred);
      // Refresh the favorites store so the favorites view stays in sync
      favoritesStore.getState().fetchStarred();
    } catch {
      // Silently fail -- could add error toast later
    } finally {
      setBusy(false);
      onClose();
    }
  }, [artist.id, isStarred, busy, onStarChanged, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet */}
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {/* Handle indicator */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Artist name */}
        <Text style={[styles.sheetTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {artist.name}
        </Text>
        <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {artist.albumCount === 1 ? '1 album' : `${artist.albumCount} albums`}
        </Text>

        {/* Favorite / Unfavorite option */}
        <Pressable
          onPress={handleToggleStar}
          disabled={busy}
          style={({ pressed }) => [
            styles.option,
            pressed && styles.optionPressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.optionIcon}
            />
          ) : (
            <Ionicons
              name={isStarred ? 'heart' : 'heart-outline'}
              size={22}
              color={isStarred ? colors.red : colors.textPrimary}
              style={styles.optionIcon}
            />
          )}
          <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
            {isStarred ? 'Remove from Favorites' : 'Add to Favorites'}
          </Text>
        </Pressable>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  optionPressed: {
    opacity: 0.6,
  },
  optionIcon: {
    width: 28,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});
