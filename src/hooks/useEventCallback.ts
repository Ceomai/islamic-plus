import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * A callback whose identity never changes but which always runs the latest `fn`. For handlers
 * passed to memoized list rows, so a change elsewhere on the screen does not re-render every row.
 * Not for use during render.
 */
export function useEventCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}
