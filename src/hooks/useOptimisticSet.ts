import { useCallback, useMemo, useRef, useState } from 'react';
import { applyOverrides, reconcileOverrides, withOverride, type Overrides } from '../utils/optimistic';

/**
 * A set the screen updates before storage does. `toggle(key, commit)` flips the key at once and runs
 * `commit`; the override goes away once the confirmed set agrees or the commit settles, and is
 * dropped on failure, so the screen falls back to what is really stored.
 */
export function useOptimisticSet<K>(confirmed: ReadonlySet<K>) {
  const [overrides, setOverrides] = useState<Overrides<K>>(() => new Map());
  // The latest tap per key: an older commit finishing must not clear a newer tap's override
  const latest = useRef(new Map<K, number>());
  const counter = useRef(0);

  // When storage reports a new confirmed set, drop the overrides it now agrees with
  // (adjusting state while rendering, React's pattern for reacting to a changed prop)
  const [reconciledFor, setReconciledFor] = useState(confirmed);
  if (reconciledFor !== confirmed) {
    setReconciledFor(confirmed);
    setOverrides((o) => reconcileOverrides(o, confirmed));
  }

  const shown = useMemo(() => applyOverrides(confirmed, overrides), [confirmed, overrides]);

  const toggle = useCallback(
    async (key: K, commit: () => Promise<unknown>): Promise<boolean> => {
      const member = !shown.has(key);
      const token = ++counter.current;
      latest.current.set(key, token);
      setOverrides((o) => withOverride(o, key, member));
      let ok = true;
      try {
        await commit();
      } catch {
        ok = false;
      }
      // By now the confirmed set holds the stored answer; show it (unless another tap came after)
      if (latest.current.get(key) === token) {
        latest.current.delete(key);
        setOverrides((o) => withOverride(o, key, undefined));
      }
      return ok;
    },
    [shown]
  );

  return { shown, toggle };
}
