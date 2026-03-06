import { getFirstLetter, minDelay } from '../stringHelpers';

describe('getFirstLetter', () => {
  it('returns uppercase letter for letter input', () => {
    expect(getFirstLetter('A')).toBe('A');
    expect(getFirstLetter('Z')).toBe('Z');
  });

  it('returns uppercase for lowercase input', () => {
    expect(getFirstLetter('a')).toBe('A');
    expect(getFirstLetter('hello')).toBe('H');
  });

  it('returns # for number', () => {
    expect(getFirstLetter('1')).toBe('#');
    expect(getFirstLetter('42')).toBe('#');
  });

  it('returns # for symbol', () => {
    expect(getFirstLetter('!')).toBe('#');
    expect(getFirstLetter('@')).toBe('#');
  });

  it('returns # for empty string', () => {
    expect(getFirstLetter('')).toBe('#');
  });

  it('returns # for non-ASCII letters (regex matches A-Z only)', () => {
    expect(getFirstLetter('É')).toBe('#');
    expect(getFirstLetter('ñ')).toBe('#');
  });
});

describe('minDelay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves after specified ms', async () => {
    const p = minDelay(500);
    jest.advanceTimersByTime(500);
    await expect(p).resolves.toBeUndefined();
  });

  it('does not resolve before specified ms', async () => {
    let resolved = false;
    minDelay(500).then(() => { resolved = true; });
    jest.advanceTimersByTime(499);
    await Promise.resolve();
    expect(resolved).toBe(false);
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(resolved).toBe(true);
  });

  it('uses default 2000ms when no arg', async () => {
    let resolved = false;
    minDelay().then(() => { resolved = true; });
    jest.advanceTimersByTime(1999);
    await Promise.resolve();
    expect(resolved).toBe(false);
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(resolved).toBe(true);
  });

  it('resolves immediately when ms is 0', async () => {
    const p = minDelay(0);
    jest.advanceTimersByTime(0);
    await expect(p).resolves.toBeUndefined();
  });
});
