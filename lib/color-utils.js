"use strict";

function normalizeHex(color) {
  if (!color || typeof color !== "string") return "";
  let c = color.trim().toLowerCase();
  if (!c.startsWith("#")) return c;
  if (c.length === 4) c = `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  return c;
}

function isHexColor(color) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test((color || "").trim());
}

function hexToRgb(hex) {
  const c = normalizeHex(hex);
  if (!isHexColor(c)) return null;
  const value = c.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function withAlpha(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const a = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

function lighten(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const blend = Math.max(0, Math.min(1, amount || 0));
  const r = Math.round(rgb.r + (255 - rgb.r) * blend);
  const g = Math.round(rgb.g + (255 - rgb.g) * blend);
  const b = Math.round(rgb.b + (255 - rgb.b) * blend);
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

module.exports = {
  normalizeHex,
  isHexColor,
  hexToRgb,
  withAlpha,
  lighten
};
