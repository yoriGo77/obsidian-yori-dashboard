"use strict";

function normalizeQueryTag(s) {
  return `${s || ""}`.replace(/^#/, "").trim().toLowerCase();
}

function fileTagSet(metadataCache, file) {
  const set = new Set();
  const cache = metadataCache.getFileCache(file);
  if (!cache) return set;
  if (Array.isArray(cache.tags)) {
    for (const entry of cache.tags) {
      if (entry && entry.tag) set.add(normalizeQueryTag(entry.tag));
    }
  }
  const fm = cache.frontmatter?.tags;
  if (Array.isArray(fm)) {
    for (const x of fm) {
      if (typeof x === "string") set.add(normalizeQueryTag(x));
    }
  } else if (typeof fm === "string") {
    set.add(normalizeQueryTag(fm));
  }
  return set;
}

function snippetAround(body, qLower) {
  const lower = (body || "").toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx < 0) return "";
  const start = Math.max(0, idx - 28);
  const slice = body.slice(start, start + 120).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${slice}${start + 120 < body.length ? "…" : ""}`;
}

/**
 * @param {import("obsidian").App} app
 * @param {string} rawQuery
 * @param {number} [maxResults]
 * @returns {Promise<Array<{ file: import("obsidian").TFile, display: string }>>}
 */
async function searchMarkdownNotes(app, rawQuery, maxResults) {
  const cap = Number.isFinite(maxResults) ? maxResults : 40;
  const q = `${rawQuery || ""}`.trim().toLowerCase();
  if (!q) return [];
  const files = app.vault.getMarkdownFiles();
  const picked = [];
  const seen = new Set();
  const tagNeedle = q.startsWith("#") ? normalizeQueryTag(q) : null;
  const tagOnly = tagNeedle !== null && tagNeedle.length > 0;

  for (const file of files) {
    if (picked.length >= cap) break;
    const baseName =
      typeof file.basename === "string"
        ? file.basename
        : (file.name || file.path.split("/").pop() || "");
    const baseLower = baseName.toLowerCase();
    let hit = baseLower.includes(q);
    let display = hit ? baseName : "";

    if (!hit) {
      const tags = fileTagSet(app.metadataCache, file);
      for (const tag of tags) {
        if (tagOnly) {
          if (tag === tagNeedle || tag.endsWith(`/${tagNeedle}`)) {
            hit = true;
            display = `#${tag}`;
            break;
          }
        } else if (tag.includes(q)) {
          hit = true;
          display = `#${tag}`;
          break;
        }
      }
    }

    if (!hit && typeof app.vault?.read === "function") {
      try {
        const body = await app.vault.read(file);
        const sn = snippetAround(body, q);
        if (sn) {
          hit = true;
          display = sn;
        }
      } catch (_e) {}
    }

    if (hit && !seen.has(file.path)) {
      seen.add(file.path);
      picked.push({ file, display: display || baseName });
    }
  }
  return picked;
}

module.exports = { searchMarkdownNotes, fileTagSet, normalizeQueryTag };
