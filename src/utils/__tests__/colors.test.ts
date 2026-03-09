import { getProminentColor } from '../colors';

describe('getProminentColor', () => {
  it('prefers secondary over darkVibrant', () => {
    expect(
      getProminentColor({ secondary: '#ff0000', darkVibrant: '#00ff00' }),
    ).toBe('#ff0000');
  });

  it('falls back to darkVibrant when secondary absent', () => {
    expect(getProminentColor({ darkVibrant: '#00ff00' })).toBe('#00ff00');
  });

  it('returns null when neither present', () => {
    expect(getProminentColor({})).toBeNull();
    expect(getProminentColor({ vibrant: '#fff' })).toBeNull();
    expect(getProminentColor({ primary: '#fff' })).toBeNull();
  });

  it('handles non-string values', () => {
    expect(getProminentColor({ secondary: 123 as unknown as string })).toBeNull();
    expect(getProminentColor({ darkVibrant: undefined })).toBeNull();
  });
});
