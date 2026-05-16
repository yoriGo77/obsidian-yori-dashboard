"use strict";

/**
 * UTF-8-safe theme scope patch for styles.css (avoid editor replace mangling CJK).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const cssPath = path.join(root, "styles.css");

const OLD_LIGHT = `/*
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

const NEW_LIGHT = `/*
 * Obsidian themes often style .view-content and buttons with high specificity.
 * Use body + .yd-dashboard-host, .workspace-leaf-content .view-content.yd-dashboard-host,
 * and legacy .workspace-leaf-content .yd-dashboard-host .yd-view-content chains (higher specificity).
 */
body .yd-dashboard-host,
body .yd-dashboard-host .yd-view-content,
body .workspace-leaf-content .view-content.yd-dashboard-host,
body .workspace-leaf-content .view-content.yd-dashboard-host .yd-view-content,
.workspace-leaf-content .yd-dashboard-host .yd-view-content {
  background-color: #f8f7f6;
}

body .yd-dashboard-host .yd-root,
body .workspace-leaf-content .view-content.yd-dashboard-host .yd-root,
.workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-root {
  background-color: transparent;
  color: var(--yd-text);
}

body .yd-dashboard-host .yd-section,
body .workspace-leaf-content .view-content.yd-dashboard-host .yd-section,
.workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-section {
  background-color: var(--yd-section-bg);
  color: var(--yd-text);
  border: 1px solid var(--yd-section-border);
}

body .yd-dashboard-host button.yd-add-button,
body .workspace-leaf-content .view-content.yd-dashboard-host button.yd-add-button,
.workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-add-button {
  -webkit-appearance: none;
  appearance: none;
  background-image: none;
  background: transparent;
  border: none;
  border-width: 0;
  color: var(--yd-add-color);
  box-shadow: none;
  font-family: inherit;
}

body .yd-dashboard-host button.yd-add-button:hover,
body .workspace-leaf-content .view-content.yd-dashboard-host button.yd-add-button:hover,
.workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-add-button:hover {
  color: #b9bb7e;
  background: transparent;
  box-shadow: none;
}

body .yd-dashboard-host button.yd-checkin-btn,
body .workspace-leaf-content .view-content.yd-dashboard-host button.yd-checkin-btn,
.workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-checkin-btn {
  -webkit-appearance: none;
  appearance: none;
  background-image: none;
  box-shadow: none;
  font-family: inherit;
}

body .yd-dashboard-host button.yd-quick-button,
body .workspace-leaf-content .view-content.yd-dashboard-host button.yd-quick-button,
.workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-quick-button {
  -webkit-appearance: none;
  appearance: none;
  background-image: none;
  border: 1px solid var(--yd-border);
  background-color: transparent;
  color: var(--yd-text);
  box-shadow: none;
  font-family: inherit;
}

body .yd-dashboard-host button.yd-quick-add,
body .workspace-leaf-content .view-content.yd-dashboard-host button.yd-quick-add,
.workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-quick-add {
  -webkit-appearance: none;
  appearance: none;
  background-image: none;
  border: 1px dashed var(--yd-add-color);
  background: transparent;
  color: var(--yd-add-color);
  box-shadow: none;
  font-family: inherit;
}

body .yd-dashboard-host .yd-icon-btn,
body .yd-dashboard-host .yd-section-more-icon,
body .yd-dashboard-host .yd-mini-arrow,
body .workspace-leaf-content .view-content.yd-dashboard-host .yd-icon-btn,
body .workspace-leaf-content .view-content.yd-dashboard-host .yd-section-more-icon,
body .workspace-leaf-content .view-content.yd-dashboard-host .yd-mini-arrow,
.workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-icon-btn,
.workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-section-more-icon,
.workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-mini-arrow {
  -webkit-appearance: none;
  appearance: none;
  background-image: none;
  box-shadow: none;
  font-family: inherit;
}

body .yd-dashboard-host .yd-event-editor,
body .yd-dashboard-host .yd-inline-input,
body .workspace-leaf-content .view-content.yd-dashboard-host .yd-event-editor,
body .workspace-leaf-content .view-content.yd-dashboard-host .yd-inline-input,
.workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-event-editor,
.workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-inline-input {
  background-color: #ffffff;
  color: var(--yd-text);
  font-family: inherit;
}

