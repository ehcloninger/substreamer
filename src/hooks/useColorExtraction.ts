/**
 * Custom hook that extracts a prominent color from cover art and
 * provides an animated gradient opacity value.
 *
 * Used by album-detail, artist-detail, and playlist-detail screens
 * to create dynamic gradient backgrounds from cover art.
 */

import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { useCachedCoverArt } from './useCachedCoverArt';
import { type ExtractedColors, getProminentColor } from '../utils/colors';

interface ColorExtractionResult {
  /** The extracted prominent color, or null if not available. */
  coverBackgroundColor: string | null;
  /** Animated opacity value for the gradient overlay (0 → 1 on color change). */
  gradientOpacity: SharedValue<number>;
}

/**
 * Extract a prominent color from cover art and animate a gradient opacity.
 *
 * @param coverArtId  The Subsonic cover art ID (e.g. `album.coverArt`). Pass `undefined` to skip.
 * @param fallbackColor  The theme background color used as a fallback for the color extraction library.
 */
export function useColorExtraction(
  coverArtId: string | undefined,
  fallbackColor: string,
): ColorExtractionResult {
  const cachedUri = useCachedCoverArt(coverArtId, 50);
  const [coverBackgroundColor, setCoverBackgroundColor] = useState<string | null>(null);
  const gradientOpacity = useSharedValue(0);

  // Extract prominent color from cover art. Skip in Expo Go (native module required).
  useEffect(() => {
    if (!coverArtId) {
      setCoverBackgroundColor(null);
      return;
    }
    if (Constants.appOwnership === 'expo') {
      setCoverBackgroundColor(null);
      return;
    }
    const uri = cachedUri;
    if (!uri) {
      setCoverBackgroundColor(null);
      return;
    }
    let cancelled = false;
    const id = requestIdleCallback(() => {
      (async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (cancelled) return;
          const { getColors } = await import('react-native-image-colors');
          const result = await getColors(uri, {
            fallback: fallbackColor,
            quality: 'low',
          });
          if (cancelled) return;
          const prominent = getProminentColor(result as ExtractedColors);
          setCoverBackgroundColor(prominent ?? null);
        } catch {
          if (!cancelled) setCoverBackgroundColor(null);
        }
      })();
    });
    return () => {
      cancelled = true;
      cancelIdleCallback(id);
    };
  }, [coverArtId, cachedUri, fallbackColor]);

  // Animate gradient opacity when color changes.
  useEffect(() => {
    if (coverBackgroundColor) {
      gradientOpacity.value = 0;
      gradientOpacity.value = withTiming(1, { duration: 400 });
    } else {
      gradientOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [coverBackgroundColor, gradientOpacity]);

  return { coverBackgroundColor, gradientOpacity };
}
