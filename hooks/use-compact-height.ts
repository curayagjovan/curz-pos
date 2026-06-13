"use client";

import { useEffect, useState } from "react";

export function useCompactHeight(maxHeight = 500) {
  const [isCompactHeight, setIsCompactHeight] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-height: ${maxHeight}px)`);

    const update = () => {
      setIsCompactHeight(mediaQuery.matches);
    };

    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, [maxHeight]);

  return isCompactHeight;
}
