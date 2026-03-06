import {
  formatCompactDuration,
  formatTrackDuration,
  stripHtml,
  sanitizeBiographyText,
  formatBytes,
  formatSpeed,
} from '../formatters';

describe('formatCompactDuration', () => {
  it('formats sub-hour as minutes', () => {
    expect(formatCompactDuration(0)).toBe('0m');
    expect(formatCompactDuration(60)).toBe('1m');
    expect(formatCompactDuration(2760)).toBe('46m');
  });

  it('formats exact hours', () => {
    expect(formatCompactDuration(3600)).toBe('1h');
    expect(formatCompactDuration(7200)).toBe('2h');
  });

  it('formats hours and minutes', () => {
    expect(formatCompactDuration(5400)).toBe('1h30m');
    expect(formatCompactDuration(3660)).toBe('1h1m');
  });

  it('rounds to nearest minute', () => {
    expect(formatCompactDuration(90)).toBe('2m');
    expect(formatCompactDuration(89)).toBe('1m');
  });

  it('handles negative input', () => {
    expect(formatCompactDuration(-60)).toBe('-1m');
  });

  it('handles NaN input without crashing', () => {
    const result = formatCompactDuration(NaN);
    expect(result).toContain('NaN');
  });
});

describe('formatTrackDuration', () => {
  it('formats standard duration', () => {
    expect(formatTrackDuration(222)).toBe('3:42');
    expect(formatTrackDuration(0)).toBe('0:00');
  });

  it('formats sub-minute', () => {
    expect(formatTrackDuration(30)).toBe('0:30');
  });

  it('pads seconds with leading zero', () => {
    expect(formatTrackDuration(725)).toBe('12:05');
    expect(formatTrackDuration(65)).toBe('1:05');
  });

  it('floors fractional seconds', () => {
    expect(formatTrackDuration(3.7)).toBe('0:03');
    expect(formatTrackDuration(59.9)).toBe('0:59');
  });

  it('handles hour-long tracks', () => {
    expect(formatTrackDuration(3661)).toBe('61:01');
  });

  it('handles negative input without crashing', () => {
    const result = formatTrackDuration(-1);
    expect(typeof result).toBe('string');
  });
});

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello</p>')).toBe('Hello');
    expect(stripHtml('<b>bold</b> text')).toBe('bold text');
  });

  it('trims whitespace', () => {
    expect(stripHtml('  <span>a</span>  ')).toBe('a');
  });

  it('handles nested tags', () => {
    expect(stripHtml('<div><p><strong>nested</strong></p></div>')).toBe('nested');
  });

  it('handles empty input', () => {
    expect(stripHtml('')).toBe('');
  });

  it('handles self-closing tags', () => {
    expect(stripHtml('a<br/>b')).toBe('ab');
    expect(stripHtml('a<img src="x"/>b')).toBe('ab');
  });
});

describe('sanitizeBiographyText', () => {
  it('preserves paragraph boundaries from </p>', () => {
    expect(sanitizeBiographyText('<p>First</p><p>Second</p>')).toBe('First\n\nSecond');
  });

  it('preserves paragraph boundaries from <br/>', () => {
    expect(sanitizeBiographyText('Line1<br/>Line2')).toBe('Line1\n\nLine2');
  });

  it('decodes HTML entities', () => {
    expect(sanitizeBiographyText('&amp;')).toBe('&');
    expect(sanitizeBiographyText('&lt;')).toBe('<');
    expect(sanitizeBiographyText('&quot;')).toBe('"');
    expect(sanitizeBiographyText('a&nbsp;b')).toBe('a b');
  });

  it('decodes numeric entities', () => {
    expect(sanitizeBiographyText('&#169;')).toBe('©');
    expect(sanitizeBiographyText('&#x00A9;')).toBe('©');
  });

  it('normalizes whitespace', () => {
    expect(sanitizeBiographyText('a  b')).toBe('a b');
    expect(sanitizeBiographyText('\n\n\n')).toBe('');
  });

  it('handles </div> as paragraph boundary', () => {
    expect(sanitizeBiographyText('<div>First</div><div>Second</div>')).toBe('First\n\nSecond');
  });

  it('decodes &apos; and &gt; entities', () => {
    expect(sanitizeBiographyText("it&apos;s")).toBe("it's");
    expect(sanitizeBiographyText('a &gt; b')).toBe('a > b');
  });

  it('replaces low numeric char codes with space', () => {
    expect(sanitizeBiographyText('a&#10;b')).toBe('a b');
    expect(sanitizeBiographyText('a&#x0A;b')).toBe('a b');
  });

  it('handles real-world biography HTML', () => {
    const html = '<p>Artist is a <strong>band</strong>.</p><br/><p>Formed in 1990.</p>';
    expect(sanitizeBiographyText(html)).toBe('Artist is a band.\n\nFormed in 1990.');
  });

  it('returns empty string for whitespace-only input after stripping', () => {
    expect(sanitizeBiographyText('<p>  </p>')).toBe('');
  });
});

describe('formatBytes', () => {
  it('formats zero', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(100)).toBe('100 B');
  });

  it('formats KB with decimal when under 10', () => {
    expect(formatBytes(4200)).toBe('4.1 KB');
    expect(formatBytes(1024)).toBe('1.0 KB');
  });

  it('formats KB rounded when 10 or more', () => {
    expect(formatBytes(15360)).toBe('15 KB');
  });

  it('formats MB and GB', () => {
    expect(formatBytes(128 * 1024 * 1024)).toBe('128 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
  });

  it('handles exactly 1 byte', () => {
    expect(formatBytes(1)).toBe('1.0 B');
  });

  it('clamps to GB for very large values', () => {
    expect(formatBytes(5 * 1024 ** 4)).toBe('5120 GB');
  });
});

describe('formatSpeed', () => {
  it('formats zero and negative as 0 B/s', () => {
    expect(formatSpeed(0)).toBe('0 B/s');
    expect(formatSpeed(-100)).toBe('0 B/s');
  });

  it('formats KB/s', () => {
    expect(formatSpeed(856)).toBe('856 B/s');
    expect(formatSpeed(1024)).toBe('1.0 KB/s');
  });

  it('formats MB/s', () => {
    expect(formatSpeed(12.5 * 1024 * 1024)).toBe('13 MB/s');
  });

  it('formats sub-10 MB/s with decimal', () => {
    expect(formatSpeed(5 * 1024 * 1024)).toBe('5.0 MB/s');
  });
});
