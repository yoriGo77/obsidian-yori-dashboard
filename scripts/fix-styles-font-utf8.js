"use strict";

const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "..", "styles.css");
let s = fs.readFileSync(p, "utf8");

const good = `  font-family:
    "STXihei", "华文细黑",
    "PingFang SC", "苹方-简",
    "Source Han Sans CN Light", "思源黑体 CN Light",
    "Microsoft JhengHei Light",
    "Microsoft YaHei Light", "微软雅黑 Light",
    "Microsoft YaHei", "微软雅黑",
    "Noto Sans CJK SC", "Noto Sans SC",
    sans-serif;`;

const badLf = `  font-family:
    "STXihei", "????",
    "PingFang SC", "??-?",
    "Source Han Sans CN Light", "???? CN Light",
    "Microsoft JhengHei Light",
    "Microsoft YaHei Light", "???? Light",
    "Microsoft YaHei", "????",
    "Noto Sans CJK SC", "Noto Sans SC",
    sans-serif;`;
const bad = badLf.replace(/\n/g, "\r\n");
const goodCr = good.replace(/\n/g, "\r\n");

let n = s;
if (n.includes(bad)) {
	n = n.split(bad).join(goodCr);
} else if (n.includes(badLf)) {
	n = n.split(badLf).join(good);
} else {
	console.error("fix-styles-font-utf8: corrupted font block not found");
	process.exit(1);
}
fs.writeFileSync(p, n, "utf8");
if (!n.includes("华文细黑")) {
	console.error("fix-styles-font-utf8: still broken");
	process.exit(1);
}
console.log("Restored CJK font names in styles.css");
