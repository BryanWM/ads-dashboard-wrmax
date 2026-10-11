import * as React from "react";

/**
 * Subscribes to a CSS media query. Server render returns `false`; use it only to
 * decide whether to MOUNT heavy widgets (layout itself stays in CSS, so there is
 * no layout shift on hydration).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
