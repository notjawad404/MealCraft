import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { cookbookApi } from '../../lib/api';
import { formatPrice } from '../../lib/money';
import useAuth from '../../hooks/useAuth';

export default function CookbookDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [cookbook, setCookbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [calculatedIndex, setCalculatedIndex] = useState([]);

  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState('');
  const [cancelled, setCancelled] = useState(false);

  // '' | 'confirming' | 'paid' | 'settling'. Anything non-empty means Stripe has
  // already taken the money, which is what keeps the buy button off the page.
  const [purchaseState, setPurchaseState] = useState('');
  const [sessionToConfirm, setSessionToConfirm] = useState('');

  const loadCookbook = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true);
      try {
        const data = await cookbookApi.get(id, { token });
        setCookbook(data);
        return data;
      } catch (err) {
        setError(err.message || 'Failed to load cookbook');
        return null;
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [id, token],
  );

  useEffect(() => {
    let isMounted = true;
    const fetchCookbook = async () => {
      try {
        setLoading(true);
        const data = await cookbookApi.get(id, { token });
        if (isMounted) setCookbook(data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load cookbook');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCookbook();
    return () => {
      isMounted = false;
    };
  }, [id, token]);

  // Split from the polling below so clearing the query string cannot tear down
  // an in-flight confirmation by re-running that effect.
  useEffect(() => {
    const outcome = searchParams.get('checkout');
    if (!outcome) return;

    const sessionId = searchParams.get('session_id');

    if (outcome === 'cancelled') {
      setCancelled(true);
    } else if (outcome === 'success' && sessionId && token) {
      setPurchaseState('confirming');
      setSessionToConfirm(sessionId);
    }

    const next = new URLSearchParams(searchParams);
    next.delete('checkout');
    next.delete('session_id');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, token]);

  // Stripe redirects back the moment the payment is taken, but Link and bank
  // debits are only settled once their balance transaction posts a minute or so
  // later. Poll instead of asking once, so access appears on its own.
  useEffect(() => {
    if (!sessionToConfirm || !token) return;

    const delays = [0, 1000, 2000, 3000, 5000, 5000, 8000, 8000];
    let isMounted = true;
    let timer;

    const attempt = async (index) => {
      let paid = false;

      try {
        const result = await cookbookApi.confirmPurchase(sessionToConfirm, token);
        paid = Boolean(result?.paid);
      } catch {
        // The webhook settles the order regardless; just try again.
      }

      if (!isMounted) return;

      if (paid) {
        await loadCookbook({ quiet: true });
        if (isMounted) setPurchaseState('paid');
        return;
      }

      if (index + 1 < delays.length) {
        timer = setTimeout(() => attempt(index + 1), delays[index + 1]);
        return;
      }

      // Out of patience, not out of luck: the webhook still has it in hand.
      const data = await loadCookbook({ quiet: true });
      if (isMounted) setPurchaseState(data && !data.isLocked ? 'paid' : 'settling');
    };

    attempt(0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [sessionToConfirm, token, loadCookbook]);

  const recheckPurchase = useCallback(async () => {
    if (!sessionToConfirm || !token) return;

    setPurchaseState('confirming');

    try {
      const result = await cookbookApi.confirmPurchase(sessionToConfirm, token);
      const data = await loadCookbook({ quiet: true });
      setPurchaseState(result?.paid || (data && !data.isLocked) ? 'paid' : 'settling');
    } catch {
      setPurchaseState('settling');
    }
  }, [sessionToConfirm, token, loadCookbook]);

  const handleBuy = async () => {
    setBuyError('');

    if (!user) {
      navigate('/login', { state: { from: `/cookbooks/${id}` } });
      return;
    }

    try {
      setBuying(true);
      const { url } = await cookbookApi.checkout(id, token);
      window.location.href = url;
    } catch (err) {
      setBuyError(err.message || 'Could not start checkout. Please try again.');
      setBuying(false);
    }
  };

  // Calculate exact physical page numbers dynamically based on content length
  useEffect(() => {
    if (!cookbook || !cookbook.recipes) return;

    // A locked cookbook has no recipe bodies to measure; use the stored index.
    if (cookbook.isLocked) {
      const toc = cookbook.tableOfContents || [];

      setCalculatedIndex(
        toc.map((entry, idx) => {
          const startPage = entry.pageNumber;
          const next = toc[idx + 1];
          const endPage = next ? Math.max(startPage, next.pageNumber - 1) : startPage;

          return {
            recipeId: cookbook.recipes[idx]?.recipe?._id || `toc-${idx}`,
            title: entry.title,
            isPublic: cookbook.recipes[idx]?.recipe?.isPublic,
            startPage,
            endPage,
            pageSpan: endPage - startPage + 1,
          };
        }),
      );
      return;
    }

    let currentPage = 3; // Page 1: Cover Page, Page 2: Table of Contents Index

    const indexList = cookbook.recipes.map((item, idx) => {
      const recipe = item.recipe || item;
      const startPage = currentPage;

      // Measure character length of ingredients + instructions + custom notes
      const ingredientsLength = recipe.ingredients?.length || 0;
      const instructionsLength = recipe.instructions?.length || 0;
      const notesLength = item.customNotes?.length || 0;
      const totalChars = ingredientsLength + instructionsLength + notesLength;

      // Standard A4 sheet comfortably holds ~750 characters.
      // If content is longer, calculate exact spanned pages
      const pageSpan = totalChars > 750 ? Math.max(1, Math.ceil(totalChars / 750)) : 1;

      currentPage += pageSpan;

      return {
        recipeId: recipe._id || idx,
        title: recipe.title || `Recipe #${idx + 1}`,
        isPublic: recipe.isPublic,
        startPage,
        endPage: startPage + pageSpan - 1,
        pageSpan,
      };
    });

    setCalculatedIndex(indexList);
  }, [cookbook]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this cookbook?')) return;
    try {
      setDeleting(true);
      await cookbookApi.remove(id, token);
      navigate('/cookbooks');
    } catch (err) {
      alert(err.message || 'Failed to delete cookbook');
      setDeleting(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="shell py-12 text-center text-ink-500 dark:text-ink-400">
        Loading cookbook details & pages...
      </div>
    );
  }

  if (error || !cookbook) {
    return (
      <div className="shell py-12">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <h2 className="text-lg font-bold mb-2">Error</h2>
          <p>{error || 'Cookbook not found'}</p>
          <Link to="/cookbooks" className="btn btn-ghost mt-4 inline-flex">
            Back to Cookbooks
          </Link>
        </div>
      </div>
    );
  }

  const isAuthor = Boolean(cookbook.isOwner);
  const recipesList = cookbook.recipes || [];
  const isLocked = Boolean(cookbook.isLocked);
  const priceLabel = formatPrice(cookbook.price || 0, cookbook.currency);

  const justPurchased = purchaseState === 'paid';
  // Once Stripe has the money the buy button never comes back, even if the
  // unlock is late — re-offering it is precisely how a buyer pays twice.
  const awaitingAccess = Boolean(purchaseState) && isLocked;

  const settlingPanel = (
    <div className="print:hidden mx-auto max-w-[850px]">
      <div className="surface rounded-2xl border-2 border-emerald-500/40 p-6 sm:p-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Payment received
        </span>

        <h2 className="mt-4 text-2xl font-bold text-ink-900 dark:text-ink-50">
          {priceLabel} paid — unlocking your cookbook
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-600 dark:text-ink-300">
          {purchaseState === 'settling'
            ? 'Your bank is taking a moment to settle this one. Your access will appear on its own — please don’t pay again.'
            : 'Confirming with Stripe. This usually takes a second.'}
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            onClick={recheckPurchase}
            disabled={purchaseState === 'confirming'}
            className="btn btn-primary w-full max-w-xs justify-center shadow-lg disabled:opacity-60"
          >
            {purchaseState === 'confirming' ? 'Confirming…' : 'Check again'}
          </button>
        </div>
      </div>
    </div>
  );

  const purchasePanel = (
    <div className="print:hidden mx-auto max-w-[850px]">
      <div className="surface rounded-2xl border-2 border-ember-500/40 p-6 sm:p-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ember-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-ember-700 dark:text-ember-300">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Locked
        </span>

        <h2 className="mt-4 text-2xl font-bold text-ink-900 dark:text-ink-50">
          Unlock all {cookbook.recipeCount ?? recipesList.length} recipes
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-600 dark:text-ink-300">
          You&rsquo;re seeing the cover and contents. Buy the cookbook to read every
          recipe in full, along with {cookbook.author?.name || 'the author'}&rsquo;s
          notes for each one.
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="text-4xl font-extrabold tracking-tight text-ink-900 dark:text-ink-50">
            {priceLabel}
          </div>

          <button
            onClick={handleBuy}
            disabled={buying}
            className="btn btn-primary w-full max-w-xs justify-center shadow-lg disabled:opacity-60"
          >
            {buying ? 'Redirecting to checkout…' : `Buy for ${priceLabel}`}
          </button>

          <p className="text-xs text-ink-500 dark:text-ink-400">
            {user
              ? 'Secure payment through Stripe. One-time purchase, yours forever.'
              : 'You’ll be asked to sign in first.'}
          </p>
        </div>

        {buyError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {buyError}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="shell py-8">
      {/* Action Header - Hidden during print */}
      <div className="print:hidden mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ink-200 pb-6 dark:border-night-700">
        <div>
          <Link to="/cookbooks" className="text-xs font-semibold text-ember-600 hover:underline dark:text-ember-400 mb-1 inline-block">
            ← Back to All Cookbooks
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-ink-50">
            {cookbook.title}
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Compiled by <span className="font-semibold text-ink-800 dark:text-ink-200">{cookbook.author?.name || 'Author'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {awaitingAccess ? (
            <span className="btn btn-primary pointer-events-none flex items-center gap-2 opacity-70 shadow">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Unlocking&hellip;
            </span>
          ) : isLocked ? (
            <button
              onClick={handleBuy}
              disabled={buying}
              className="btn btn-primary flex items-center gap-2 shadow disabled:opacity-60"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {buying ? 'Redirecting…' : `Buy for ${priceLabel}`}
            </button>
          ) : (
            <>
              {cookbook.isPurchased && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Already bought
                </span>
              )}
              <button
                onClick={handlePrintPDF}
                className="btn btn-primary flex items-center gap-2 shadow"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / Download PDF Book
              </button>
            </>
          )}

          {isAuthor && (
            <>
              <Link to={`/cookbooks/${cookbook._id}/edit`} className="btn btn-ghost">
                Edit
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {purchaseState === 'confirming' && (
        <div className="print:hidden mb-6 flex items-center justify-center gap-2 rounded-xl border border-ember-200 bg-ember-50 p-4 text-center text-sm font-semibold text-ember-800 dark:border-ember-900/50 dark:bg-ember-950/40 dark:text-ember-200">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Payment received — confirming with Stripe&hellip;
        </div>
      )}

      {justPurchased && (
        <div className="print:hidden mb-6 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          <span className="flex items-center gap-2">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Payment confirmed — this cookbook is yours. Enjoy every recipe.
          </span>
          <button
            onClick={() => setPurchaseState('')}
            className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {purchaseState === 'settling' && (
        <div className="print:hidden mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-semibold">Payment received — your access is on its way.</p>
          <p className="mt-1">
            Bank-backed methods like Link can take a minute to settle. This page unlocks
            itself once it does, so there&rsquo;s no need to pay again.
          </p>
        </div>
      )}

      {cancelled && (
        <div className="print:hidden mb-6 flex items-center justify-between gap-4 rounded-xl border border-ink-200 bg-paper-100 p-4 text-sm text-ink-700 dark:border-night-700 dark:bg-night-800 dark:text-ink-200">
          <span>Checkout cancelled — you have not been charged.</span>
          <button
            onClick={() => setCancelled(false)}
            className="text-xs font-semibold text-ember-700 hover:underline dark:text-ember-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Custom Uploaded PDF Mode */}
      {cookbook.pdfType === 'uploaded' && cookbook.pdfUrl ? (
        <div className="surface rounded-2xl p-6">
          <h2 className="text-xl font-bold text-ink-900 dark:text-ink-50 mb-4">Uploaded Custom PDF Document</h2>
          <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-ink-100 dark:bg-night-800">
            <iframe
              src={cookbook.pdfUrl}
              title={cookbook.title}
              className="h-full w-full border-0"
            />
          </div>
          <div className="mt-4 text-center">
            <a
              href={cookbook.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary inline-flex"
            >
              Download PDF Document
            </a>
          </div>
        </div>
      ) : (
        /* Digital Book Viewer Format - Matches A4 Sheet Dimensions */
        <div className="max-w-[850px] mx-auto space-y-8 print:space-y-0 print:max-w-none print:m-0 print:p-0">
          
          {/* ================= PAGE 1: COVER PAGE ================= */}
          <div className="pdf-page-sheet min-h-[1050px] flex flex-col justify-between rounded-3xl border border-ink-200 bg-gradient-to-b from-paper-50 via-white to-paper-50 p-8 sm:p-14 dark:from-night-900 dark:via-night-800 dark:to-night-900 text-center relative overflow-hidden shadow-xl dark:border-night-700 print:shadow-none print:border-0 print:rounded-none">
            <div className="absolute top-6 left-6 text-xs font-bold uppercase tracking-widest text-ember-700 dark:text-ember-400">
              MealCraft Digital Cookbook Edition
            </div>

            <div className="my-auto py-12 pdf-keep-together">
              {cookbook.coverImage && (
                <div className="mx-auto mb-8 h-56 w-56 overflow-hidden rounded-2xl shadow-2xl border-4 border-white dark:border-night-700">
                  <img src={cookbook.coverImage} alt={cookbook.title} className="h-full w-full object-cover" />
                </div>
              )}
              <h1 className="text-4xl font-extrabold tracking-tight text-ink-900 dark:text-ink-50 sm:text-6xl font-display">
                {cookbook.title}
              </h1>
              {cookbook.description && (
                <p className="mx-auto mt-6 max-w-xl text-lg text-ink-600 dark:text-ink-200 leading-relaxed italic font-serif">
                  "{cookbook.description}"
                </p>
              )}
            </div>

            <div className="border-t border-ink-200 dark:border-night-700 pt-6 pdf-keep-together">
              <div className="text-base font-semibold text-ink-800 dark:text-ink-200">
                Created by {cookbook.author?.name || 'Home Chef'}
              </div>
              <div className="text-xs text-ink-400 dark:text-ink-400 mt-1">Page 1</div>
            </div>
          </div>

          {/* ================= PAGE 2: TABLE OF CONTENTS ================= */}
          <div className="pdf-page-sheet pdf-page-break min-h-[1050px] flex flex-col justify-between rounded-3xl border border-ink-200 bg-paper-50/50 p-8 sm:p-14 dark:border-night-700 dark:bg-night-800 shadow-xl print:shadow-none print:border-0 print:rounded-none">
            <div>
              <div className="border-b-2 border-ember-500 pb-3 mb-8 flex items-center justify-between pdf-keep-together">
                <h2 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-50 font-display">
                  Table of Contents & Page Index
                </h2>
                <span className="text-xs uppercase tracking-widest text-ember-700 font-semibold dark:text-ember-400">
                  Index
                </span>
              </div>

              <div className="space-y-4">
                <div className="pdf-keep-together flex items-baseline justify-between text-sm font-medium text-ink-600 dark:text-ink-300">
                  <span>Cover Page</span>
                  <span className="flex-1 mx-4 border-b border-dotted border-ink-300 dark:border-night-600"></span>
                  <span>Page 1</span>
                </div>

                <div className="pdf-keep-together flex items-baseline justify-between text-sm font-medium text-ink-600 dark:text-ink-300">
                  <span>Table of Contents</span>
                  <span className="flex-1 mx-4 border-b border-dotted border-ink-300 dark:border-night-600"></span>
                  <span>Page 2</span>
                </div>

                {/* Auto-Aligning Recipe Page Index */}
                {calculatedIndex.map((indexItem, idx) => {
                  const Row = isLocked ? 'div' : 'a';
                  const linkProps = isLocked
                    ? {}
                    : { href: `#recipe-page-${idx}`, 'data-target': `#recipe-page-${idx}` };

                  return (
                  <Row
                    key={indexItem.recipeId}
                    {...linkProps}
                    className="pdf-keep-together group flex items-baseline justify-between text-base font-semibold text-ink-900 dark:text-ink-100 hover:text-ember-600 dark:hover:text-ember-400 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-ember-600 dark:text-ember-400 text-xs">{idx + 1}.</span>
                      {indexItem.title}
                      {!indexItem.isPublic && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                          Private Recipe
                        </span>
                      )}
                    </span>
                    <span className="flex-1 mx-4 border-b border-dotted border-ink-300 dark:border-night-600 group-hover:border-ember-400"></span>
                    <span className="text-sm font-bold text-ember-700 dark:text-ember-400 font-mono">
                      <span className="pdf-toc-page-num-screen">
                        Page {indexItem.startPage} {indexItem.pageSpan > 1 ? `- ${indexItem.endPage}` : ''}
                      </span>
                      <span className="pdf-toc-page-num-print hidden" data-target={`#recipe-page-${idx}`}></span>
                    </span>
                  </Row>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 text-center text-xs text-ink-400 dark:text-ink-400 border-t border-ink-200 dark:border-night-700 pt-4 pdf-keep-together">
              Page 2
            </div>
          </div>

          {isLocked && (awaitingAccess ? settlingPanel : purchasePanel)}

          {/* ================= PAGE 3+: DETAILED RECIPE PAGES ================= */}
          {!isLocked && recipesList.map((item, idx) => {
            const recipe = item.recipe || item;
            const indexInfo = calculatedIndex[idx] || {};
            const startPage = indexInfo.startPage || idx + 3;
            const endPage = indexInfo.endPage || startPage;
            const pageSpan = indexInfo.pageSpan || 1;

            return (
              <div
                key={recipe._id || idx}
                id={`recipe-page-${idx}`}
                className="pdf-page-sheet pdf-page-break min-h-[1050px] flex flex-col justify-between rounded-3xl border border-ink-200 bg-white p-8 sm:p-14 dark:border-night-700 dark:bg-night-900 scroll-mt-6 shadow-xl print:shadow-none print:border-0 print:rounded-none"
              >
                <div className="space-y-6">
                  {/* Recipe Header */}
                  <div className="pdf-keep-together border-b border-ink-200 pb-5 dark:border-night-700 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-widest text-ember-600 dark:text-ember-400">
                          Recipe #{idx + 1}
                        </span>
                        {!recipe.isPublic && (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                            Private Cookbook Exclusive
                          </span>
                        )}
                      </div>
                      <h2 className="text-3xl font-bold text-ink-900 dark:text-ink-50 font-display">
                        {recipe.title}
                      </h2>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink-600 dark:text-ink-300">
                      {recipe.time && (
                        <span className="rounded-full bg-paper-100 px-3 py-1 text-ink-800 dark:bg-night-800 dark:text-ink-100 border border-ink-200 dark:border-night-700">
                          ⏱ {recipe.time}
                        </span>
                      )}
                      {recipe.servings && (
                        <span className="rounded-full bg-paper-100 px-3 py-1 text-ink-800 dark:bg-night-800 dark:text-ink-100 border border-ink-200 dark:border-night-700">
                          👥 {recipe.servings} Servings
                        </span>
                      )}
                      {recipe.calories && (
                        <span className="rounded-full bg-paper-100 px-3 py-1 text-ink-800 dark:bg-night-800 dark:text-ink-100 border border-ink-200 dark:border-night-700">
                          🔥 {recipe.calories} kcal
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Recipe Badges (Diets, Meal Types, Regions, Countries, Allergens) */}
                  <div className="pdf-keep-together flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                    {recipe.diets?.map((d) => (
                      <span key={d} className="rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                        🥗 {d}
                      </span>
                    ))}
                    {recipe.mealTypes?.map((m) => (
                      <span key={m} className="rounded-md bg-blue-100 px-2 py-0.5 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                        🍳 {m}
                      </span>
                    ))}
                    {recipe.regions?.map((r) => (
                      <span key={r} className="rounded-md bg-purple-100 px-2 py-0.5 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                        🌍 {r}
                      </span>
                    ))}
                    {recipe.countries?.map((c) => (
                      <span key={c} className="rounded-md bg-indigo-100 px-2 py-0.5 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                        📍 {c}
                      </span>
                    ))}
                    {recipe.allergens?.map((a) => (
                      <span key={a} className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                        ⚠️ Contains {a}
                      </span>
                    ))}

                    {recipe.videoUrl && (
                      <a
                        href={recipe.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors print:hidden"
                      >
                        ▶ Watch Video Tutorial
                      </a>
                    )}
                  </div>

                  {/* Creator Custom Cookbook Notes */}
                  {item.customNotes && (
                    <div className="pdf-keep-together pdf-box-notes rounded-xl border-l-4 border-ember-500 bg-ember-500/10 p-4 text-sm text-ink-800 dark:text-ink-100">
                      <div className="font-bold text-xs uppercase tracking-wider text-ember-700 dark:text-ember-300 mb-1">
                        Chef's Cookbook Note:
                      </div>
                      <p className="italic font-serif">"{item.customNotes}"</p>
                    </div>
                  )}

                  {/* Recipe Image & Ingredients Block */}
                  <div className="grid gap-8 md:grid-cols-12">
                    {recipe.image && (
                      <div className="md:col-span-5 pdf-keep-together">
                        <div className="overflow-hidden rounded-2xl shadow-md aspect-square bg-ink-100 dark:bg-night-800 border border-ink-200 dark:border-night-700">
                          <img
                            src={recipe.image}
                            alt={recipe.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    )}

                    <div className={`${recipe.image ? 'md:col-span-7' : 'md:col-span-12'} pdf-keep-together`}>
                      <h3 className="text-base font-bold uppercase tracking-wider text-ink-900 dark:text-ink-50 mb-3 border-b border-ink-200 dark:border-night-700 pb-1">
                        Ingredients Required
                      </h3>
                      <div className="pdf-box-ingredients whitespace-pre-line text-sm text-ink-900 dark:text-ink-50 leading-relaxed font-mono bg-paper-100/70 dark:bg-night-800 p-4 rounded-xl border border-ink-200 dark:border-night-700 shadow-inner">
                        {recipe.ingredients}
                      </div>
                    </div>
                  </div>

                  {/* Instructions Block */}
                  <div className="pt-2 pdf-keep-together">
                    <h3 className="text-base font-bold uppercase tracking-wider text-ink-900 dark:text-ink-50 mb-3 border-b border-ink-200 dark:border-night-700 pb-1">
                      Preparation & Cooking Instructions
                    </h3>
                    <div className="pdf-box-instructions whitespace-pre-line text-sm text-ink-900 dark:text-ink-50 leading-relaxed bg-paper-50/50 dark:bg-night-800 p-5 rounded-xl border border-ink-200 dark:border-night-700">
                      {recipe.instructions}
                    </div>
                  </div>
                </div>

                {/* Footer Page Number */}
                <div className="mt-12 flex items-center justify-between border-t border-ink-200 dark:border-night-700 pt-4 text-xs text-ink-400 dark:text-ink-400 pdf-keep-together">
                  <span>{cookbook.title} — Recipe #{idx + 1}</span>
                  <span className="font-bold text-ember-700 dark:text-ember-400 font-mono">
                    <span className="pdf-footer-page-num-screen">
                      Page {startPage} {pageSpan > 1 ? `- ${endPage}` : ''}
                    </span>
                    <span className="pdf-footer-page-num-print hidden"></span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
