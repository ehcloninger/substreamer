import { useEffect, useState } from 'react';

/**
 * Defer heavy rendering until the JS thread is idle (e.g. after a navigation
 * transition animation completes). Returns `true` once `requestIdleCallback` fires.
 *
 * If `skip` is true the hook returns `true` immediately (useful when there
 * is no cached data and you want to render the loading state right away).
 */
export function useTransitionComplete(skip = false): boolean {
  const [complete, setComplete] = useState(skip);

  useEffect(() => {
    if (skip) return;
    const id = requestIdleCallback(() => {
      setComplete(true);
    });
    return () => cancelIdleCallback(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return complete;
}
