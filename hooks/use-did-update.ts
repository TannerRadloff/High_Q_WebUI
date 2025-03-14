import { useEffect, useRef, DependencyList } from 'react';

/**
 * A hook that works like useEffect but skips the first render
 * @param callback Function to call when dependencies change (except on first render)
 * @param dependencies Dependency array
 */
export function useDidUpdate(
  callback: () => void | (() => void),
  dependencies: DependencyList
) {
  const didMountRef = useRef(false);

  useEffect(() => {
    // Skip the first render
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    // Call the callback on updates
    return callback();
  }, dependencies);
} 