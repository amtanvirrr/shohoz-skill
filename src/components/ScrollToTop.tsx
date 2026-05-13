import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      // Wait for the destination route to render before scrolling, then re-scroll
      // once more after images / lazy content settle to avoid header overlap caused
      // by post-mount layout shifts.
      const scroll = () => {
        const el = document.getElementById(id);
        if (el) {
          // scroll-margin-top on the target (e.g. `scroll-mt-24`) handles the sticky header offset
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollTo(0, 0);
        }
      };
      const t1 = window.setTimeout(scroll, 250);
      const t2 = window.setTimeout(scroll, 750);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
