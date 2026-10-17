/** Wraps an async action so a second call while the first is running is ignored (double clicks). */
export function singleFlight<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R | undefined> {
  let running = false;
  return async (...args: A) => {
    if (running) return undefined;
    running = true;
    try {
      return await fn(...args);
    } finally {
      running = false;
    }
  };
}
