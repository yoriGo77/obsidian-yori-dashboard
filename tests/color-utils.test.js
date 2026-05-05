"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const colorUtils = require("../lib/color-utils");

test("normalizeHex expands shorthand hex", () => {
  assert.equal(colorUtils.normalizeHex("#abc"), "#aabbcc");
  assert.equal(colorUtils.normalizeHex("#ABCDEF"), "#abcdef");
  assert.equal(colorUtils.normalizeHex(""), "");
});

test("isHexColor recognises valid hex strings", () => {
  assert.equal(colorUtils.isHexColor("#abc"), true);
  assert.equal(colorUtils.isHexColor("#abcdef"), true);
  assert.equal(colorUtils.isHexColor("blue"), false);
  assert.equal(colorUtils.isHexColor("#ggg"), false);
});

test("withAlpha returns rgba string", () => {
  assert.equal(colorUtils.withAlpha("#ffffff", 0.5), "rgba(255, 255, 255, 0.5)");
});

test("lighten blends towards white", () => {
  const lighter = colorUtils.lighten("#000000", 0.5);
  assert.equal(lighter, "#808080");
});
