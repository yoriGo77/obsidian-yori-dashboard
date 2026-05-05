"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function patched(request, parent, ...rest) {
  if (request === "obsidian") return "obsidian-stub";
  return originalResolve.call(this, request, parent, ...rest);
};

const stubExports = {
  Notice: class { constructor(message) { this.message = message; } },
  normalizePath: (path) => (typeof path === "string" ? path.replace(/\\/g, "/") : "")
};
require.cache["obsidian-stub"] = {
  id: "obsidian-stub",
  filename: "obsidian-stub",
  loaded: true,
  exports: stubExports,
  paths: [],
  children: []
};

const archive = require("../lib/archive");

test("sanitizeFileName strips forbidden characters", () => {
  const safe = archive.sanitizeFileName("foo/bar?baz");
  assert.equal(safe, "foo bar baz");
});

test("buildArchiveBody assembles header and sections", () => {
  const body = archive.buildArchiveBody(
    ["Header1", "Header2"],
    [
      { heading: "Day 1", lines: ["- task A", "- task B"] },
      { heading: "Day 2", lines: ["- task C"] }
    ]
  );
  assert.match(body, /Header1\nHeader2/);
  assert.match(body, /## Day 1\n- task A\n- task B/);
  assert.match(body, /## Day 2\n- task C/);
});

test("defaultArchiveDate matches yyyy-MM-dd format", () => {
  const value = archive.defaultArchiveDate(new Date(2026, 4, 5));
  assert.equal(value, "2026-05-05");
});

Module._resolveFilename = originalResolve;
