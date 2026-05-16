/**
 * Safe pipeline: load styles.css from git HEAD blob (UTF-8), strip !important,
 * apply selector specificity tweaks. Avoids git restore / shell encoding issues on Windows.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outFile = path.join(root, "styles.css");

const buf = execFileSync("git", ["show", "HEAD:styles.css"], {
	cwd: root,
});
let s = buf.toString("utf8");
const impCount = (s.match(/!important/gi) || []).length;
s = s.replace(/\s*!important/gi, "");

const patches = [
	[
		`/* Full view host (covers Obsidian leaf area behind yd-root) */
.yd-dashboard-host,
.yd-view-content {
  background-color: #f8f7f6;
}
`,
		`/* Full view host (covers Obsidian leaf area behind yd-root) */
.yd-dashboard-host {
  background-color: #f8f7f6;
}

.yd-dashboard-host .yd-view-content {
  background-color: #f8f7f6;
}
`,
	],
	[
		`.yd-dashboard-host input[type="checkbox"]:checked,
.yd-fullpage-modal input[type="checkbox"]:checked {`,
		`.yd-dashboard-host .yd-view-content input[type="checkbox"]:checked,
.yd-fullpage-modal input[type="checkbox"]:checked {`,
	],
	[
		`.yd-dashboard-host input[type="checkbox"]:checked:hover,
.yd-fullpage-modal input[type="checkbox"]:checked:hover {`,
		`.yd-dashboard-host .yd-view-content input[type="checkbox"]:checked:hover,
.yd-fullpage-modal input[type="checkbox"]:checked:hover {`,
	],
	[
		`.theme-dark .yd-dashboard-host,
.theme-dark .yd-view-content {
  background-color: #1c1b19;
}`,
		`.theme-dark .yd-dashboard-host {
  background-color: #1c1b19;
}

.theme-dark .yd-dashboard-host .yd-view-content {
  background-color: #1c1b19;
}`,
	],
	[
		`.theme-dark .yd-dashboard-host input[type="checkbox"]:checked,
.theme-dark .yd-fullpage-modal input[type="checkbox"]:checked {`,
		`.theme-dark .yd-dashboard-host .yd-view-content input[type="checkbox"]:checked,
.theme-dark .yd-fullpage-modal input[type="checkbox"]:checked {`,
	],
	[
		`.theme-dark .yd-dashboard-host input[type="checkbox"]:checked:hover,
.theme-dark .yd-fullpage-modal input[type="checkbox"]:checked:hover {`,
		`.theme-dark .yd-dashboard-host .yd-view-content input[type="checkbox"]:checked:hover,
.theme-dark .yd-fullpage-modal input[type="checkbox"]:checked:hover {`,
	],
];

for (const [from, to] of patches) {
	if (!s.includes(from)) {
		console.error("Patch block not found in HEAD styles.css:\n", from.slice(0, 120));
		process.exit(1);
	}
	s = s.split(from).join(to);
}

fs.writeFileSync(outFile, s, "utf8");
console.log(
	"Wrote",
	path.relative(root, outFile),
	"| stripped",
	impCount,
	"!important | 华文",
	s.includes("华文"),
);
