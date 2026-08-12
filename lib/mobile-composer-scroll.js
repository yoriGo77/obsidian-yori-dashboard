"use strict";

const { Platform } = require("obsidian");

const MOBILE_PANEL_KB_CLASS = "yd-mobile-panel--keyboard-composer";
const FULLPAGE_KB_CLASS = "yd-fullpage-content--keyboard-composer";

function findScrollableAncestor(start) {
  let n = start && start.parentElement;
  while (n && n !== document.documentElement) {
    const st = window.getComputedStyle(n);
    if (
      /(auto|scroll|overlay)/.test(st.overflowY) &&
      n.scrollHeight > n.clientHeight + 4
    ) {
      return n;
    }
    n = n.parentElement;
  }
  return null;
}

/**
 * Mobile only: reserve scroll room + keep composer above software keyboard.
 * Single-pass alignment (no scroll-into-max + second nudge).
 * @param {HTMLElement} wrap Composer root
 * @param {HTMLElement[]} focusEls Elements that may receive focus (textarea, inputs, select)
 * @returns {() => void} cleanup
 */
function attachMobilePanelKeyboardScroll(wrap, focusEls) {
  if (!Platform?.isMobile || typeof window === "undefined" || !wrap) {
    return () => {};
  }
  const panel = wrap.closest(".yd-mobile-panel");
  const fullpage = wrap.closest(".yd-fullpage-content");
  const scrollEl =
    panel ||
    fullpage ||
    findScrollableAncestor(wrap) ||
    wrap.closest(".modal");

  if (!scrollEl) return () => {};

  if (panel) panel.classList.add(MOBILE_PANEL_KB_CLASS);
  else if (fullpage) fullpage.classList.add(FULLPAGE_KB_CLASS);

  // Android: the app container is already resized above the keyboard, yet the view
  // container still gets a keyboard-sized bottom padding, collapsing our layout to a
  // sliver. Neutralise it for our own view, which manages keyboard scrolling itself.
  const viewEl = wrap.closest(".yd-view-content--mobile");
  const prevViewPad = viewEl ? viewEl.style.paddingBottom : "";
  const dropViewKeyboardPad = () => {
    if (viewEl && viewEl.style.paddingBottom !== "0px") viewEl.style.paddingBottom = "0px";
  };

  const usesVar = !!(panel || fullpage);
  const basePad = usesVar
    ? 0
    : parseFloat(window.getComputedStyle(scrollEl).paddingBottom) || 0;

  /** Extra scroll room reserved below the composer, grown only when needed. */
  let extra = 0;
  const setExtra = (px) => {
    const next = Math.max(0, Math.round(px));
    if (next === extra) return;
    extra = next;
    if (usesVar) scrollEl.style.setProperty("--yd-kb-extra", `${next}px`);
    else scrollEl.style.paddingBottom = `${basePad + next}px`;
  };

  const els = (focusEls || []).filter((e) => e && typeof e.getBoundingClientRect === "function");

  let vvDebounce = null;
  const align = () => {
    if (!wrap.isConnected) return;
    dropViewKeyboardPad();
    const vv = window.visualViewport;
    // The visual viewport does not report the keyboard on Android/Obsidian, so the
    // scroller's own bottom edge is the boundary that actually matters there.
    const vvBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    const viewBottom = Math.min(vvBottom, scrollEl.getBoundingClientRect().bottom);
    const pad = 18;
    let bottom = wrap.getBoundingClientRect().bottom;
    for (const el of els) {
      bottom = Math.max(bottom, el.getBoundingClientRect().bottom);
    }
    const overflow = bottom - (viewBottom - pad);
    if (overflow <= 0) {
      // Composer already clear of the keyboard: give back the room it no longer needs,
      // capped by the slack so the composer cannot be pushed back down.
      if (extra > 0) setExtra(extra + overflow);
      return;
    }
    const room = scrollEl.scrollHeight - scrollEl.clientHeight - scrollEl.scrollTop;
    if (room < overflow) setExtra(extra + (overflow - room));
    scrollEl.scrollTop += overflow;
  };

  const onVv = () => {
    if (vvDebounce) clearTimeout(vvDebounce);
    vvDebounce = setTimeout(() => {
      vvDebounce = null;
      requestAnimationFrame(align);
    }, 100);
  };

  const onFocus = () => {
    requestAnimationFrame(align);
    setTimeout(align, 320);
  };

  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener("resize", onVv);
    vv.addEventListener("scroll", onVv);
  }
  for (const el of els) {
    el.addEventListener("focus", onFocus);
  }

  // On Android the keyboard shows up as a container resize, not a viewport event.
  let ro = null;
  if (typeof ResizeObserver === "function") {
    ro = new ResizeObserver(() => requestAnimationFrame(align));
    if (viewEl) ro.observe(viewEl);
    const appEl = document.querySelector(".app-container");
    if (appEl) ro.observe(appEl);
  }

  requestAnimationFrame(align);
  const settleTimers = [280, 600, 1000].map((ms) => setTimeout(align, ms));

  return () => {
    if (vv) {
      vv.removeEventListener("resize", onVv);
      vv.removeEventListener("scroll", onVv);
    }
    if (vvDebounce) clearTimeout(vvDebounce);
    for (const timer of settleTimers) clearTimeout(timer);
    if (ro) ro.disconnect();
    for (const el of els) {
      el.removeEventListener("focus", onFocus);
    }
    if (usesVar) scrollEl.style.removeProperty("--yd-kb-extra");
    else if (extra) scrollEl.style.paddingBottom = "";
    if (viewEl) viewEl.style.paddingBottom = prevViewPad;
    if (panel) panel.classList.remove(MOBILE_PANEL_KB_CLASS);
    else if (fullpage) fullpage.classList.remove(FULLPAGE_KB_CLASS);
  };
}

