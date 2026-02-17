import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Defer heavy rendering until the navigation transition animation completes.
 * Returns `true` once `InteractionManager.runAfterInteractions` fires.
 *
 * If `skip` is true the hook returns `true` immediately (useful when there
 * is no cached data and you want to render the loading state right away).
 */
export function useTransitionComplete(skip = false): boolean {
  const [complete, setComplete] = useState(skip);

  useEffect(() => {
    if (skip) return;
    const handle = InteractionManager.runAfterInteractions(() => {
      setComplete(true);
    });
    return () => handle.cancel();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return complete;
}
