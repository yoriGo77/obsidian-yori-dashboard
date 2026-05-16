/**
 * Regenerate styles.css from git HEAD (UTF-8) and apply Obsidian scorecard-oriented
 * CSS edits. Use when fixing Windows encoding corruption or after changing baseline in git.
 * Do not run after hand-editing styles.css in the working tree (it overwrites from HEAD).
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outFile = path.join(root, "styles.css");

const buf = execFileSync("git", ["show", "HEAD:styles.css"], { cwd: root });
let s = buf.toString("utf8");

const patches = [
	[
		`.yd-grid {
  display: grid;
  grid-template-columns: var(--yd-col-left-width) var(--yd-col-right-width);
  column-gap: var(--yd-col-gap);
  align-items: stretch;
  margin-top: var(--yd-section-gap);
}`,
		`.yd-grid {
  display: grid;
  grid-template-columns: var(--yd-col-left-width) var(--yd-col-right-width);
  gap: var(--yd-col-gap);
  align-items: stretch;
  margin-top: var(--yd-section-gap);
}`,
	],
	[
		`.yd-calendar-body {
  display: grid;
  grid-template-columns: 240px 1fr;
  column-gap: 32px;
  align-items: start;
  position: relative;
  padding-left: 12px;
  padding-right: 0;
}`,
		`.yd-calendar-body {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 32px;
  align-items: start;
  position: relative;
  padding-left: 12px;
  padding-right: 0;
}`,
	],
	[
		`.yd-section-taskbox:has(> .yd-task-composer) > .yd-section-footer,
.yd-section-planner:has(> .yd-task-composer) > .yd-section-footer {
  display: none;
}`,
		`.yd-section-taskbox.yd-section--composer-open > .yd-section-footer,
.yd-section-planner.yd-section--composer-open > .yd-section-footer {
  display: none;
}`,
	],
	[
		`.yd-history-grid {
  column-width: 120px;
  column-gap: 6px;
  padding: 4px;
}

.yd-history-cell {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  padding: 6px 10px;
  margin-bottom: 6px;
  border: 1px solid var(--yd-border);
  border-radius: 4px;
  background-color: transparent;
  white-space: nowrap;
  overflow: hidden;
  break-inside: avoid;
  -webkit-column-break-inside: avoid;
  page-break-inside: avoid;
}`,
		`.yd-history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 6px;
  padding: 4px;
}

.yd-history-cell {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--yd-border);
  border-radius: 4px;
  background-color: transparent;
  white-space: nowrap;
  overflow: hidden;
}`,
	],
	[
		`.yd-week-top--bar .yd-week-bar {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: minmax(32px, auto) 1fr minmax(32px, auto);
  align-items: center;
  column-gap: 6px;
  min-width: 0;
}`,
		`.yd-week-top--bar .yd-week-bar {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: minmax(32px, auto) 1fr minmax(32px, auto);
  align-items: center;
  gap: 6px;
  min-width: 0;
}`,
	],
	[
		`.yd-week-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 24px;
  row-gap: 12px;
}

.yd-fullpage-modal--mobile.yd-week-modal .yd-week-grid {
  grid-template-columns: 1fr;
  column-gap: 0;
  row-gap: 16px;
}`,
		`.yd-week-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
}

.yd-fullpage-modal--mobile.yd-week-modal .yd-week-grid {
  grid-template-columns: 1fr;
  gap: 16px;
}`,
	],
	[
		`.yd-week-col-head:not(.yd-week-col-head--with-actions) .yd-week-col-day {
  font-size: 15px;
  font-weight: 500;
  color: var(--yd-text-muted);
  cursor: pointer;
  padding: 4px 4px 4px;
  border-bottom: 1px solid currentColor;
  letter-spacing: 0;
  margin-bottom: 4px;
}`,
		`.yd-week-col-head:not(.yd-week-col-head--with-actions) .yd-week-col-day {
  font-size: 15px;
  font-weight: 500;
  color: var(--yd-text-muted);
  cursor: pointer;
  padding: 4px;
  border-bottom: 1px solid currentColor;
  letter-spacing: 0;
  margin-bottom: 4px;
}`,
	],
	[
		`.yd-checkin-cell.is-done {
  color: #fff;
  font-weight: 600;
}`,
		`.yd-checkin-cell.is-done {
  color: #ffffff;
  font-weight: 600;
}`,
	],
	[
		`.yd-taskbox-fullgrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 24px;
  row-gap: 20px;
}

.yd-fullpage-modal--mobile.yd-taskbox-modal .yd-taskbox-fullgrid {
  grid-template-columns: 1fr;
  column-gap: 0;
}`,
		`.yd-taskbox-fullgrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 24px;
}

.yd-fullpage-modal--mobile.yd-taskbox-modal .yd-taskbox-fullgrid {
  grid-template-columns: 1fr;
  gap: 20px;
}`,
	],
	[
		`.yd-fullpage-modal.yd-taskbox-modal:not(.yd-fullpage-modal--mobile) .yd-taskbox-fullcol > .yd-taskbox-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--yd-text-muted);
  letter-spacing: 0;
  text-transform: none;
  padding: 4px 4px 4px;
  margin-bottom: 4px;
  border-bottom: 1px solid currentColor;
}`,
		`.yd-fullpage-modal.yd-taskbox-modal:not(.yd-fullpage-modal--mobile) .yd-taskbox-fullcol > .yd-taskbox-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--yd-text-muted);
  letter-spacing: 0;
  text-transform: none;
  padding: 4px;
  margin-bottom: 4px;
  border-bottom: 1px solid currentColor;
}`,
	],
	[
		`.yd-planner-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 24px;
  row-gap: 12px;
  margin-top: 8px;
}

.yd-fullpage-modal--mobile.yd-planner-modal .yd-planner-grid {
  grid-template-columns: 1fr;
  column-gap: 0;
}`,
		`.yd-planner-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
  margin-top: 8px;
}

.yd-fullpage-modal--mobile.yd-planner-modal .yd-planner-grid {
  grid-template-columns: 1fr;
  gap: 12px;
}`,
	],
	[
		`.yd-planner-cell > .yd-planner-month {
  font-size: 15px;
  font-weight: 500;
  color: var(--yd-text-muted);
  letter-spacing: 0;
  border-bottom: 1px solid currentColor;
  padding: 4px 4px 4px;
  margin-bottom: 4px;
}`,
		`.yd-planner-cell > .yd-planner-month {
  font-size: 15px;
  font-weight: 500;
  color: var(--yd-text-muted);
  letter-spacing: 0;
  border-bottom: 1px solid currentColor;
  padding: 4px;
  margin-bottom: 4px;
}`,
	],
	[
		`.yd-mobile-search-block:has(.yd-mobile-search-results:not(:empty)) {
  align-content: start;
  min-height: 0;
}`,
		`.yd-mobile-search-block.yd-mobile-search-block--has-results {
  align-content: start;
  min-height: 0;
}`,
	],
	[
		`.yd-calendar-body--mobile-stack {
  display: flex;
  flex-direction: column;
  grid-template-columns: unset;
  column-gap: 0;
  row-gap: 0;
  padding-left: 0;
  align-items: stretch;
}`,
		`.yd-calendar-body--mobile-stack {
  display: flex;
  flex-direction: column;
  grid-template-columns: unset;
  gap: 0;
  padding-left: 0;
  align-items: stretch;
}`,
	],
];

for (const [from, to] of patches) {
	if (!s.includes(from)) {
		console.error("Missing expected block in HEAD styles.css:\n", from.slice(0, 200));
		process.exit(1);
	}
	s = s.split(from).join(to);
}

s = s
	.replace(/#fff(?![0-9a-fA-F])/g, "#ffffff")
	.replace(/#888(?![0-9a-fA-F])/g, "#888888")
	.replace(/#333(?![0-9a-fA-F])/g, "#333333");

fs.writeFileSync(outFile, s, "utf8");
console.log("Wrote", path.relative(root, outFile), "| 华文", s.includes("华文"), "| :has", s.includes(":has("));
