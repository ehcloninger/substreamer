/**
 * Color extraction utilities for detail screens.
 *
 * Used with react-native-image-colors to extract prominent colors
 * from cover art images for gradient backgrounds.
 */

/** Result shape from react-native-image-colors (Android/Web: vibrant swatches; iOS: primary). */
export type ExtractedColors = {
  vibrant?: string;
  lightVibrant?: string;
  darkVibrant?: string;
  dominant?: string;
  primary?: string;
  background?: string;
  secondary?: string;
  detail?: string;
};

/** Prefer primary (iOS) then darkVibrant (Android/Web); else null for theme background. */
export function getProminentColor(result: ExtractedColors): string | null {
  if (result.primary && typeof result.primary === 'string') return result.primary;
  if (result.darkVibrant && typeof result.darkVibrant === 'string') return result.darkVibrant;
  return null;
}
