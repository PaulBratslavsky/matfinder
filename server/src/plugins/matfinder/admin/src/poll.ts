/**
 * Runs `load` now and then every `ms`, never overlapping: the next run is scheduled when the previous one settles.
 * Returns a stop function (call it on unmount).
 */
export function startPolling(load: () => Promise<unknown>, ms: number): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tick = async () => {
    try {
      await load();
    } finally {
      if (!stopped) timer = setTimeout(tick, ms);
    }
  };
  tick();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
