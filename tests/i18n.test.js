"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const i18n = require("../lib/i18n");

test("createTranslator switches language", () => {
  let lang = "zh";
  const t = i18n.createTranslator(() => lang);
  assert.equal(t("common.confirm"), "确定");
  lang = "en";
  assert.equal(t("common.confirm"), "Confirm");
});

test("translator interpolates variables", () => {
  const t = i18n.createTranslator(() => "zh");
  const result = t("calendar.deleteConfirmMsg", { title: "示例" });
  assert.match(result, /示例/);
});

test("translator falls back to zh when key missing in target language", () => {
  const t = i18n.createTranslator(() => "en");
  assert.notEqual(t("section.calendar"), "section.calendar");
  const fallbackKey = "_missing_translation_";
  assert.equal(t(fallbackKey), fallbackKey);
});
