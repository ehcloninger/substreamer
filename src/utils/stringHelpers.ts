/**
 * Return the uppercase first letter of a name, or '#' for non-alpha characters.
 * Used by list views for alphabet scroller section indexing.
 */
export function getFirstLetter(name: string): string {
  const ch = name.charAt(0).toUpperCase();
  return /[A-Z]/.test(ch) ? ch : '#';
}

/**
 * Return a promise that resolves after `ms` milliseconds.
 * Used to ensure pull-to-refresh animations have a minimum visible duration.
 */
export function minDelay(ms = 2000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
