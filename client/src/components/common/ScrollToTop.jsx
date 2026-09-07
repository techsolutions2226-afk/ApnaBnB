/* Scrolls the window back to the top on every route change.
 *
 * BrowserRouter does no scroll management: without this, the browser keeps the
 * previous page's scroll position, so navigating from a scrolled-down list
 * (e.g. clicking a property card on the Home page) lands the next page
 * mid-screen. Rendered once inside the router; keyed on pathname + search so
 * URL-driven navigation always starts at the top while in-page state changes
 * (paginating, expanding sections) never fight it. */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}

export default ScrollToTop;