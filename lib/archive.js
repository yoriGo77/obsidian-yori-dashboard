"use strict";

const obsidian = require("obsidian");
const { Notice, normalizePath } = obsidian;
const { formatDateKey } = require("./date-utils");

function sanitizeFolder(folder) {
  if (!folder || typeof folder !== "string") return "";
  return folder
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

function sanitizeFileName(name) {
  if (!name || typeof name !== "string") return "Untitled";
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Untitled";
}

async function ensureFolder(app, folder) {
  const normalized = sanitizeFolder(folder);
  if (!normalized) return "";
  const target = normalizePath(normalized);
  const existing = app.vault.getAbstractFileByPath(target);
  if (existing) return target;
  try {
    await app.vault.createFolder(target);
  } catch (err) {
    if (!`${err}`.includes("already exists")) {
      console.warn("[Yori Dashboard] failed to create archive folder", err);
    }
  }
  return target;
}

async function buildUniquePath(app, folder, baseName) {
  const safeName = sanitizeFileName(baseName);
  const folderPath = sanitizeFolder(folder);
  let candidate = folderPath ? `${folderPath}/${safeName}.md` : `${safeName}.md`;
  candidate = normalizePath(candidate);
  if (!app.vault.getAbstractFileByPath(candidate)) return candidate;
  let counter = 1;
  while (counter < 100) {
    const next = folderPath
      ? `${folderPath}/${safeName} (${counter}).md`
      : `${safeName} (${counter}).md`;
    const nextPath = normalizePath(next);
    if (!app.vault.getAbstractFileByPath(nextPath)) return nextPath;
    counter += 1;
  }
  return normalizePath(folderPath ? `${folderPath}/${safeName}-${Date.now()}.md` : `${safeName}-${Date.now()}.md`);
}

async function createArchiveNote(app, options) {
  const folder = sanitizeFolder(options?.folder || "");
  if (folder) await ensureFolder(app, folder);
  const path = await buildUniquePath(app, folder, options?.fileName || "Archive");
  const body = typeof options?.content === "string" ? options.content : "";
  const file = await app.vault.create(path, body);
  if (options?.openOnCreate !== false) {
    try {
      await app.workspace.openLinkText(file.path, "/", true);
    } catch (_err) {}
  }
  if (options?.notice !== false) {
    new Notice(options?.noticeText || `Archive created: ${file.path}`);
  }
  return file;
}

function buildArchiveBody(headerLines, sections) {
  const lines = [];
  if (Array.isArray(headerLines)) {
    headerLines.forEach((line) => {
      if (line) lines.push(line);
    });
    if (lines.length) lines.push("");
  }
  if (Array.isArray(sections)) {
    sections.forEach((section, idx) => {
      if (!section) return;
      if (section.heading) lines.push(`## ${section.heading}`);
      if (Array.isArray(section.lines)) {
        section.lines.forEach((line) => {
          if (line === undefined || line === null) return;
          lines.push(`${line}`);
        });
      } else if (typeof section.body === "string") {
        lines.push(section.body);
      }
      if (idx !== sections.length - 1) lines.push("");
    });
  }
  return lines.join("\n");
}

function defaultArchiveDate(date) {
  return formatDateKey(date || new Date());
}

module.exports = {
  ensureFolder,
  buildUniquePath,
  createArchiveNote,
  buildArchiveBody,
  defaultArchiveDate,
  sanitizeFileName
};
