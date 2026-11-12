import { logError } from './errorLog';

/**
 * Starts work nobody waits for. A rejection is written to the error log with `tag` naming where it
 * came from, instead of surfacing as an unhandled promise rejection.
 */
export function fireAndForget(task: Promise<unknown> | null | undefined, tag: string): void {
  task?.catch((e: unknown) => {
    const cause = e instanceof Error ? e : new Error(String(e));
    const tagged = new Error(`${tag}: ${cause.message}`);
    tagged.stack = cause.stack;
    void logError(tagged, 'promise');
  });
}
