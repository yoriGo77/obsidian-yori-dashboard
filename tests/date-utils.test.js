"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const dateUtils = require("../lib/date-utils");

test("formatDateKey/parseDateKey roundtrip", () => {
  const date = new Date(2026, 4, 5);
  const key = dateUtils.formatDateKey(date);
  assert.equal(key, "2026-05-05");
  const parsed = dateUtils.parseDateKey(key);
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 4);
  assert.equal(parsed.getDate(), 5);
});

test("getMondayOf returns Monday of the week", () => {
  const sunday = new Date(2026, 4, 10);
  const monday = dateUtils.getMondayOf(sunday);
  assert.equal(monday.getDay(), 1);
  const wednesday = new Date(2026, 4, 6);
  const monday2 = dateUtils.getMondayOf(wednesday);
  assert.equal(dateUtils.formatDateKey(monday2), "2026-05-04");
});

test("getMonthMatrix produces 7-column rows including out-of-month padding", () => {
  const cells = dateUtils.getMonthMatrix(2026, 4);
  assert.equal(cells.length % 7, 0);
  const inMonth = cells.filter((cell) => cell.inMonth);
  assert.equal(inMonth.length, 31);
});

test("formatTimeDisplay handles 12/24 hour formats", () => {
  assert.equal(dateUtils.formatTimeDisplay(13, 30, "24"), "13:30");
  assert.equal(dateUtils.formatTimeDisplay(13, 30, "12"), "01:30 PM");
  assert.equal(dateUtils.formatTimeDisplay(0, 5, "12"), "12:05 AM");
  assert.equal(dateUtils.formatTimeDisplay(12, 0, "12"), "12:00 PM");
});

test("shiftMonth wraps year correctly", () => {
  const next = dateUtils.shiftMonth(2026, 11, 1);
  assert.deepEqual(next, { year: 2027, monthIndex: 0 });
  const prev = dateUtils.shiftMonth(2026, 0, -1);
  assert.deepEqual(prev, { year: 2025, monthIndex: 11 });
});
