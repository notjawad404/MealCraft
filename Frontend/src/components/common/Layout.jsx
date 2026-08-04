import { useEffect } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

/**
 * Scrolls a new page to the top. Keyed on the path alone, so query-string
 * changes and history navigation keep their own scroll position.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === 'POP') return;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, navigationType]);

  return null;
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60]
                   focus:rounded-full focus:bg-ember-600 focus:px-5 focus:py-2.5
                   focus:text-sm focus:font-semibold focus:text-paper-50"
      >
        Skip to content
      </a>

      <Navbar />

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
