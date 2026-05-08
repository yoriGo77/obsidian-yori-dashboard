"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { searchMarkdownNotes } = require("../lib/note-search");

class MockFile {
  constructor(path) {
    this.path = path;
    this.name = path.split("/").pop() || path;
    this.basename = this.name.replace(/\.md$/i, "");
  }
}

test("searchMarkdownNotes matches title / basename substring", async () => {
  const files = [new MockFile("alpha/foo-note.md"), new MockFile("beta/bar.md")];
  const app = {
    vault: {
      getMarkdownFiles: () => files,
      read: async () => ""
    },
    metadataCache: { getFileCache: () => null }
  };
  const r = await searchMarkdownNotes(app, "foo", 10);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].file.path, "alpha/foo-note.md");
});

test("searchMarkdownNotes matches inline tags when no title hit", async () => {
  const files = [new MockFile("x/a.md")];
  const app = {
    vault: {
      getMarkdownFiles: () => files,
      read: async () => "no match here"
    },
    metadataCache: {
      getFileCache: () => ({
        tags: [{ tag: "#fitness", position: { start: 0, end: 1 } }]
      })
    }
  };
  const r = await searchMarkdownNotes(app, "fitness", 10);
  assert.strictEqual(r.length, 1);
});

test("searchMarkdownNotes matches note body", async () => {
  const files = [new MockFile("x/y.md")];
  const app = {
    vault: {
      getMarkdownFiles: () => files,
      read: async () => "Some unique needle phrase in note body."
    },
    metadataCache: { getFileCache: () => null }
  };
  const r = await searchMarkdownNotes(app, "needle", 10);
  assert.strictEqual(r.length, 1);
  assert.ok(r[0].display.includes("needle"));
});

test("searchMarkdownNotes respects maxResults", async () => {
  const files = [
    new MockFile("d/1.md"),
    new MockFile("d/2.md"),
    new MockFile("d/3.md")
  ];
  const app = {
    vault: {
      getMarkdownFiles: () => files,
      read: async () => "all have this querytext inside"
    },
    metadataCache: { getFileCache: () => null }
  };
  const r = await searchMarkdownNotes(app, "querytext", 2);
  assert.strictEqual(r.length, 2);
});
