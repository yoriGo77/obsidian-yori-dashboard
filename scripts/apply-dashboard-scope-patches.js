"use strict";

/**
 * Apply theme-scope CSS patches using UTF-8 string ops only.
 * Do not use editor patch tools on styles.css (breaks CJK on Windows).
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "styles.css");

const buf = execFileSync("git", ["show", "origin/main:styles.css"], { cwd: root });
let s = buf.toString("utf8");

const INSERT_BEFORE_YD_ROOT = `\
.yd-view-content::-webkit-scrollbar-track {
  background: transparent;
}

/*
 * Obsidian themes often style .view-content and buttons with high specificity.
 * Scoped rules restore dashboard visuals without !important.
 */
.workspace-leaf-content .yd-dashboard-host .yd-view-content {
  background-color: #f8f7f6;
}

.workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-root {
  background-color: transparent;
  color: var(--yd-text);
}

.workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-section {
  background-color: var(--yd-section-bg);
  color: var(--yd-text);
  border: 1px solid var(--yd-section-border);
}

.workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-add-button {
  background: transparent;
  border: none;
  border-width: 0;
  color: var(--yd-add-color);
  box-shadow: none;
  font-family: inherit;
}

.workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-add-button:hover {
  color: #b9bb7e;
  background: transparent;
}

.workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-checkin-btn {
  box-shadow: none;
  font-family: inherit;
}

.workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-quick-button {
  border: 1px solid var(--yd-border);
  background-color: transparent;
  color: var(--yd-text);
  box-shadow: none;
  font-family: inherit;
}

.workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-quick-add {
  border: 1px dashed var(--yd-add-color);
  background: transparent;
  color: var(--yd-add-color);
  box-shadow: none;
  font-family: inherit;
}

.workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-icon-btn,
.workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-section-more-icon,
.workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-mini-arrow {
  box-shadow: none;
  font-family: inherit;
}

.workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-event-editor,
.workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-inline-input {
  background-color: #ffffff;
  color: var(--yd-text);
  font-family: inherit;
}

.workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-select {
  background-color: transparent;
  color: var(--yd-text);
  font-family: inherit;
}

`;

const NEEDLE_START = `.yd-view-content::-webkit-scrollbar-track {
  background: transparent;
}

.yd-root {
`;

if (!s.includes(NEEDLE_START)) {
	console.error("Unexpected styles.css layout: missing scrollbar track + .yd-root anchor");
	process.exit(1);
}

if (s.includes(".workspace-leaf-content .yd-dashboard-host .yd-view-content {")) {
	console.log("Scope patches already present; skipping.");
} else {
	s = s.replace(NEEDLE_START, INSERT_BEFORE_YD_ROOT + `.yd-root {
`);
}

const MODAL_ANCHOR = `.yd-fullpage-modal .yd-add-button:hover {
  color: #b9bb7e;
}

.yd-fullpage-content {
`;

const MODAL_PATCH = `.yd-fullpage-modal .yd-add-button:hover {
  color: #b9bb7e;
}

body .yd-fullpage-modal button.yd-add-button {
  background: transparent;
  border: none;
  box-shadow: none;
  font-family: inherit;
  color: var(--yd-add-color, #cecf96);
}

body .yd-fullpage-modal button.yd-add-button:hover {
  color: #b9bb7e;
  background: transparent;
}

.yd-fullpage-content {
`;

if (!s.includes("body .yd-fullpage-modal button.yd-add-button")) {
	if (!s.includes(MODAL_ANCHOR)) {
		console.error("Missing modal add-button anchor");
		process.exit(1);
	}
	s = s.replace(MODAL_ANCHOR, MODAL_PATCH);
}

const DARK_ANCHOR = `.theme-dark .yd-dashboard-host .yd-view-content {
  background-color: #1c1b19;
}

.theme-dark .yd-root {
`;

const DARK_PATCH = `.theme-dark .yd-dashboard-host .yd-view-content {
  background-color: #1c1b19;
}

.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content {
  background-color: #1c1b19;
}

.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-root {
  background-color: transparent;
  color: var(--yd-text);
}

.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-section {
  background-color: var(--yd-section-bg);
  color: var(--yd-text);
  border: 1px solid var(--yd-section-border);
}

.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-add-button {
  background: transparent;
  border: none;
  border-width: 0;
  color: var(--yd-add-color);
  box-shadow: none;
  font-family: inherit;
}

.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-add-button:hover {
  color: #b9bb7e;
  background: transparent;
}

.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-checkin-btn {
  box-shadow: none;
  font-family: inherit;
}

.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-quick-button {
  border: 1px solid var(--yd-border);
  background-color: transparent;
  color: var(--yd-text);
  box-shadow: none;
  font-family: inherit;
}

.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-quick-add {
  border: 1px dashed var(--yd-add-color);
  background: transparent;
  color: var(--yd-add-color);
  box-shadow: none;
  font-family: inherit;
}

.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-icon-btn,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-section-more-icon,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-mini-arrow {
  box-shadow: none;
  font-family: inherit;
}

.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-event-editor,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-inline-input {
  background-color: #2f2c26;
  color: var(--yd-text);
  font-family: inherit;
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-select {
  background-color: transparent;
  color: var(--yd-text);
  font-family: inherit;
}

.theme-dark .yd-root {
`;

if (!s.includes(".theme-dark .workspace-leaf-content .yd-dashboard-host")) {
	if (!s.includes(DARK_ANCHOR)) {
		console.error("Missing dark mode anchor");
		process.exit(1);
	}
	s = s.replace(DARK_ANCHOR, DARK_PATCH);
}

fs.writeFileSync(out, s, "utf8");
if (!s.includes("华文细黑")) {
	console.error("UTF-8 check failed: 华文细黑 missing");
	process.exit(1);
}
console.log("Patched", path.relative(root, out));
