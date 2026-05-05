"use strict";

function setIconSafe(el, name) {
  if (!el || !name) return false;
  try {
    const obsidian = require("obsidian");
    if (typeof obsidian.setIcon === "function") {
      obsidian.setIcon(el, name);
      return true;
    }
  } catch (_err) {}
  return false;
}

function ensureFocusInput(input) {
  if (!input) return;
  requestAnimationFrame(() => {
    try {
      input.focus();
      input.select?.();
    } catch (_err) {}
  });
}

function fitTextarea(textarea, minHeight) {
  if (!textarea) return;
  const min = Number.isFinite(minHeight) ? minHeight : 32;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.max(min, textarea.scrollHeight)}px`;
}

function emptyEl(el) {
  while (el && el.firstChild) el.removeChild(el.firstChild);
}

function createIconButton(parent, icon, options) {
  const opts = options || {};
  const btn = parent.createEl("button", {
    cls: ["yd-icon-btn", opts.cls].filter(Boolean).join(" "),
    attr: { type: "button" }
  });
  if (opts.label) {
    btn.setAttribute("aria-label", opts.label);
    btn.setAttribute("title", opts.label);
  }
  const ok = setIconSafe(btn, icon);
  if (!ok || btn.childElementCount === 0) {
    btn.setText(opts.fallback || "");
  }
  if (typeof opts.onClick === "function") {
    btn.addEventListener("click", (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      opts.onClick(evt);
    });
  }
  return btn;
}

function attachOutsideClose(target, handler) {
  if (!target) return null;
  const listener = (evt) => {
    if (!target.isConnected) {
      document.removeEventListener("mousedown", listener, true);
      return;
    }
    if (target.contains(evt.target)) return;
    handler(evt);
  };
  document.addEventListener("mousedown", listener, true);
  return () => document.removeEventListener("mousedown", listener, true);
}

module.exports = {
  setIconSafe,
  ensureFocusInput,
  fitTextarea,
  emptyEl,
  createIconButton,
  attachOutsideClose
};
