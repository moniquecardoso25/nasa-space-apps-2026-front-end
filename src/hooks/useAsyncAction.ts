import { useRef, useState } from 'react';

/** Keep the form intact after a failed request and reject duplicate taps. */
export function useAsyncAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => unknown | Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return { run, busy, error };
}