body .yd-dashboard-host .yd-select,
body .workspace-leaf-content .view-content.yd-dashboard-host .yd-select,
.workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-select {
  background-color: transparent;
  color: var(--yd-text);
  font-family: inherit;
}
`;

const OLD_DARK = `.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content {
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
`;

const NEW_DARK = `body.theme-dark .yd-dashboard-host,
body.theme-dark .yd-dashboard-host .yd-view-content,
body.theme-dark .workspace-leaf-content .view-content.yd-dashboard-host,
body.theme-dark .workspace-leaf-content .view-content.yd-dashboard-host .yd-view-content,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content {
  background-color: #1c1b19;
}

body.theme-dark .yd-dashboard-host .yd-root,
body.theme-dark .workspace-leaf-content .view-content.yd-dashboard-host .yd-root,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-root {
  background-color: transparent;
  color: var(--yd-text);
}

body.theme-dark .yd-dashboard-host .yd-section,
body.theme-dark .workspace-leaf-content .view-content.yd-dashboard-host .yd-section,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-section {
  background-color: var(--yd-section-bg);
  color: var(--yd-text);
  border: 1px solid var(--yd-section-border);
}

body.theme-dark .yd-dashboard-host button.yd-add-button,
body.theme-dark .workspace-leaf-content .view-content.yd-dashboard-host button.yd-add-button,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-add-button {
  -webkit-appearance: none;
  appearance: none;
  background-image: none;
  background: transparent;
  border: none;
  border-width: 0;
  color: var(--yd-add-color);
  box-shadow: none;
  font-family: inherit;
}

body.theme-dark .yd-dashboard-host button.yd-add-button:hover,
body.theme-dark .workspace-leaf-content .view-content.yd-dashboard-host button.yd-add-button:hover,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-add-button:hover {
  color: #b9bb7e;
  background: transparent;
  box-shadow: none;
}

body.theme-dark .yd-dashboard-host button.yd-checkin-btn,
body.theme-dark .workspace-leaf-content .view-content.yd-dashboard-host button.yd-checkin-btn,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-checkin-btn {
  -webkit-appearance: none;
  appearance: none;
  background-image: none;
  box-shadow: none;
  font-family: inherit;
}

body.theme-dark .yd-dashboard-host button.yd-quick-button,
body.theme-dark .workspace-leaf-content .view-content.yd-dashboard-host button.yd-quick-button,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-quick-button {
  -webkit-appearance: none;
  appearance: none;
  background-image: none;
  border: 1px solid var(--yd-border);
  background-color: transparent;
  color: var(--yd-text);
  box-shadow: none;
  font-family: inherit;
}

body.theme-dark .yd-dashboard-host button.yd-quick-add,
body.theme-dark .workspace-leaf-content .view-content.yd-dashboard-host button.yd-quick-add,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content button.yd-quick-add {
  -webkit-appearance: none;
  appearance: none;
  background-image: none;
  border: 1px dashed var(--yd-add-color);
  background: transparent;
  color: var(--yd-add-color);
  box-shadow: none;
  font-family: inherit;
}

body.theme-dark .yd-dashboard-host .yd-icon-btn,
body.theme-dark .yd-dashboard-host .yd-section-more-icon,
body.theme-dark .yd-dashboard-host .yd-mini-arrow,
body.theme-dark .workspace-leaf-content .view-content.yd-dashboard-host .yd-icon-btn,
body.theme-dark .workspace-leaf-content .view-content.yd-dashboard-host .yd-section-more-icon,
body.theme-dark .workspace-leaf-content .view-content.yd-dashboard-host .yd-mini-arrow,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-icon-btn,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-section-more-icon,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-mini-arrow {
  -webkit-appearance: none;
  appearance: none;
  background-image: none;
  box-shadow: none;
  font-family: inherit;
}

body.theme-dark .yd-dashboard-host .yd-event-editor,
body.theme-dark .yd-dashboard-host .yd-inline-input,
body.theme-dark .workspace-leaf-content .view-content.yd-dashboard-host .yd-event-editor,
body.theme-dark .workspace-leaf-content .view-content.yd-dashboard-host .yd-inline-input,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-event-editor,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-inline-input {
  background-color: #2f2c26;
  color: var(--yd-text);
  font-family: inherit;
  border-color: rgba(255, 255, 255, 0.1);
}

body.theme-dark .yd-dashboard-host .yd-select,
body.theme-dark .workspace-leaf-content .view-content.yd-dashboard-host .yd-select,
.theme-dark .workspace-leaf-content .yd-dashboard-host .yd-view-content .yd-select {
  background-color: transparent;
  color: var(--yd-text);
  font-family: inherit;
}
`;

let s = fs.readFileSync(cssPath, "utf8");
const eol = s.includes("\r\n") ? "\r\n" : "\n";
s = s.replace(/\r\n/g, "\n");

const alreadyPatched =
	s.includes("body .workspace-leaf-content .view-content.yd-dashboard-host button.yd-add-button") &&
	s.includes("-webkit-appearance: none");

if (alreadyPatched) {
	console.log("styles.css: theme scope already strengthened; nothing to do.");
	process.exit(0);
}


if (!s.includes(OLD_LIGHT)) {
	console.error("apply-theme-scope-utf8: OLD_LIGHT block not found (already patched?)");
	process.exit(1);
}
s = s.replace(OLD_LIGHT, NEW_LIGHT);

if (!s.includes(OLD_DARK)) {
	console.error("apply-theme-scope-utf8: OLD_DARK block not found");
	process.exit(1);
}
s = s.replace(OLD_DARK, NEW_DARK);

if (!s.includes("华文细黑")) {
	console.error("UTF-8 check failed: 华文细黑 missing after patch");
	process.exit(1);
}

if (eol === "\r\n") {
	s = s.replace(/\n/g, "\r\n");
}

fs.writeFileSync(cssPath, s, "utf8");
console.log("Patched theme scope in styles.css (UTF-8 OK)");
