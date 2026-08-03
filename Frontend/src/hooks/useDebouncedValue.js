import { useEffect, useState } from 'react';

/**
 * Trails `value` by `delay`, so typing in a search box does not fire a request
 * per keystroke.
 */
export default function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
