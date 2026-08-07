"use client";

import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

// Measures the pixel offset from the top of `scrollContainerRef`'s content
// to `anchorRef` — the value react-virtual's `scrollMargin` option needs
// when the virtualized list sits below other content (search bar, filter
// chips, section headers) in a shared scroll container rather than owning
// the whole thing.
export function useScrollMargin(
  scrollContainerRef: RefObject<HTMLElement | null>,
  anchorRef: RefObject<HTMLElement | null>,
) {
  const [scrollMargin, setScrollMargin] = useState(0);

  const measure = () => {
    const scrollEl = scrollContainerRef.current;
    const anchorEl = anchorRef.current;
    if (!scrollEl || !anchorEl) {
      return;
    }

    setScrollMargin(
      anchorEl.getBoundingClientRect().top -
        scrollEl.getBoundingClientRect().top +
        scrollEl.scrollTop,
    );
  };

  // Re-measure after every render — content above the anchor (a section
  // header appearing, chips wrapping to a second line) can shift its
  // position for reasons that don't fire a resize observer.
  useLayoutEffect(measure);

  // Also catch layout shifts not tied to a React render, e.g. viewport
  // resize/orientation change or web font swap reflowing text above. Runs
  // once on mount — scrollContainerRef/anchorRef are stable ref objects, so
  // there's nothing meaningful to re-subscribe to across re-renders.
  useEffect(() => {
    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) {
      return;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(scrollEl);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return scrollMargin;
}
