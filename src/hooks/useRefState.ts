import { useCallback, useRef, useState } from 'react';

type Next<T> = T | ((prev: T) => T);

/**
 * State with a ref that always holds the latest value, including updates not rendered yet.
 * Async callbacks read the ref instead of closing over render state, and the next value is computed
 * from it outside a setState updater, so side effects (storage, analytics) never run inside one.
 */
export function useRefState<T>(initial: T) {
  const [state, setState] = useState(initial);
  const ref = useRef(state);
  const set = useCallback((next: Next<T>) => {
    const value = typeof next === 'function' ? (next as (prev: T) => T)(ref.current) : next;
    ref.current = value;
    setState(value);
    return value;
  }, []);
  return [state, set, ref] as const;
}
