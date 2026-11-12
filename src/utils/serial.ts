/**
 * Runs async read-modify-write steps one after another. Taps that arrive faster than storage
 * answers used to read the same old value, and all but one of them were lost.
 */
export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function run<T>(task: () => Promise<T>): Promise<T> {
    const next = tail.then(task);
    tail = next.catch(() => undefined);
    return next;
  };
}
