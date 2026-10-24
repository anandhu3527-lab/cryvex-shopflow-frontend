/**
 * ScrollToTop.jsx
 * Scrolls the main content area to the top on forward navigations
 * (push/replace), but lets the browser restore scroll on Back/Forward (pop).
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, key } = useLocation();
  const prevKey = useRef(key);

  useEffect(() => {
    // `key` changes on every navigation; it stays the same only if the URL
    // didn't actually change.  On a pop (back/forward) React Router keeps
    // the same key so we can distinguish it from a fresh push.
    if (key !== prevKey.current) {
      // Find the scrollable main element and reset it
      const main = document.querySelector("main");
      if (main) main.scrollTop = 0;
      window.scrollTo(0, 0);
    }
    prevKey.current = key;
  }, [pathname, key]);

  return null;
}
