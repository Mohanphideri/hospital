import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router doesn't reset scroll position on navigation by itself - so
// clicking a footer link (Privacy Policy, Terms, etc.) from partway down the
// landing page landed the new page already scrolled down. This resets to the
// top on every route change, except when the URL has a #hash (e.g. jumping
// to #departments or #faq), where the browser's own anchor scroll should win.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
