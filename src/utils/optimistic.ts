/**
 * Optimistic membership: taps change what the screen shows at once ("overrides"), while storage
 * catches up and reports the confirmed set.
 */
export type Overrides<K> = ReadonlyMap<K, boolean>;

/** What to show: the confirmed set with each pending override applied. */
export function applyOverrides<K>(confirmed: ReadonlySet<K>, overrides: Overrides<K>): Set<K> {
  const shown = new Set(confirmed);
  for (const [key, member] of overrides) {
    if (member) shown.add(key);
    else shown.delete(key);
  }
  return shown;
}

/**
 * Drops the overrides the confirmed set now agrees with. An override storage has not caught up with
 * yet (a second tap still on its way) stays. Returns the same map when nothing changed.
 */
export function reconcileOverrides<K>(overrides: Overrides<K>, confirmed: ReadonlySet<K>): Overrides<K> {
  let next: Map<K, boolean> | null = null;
  for (const [key, member] of overrides) {
    if (confirmed.has(key) !== member) continue;
    next ??= new Map(overrides);
    next.delete(key);
  }
  return next ?? overrides;
}

/** Sets (or, with `member` undefined, clears) one override. */
export function withOverride<K>(overrides: Overrides<K>, key: K, member: boolean | undefined): Overrides<K> {
  const next = new Map(overrides);
  if (member === undefined) next.delete(key);
  else next.set(key, member);
  return next;
}