/**
 * View-wide guard for the Android keyboard inset.
 *
 * The app container is already resized to sit above the keyboard, yet the view container
 * additionally receives a keyboard-sized bottom padding, which collapses the dashboard to
 * a sliver. Applies to every input in the view, including ones without their own composer
 * scroll handler.
 * @param {HTMLElement} host The `.yd-view-content--mobile` element
 * @returns {() => void} cleanup
 */
function attachMobileViewKeyboardGuard(host) {
  if (!Platform?.isMobile || typeof window === "undefined" || !host) {
    return () => {};
  }
  const restore = host.style.paddingBottom;
  let guarding = false;
  const drop = () => {
    if (!guarding) return;
    if (host.style.paddingBottom !== "0px") host.style.paddingBottom = "0px";
  };
  const isField = (el) =>
    el instanceof Element && el.matches("input:not([type=checkbox]), textarea, select");
  const onFocusIn = (e) => {
    if (!isField(e.target)) return;
    guarding = true;
    drop();
  };
  const onFocusOut = () => {
    window.setTimeout(() => {
      if (isField(document.activeElement) && host.contains(document.activeElement)) return;
      guarding = false;
      host.style.paddingBottom = restore;
    }, 50);
  };
  host.addEventListener("focusin", onFocusIn);
  host.addEventListener("focusout", onFocusOut);
  let ro = null;
  if (typeof ResizeObserver === "function") {
    ro = new ResizeObserver(() => drop());
    ro.observe(host);
    const appEl = document.querySelector(".app-container");
    if (appEl) ro.observe(appEl);
  }
  return () => {
    host.removeEventListener("focusin", onFocusIn);
    host.removeEventListener("focusout", onFocusOut);
    if (ro) ro.disconnect();
    host.style.paddingBottom = restore;
  };
}

/**
 * Full-page modal: delegated focusin on inputs so re-rendered settings rows still get keyboard scroll.
 * Stores cleanup on `modal._ydFullpageInputKbCleanup` (replaces previous).
 */
function attachMobileFullpageDelegatedInputScroll(contentRoot, modal, selector) {
  if (!Platform?.isMobile || typeof window === "undefined" || !contentRoot || !modal) {
    return () => {};
  }
  const sel = selector || ".yd-settings-input";
  let scrollDispose = () => {};
  const onFocusIn = (e) => {
    const t = e.target;
    if (!(t instanceof Element) || !contentRoot.contains(t) || !t.matches(sel)) return;
    scrollDispose();
    const wrap =
      t.closest(".yd-quick-settings-row") ||
      t.closest(".yd-settings-row") ||
      contentRoot;
    scrollDispose = attachMobilePanelKeyboardScroll(wrap, [t]);
  };
  contentRoot.addEventListener("focusin", onFocusIn);
  const cleanup = () => {
    contentRoot.removeEventListener("focusin", onFocusIn);
    scrollDispose();
    scrollDispose = () => {};
  };
  const prev = modal._ydFullpageInputKbCleanup;
  if (typeof prev === "function") prev();
  modal._ydFullpageInputKbCleanup = cleanup;
  return cleanup;
}

module.exports = {
  attachMobilePanelKeyboardScroll,
  attachMobileViewKeyboardGuard,
  attachMobileFullpageDelegatedInputScroll,
  MOBILE_PANEL_KB_CLASS,
  FULLPAGE_KB_CLASS
};
