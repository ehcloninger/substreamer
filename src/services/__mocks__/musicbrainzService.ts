/**
 * Shared Jest automatic mock for musicbrainzService.
 *
 * All functions return null by default.
 * Override per-test with mockResolvedValue / mockResolvedValueOnce.
 */

export const searchArtistMBID = jest.fn().mockResolvedValue(null);
export const getArtistBiography = jest.fn().mockResolvedValue(null);
