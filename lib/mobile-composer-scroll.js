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

  const els = (focusEls || []).filter((e) => e && typeof e.getBoundingClientRect === "function");

  let vvDebounce = null;
  const align = () => {
    if (!wrap.isConnected) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const viewBottom = vv.offsetTop + vv.height;
    const pad = 18;
    let bottom = wrap.getBoundingClientRect().bottom;
    for (const el of els) {
      bottom = Math.max(bottom, el.getBoundingClientRect().bottom);
    }
    if (bottom <= viewBottom - pad) return;
    scrollEl.scrollTop += bottom - viewBottom + pad;
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
  requestAnimationFrame(align);
  setTimeout(align, 280);

  return () => {
    if (vv) {
      vv.removeEventListener("resize", onVv);
      vv.removeEventListener("scroll", onVv);
    }
    if (vvDebounce) clearTimeout(vvDebounce);
    for (const el of els) {
      el.removeEventListener("focus", onFocus);
    }
    if (panel) panel.classList.remove(MOBILE_PANEL_KB_CLASS);
    else if (fullpage) fullpage.classList.remove(FULLPAGE_KB_CLASS);
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
  attachMobileFullpageDelegatedInputScroll,
  MOBILE_PANEL_KB_CLASS,
  FULLPAGE_KB_CLASS
};
