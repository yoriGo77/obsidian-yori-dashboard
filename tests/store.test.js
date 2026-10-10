"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const store = require("../lib/store");
const { DEFAULT_DATA_LOG_ITEMS, DEFAULT_TASK_BOXES } = require("../lib/constants");

test("normalizeSettings fills defaults from empty input", () => {
  const settings = store.normalizeSettings(null);
  assert.equal(settings.uiLanguage, "zh");
  assert.equal(settings.timeFormat, "24");
  assert.ok(Array.isArray(settings.data.dataLog.items));
  assert.equal(settings.data.dataLog.items.length, DEFAULT_DATA_LOG_ITEMS.length);
  assert.ok(Array.isArray(settings.data.taskBox.boxes));
  assert.equal(settings.data.taskBox.boxes.length, DEFAULT_TASK_BOXES.length);
  assert.deepEqual(settings.data.dailyEvents, {});
});

test("normalizeSettings preserves user-provided overrides", () => {
  const settings = store.normalizeSettings({
    uiLanguage: "en",
    timeFormat: "12",
    data: {
      dataLog: {
        items: [{ id: "x", name: "Sleep", order: 0 }],
        values: {
          x: { "2026-05-05": "8h" }
        }
      }
    }
  });
  assert.equal(settings.uiLanguage, "en");
  assert.equal(settings.timeFormat, "12");
  assert.equal(settings.data.dataLog.items.length, 1);
  assert.equal(settings.data.dataLog.values.x["2026-05-05"], "8h");
});

test("normalizeSettings drops tasks pointing to removed boxes", () => {
  const settings = store.normalizeSettings({
    data: {
      taskBox: {
        boxes: [{ id: "a", name: "A", order: 0 }],
        tasks: [
          { id: "t1", boxId: "a", title: "task 1", order: 0 },
          { id: "t2", boxId: "ghost", title: "task 2", order: 1 }
        ]
      }
    }
  });
  assert.equal(settings.data.taskBox.tasks.length, 1);
  assert.equal(settings.data.taskBox.tasks[0].id, "t1");
});

test("makeId produces unique-ish strings", () => {
  const a = store.makeId("evt");
  const b = store.makeId("evt");
  assert.notEqual(a, b);
  assert.ok(a.startsWith("evt_"));
});

test("normalizeDailyEvents sorts and reindexes order", () => {
  const out = store.normalizeDailyEvents({
    "2026-05-05": [
      { id: "b", title: "B", order: 5 },
      { id: "a", title: "A", order: 1 }
    ]
  });
  assert.deepEqual(
    out["2026-05-05"].map((e) => [e.id, e.order]),
    [["a", 0], ["b", 1]]
  );
});

test("normalizeDailyMoments sorts moments by time of day", () => {
  const out = store.normalizeDailyMoments({
    "2026-05-05": [
      { id: "b", hours: 12, minutes: 0, text: "noon" },
      { id: "a", hours: 8, minutes: 30, text: "morning" }
    ]
  });
  assert.deepEqual(
    out["2026-05-05"].map((m) => m.id),
    ["a", "b"]
  );
});


test("sticky notes default to hidden, with title-sized muted text", () => {
  const settings = store.normalizeSettings(null);
  assert.equal(settings.showSection.noteSmall, false);
  assert.equal(settings.showSection.noteLarge, false);
  assert.equal(settings.data.notes.small.size, 17);
  assert.equal(settings.data.notes.large.color, "#c4b6a0");
  assert.equal(settings.sectionOrder.groupA[0], "noteSmall");
  assert.equal(settings.sectionOrder.groupB[0], "noteLarge");
});

test("sticky notes are placed first in an existing saved section order", () => {
  const settings = store.normalizeSettings({
    sectionOrder: { groupA: ["checkIn", "dataLog"], groupB: ["monthlyPlanner", "taskBox", "dailyMoments"] }
  });
  assert.deepEqual(settings.sectionOrder.groupA, ["noteSmall", "checkIn", "dataLog"]);
  assert.deepEqual(settings.sectionOrder.groupB, ["noteLarge", "monthlyPlanner", "taskBox", "dailyMoments"]);
});

test("normalizeNotes keeps per-date texts and repairs invalid values", () => {
  const notes = store.normalizeNotes({
    small: {
      texts: { "2026-10-10": "hello\nworld", "2026-10-11": "", "bad-key": "x", "2026-10-12": 5 },
      color: "#95cd81",
      size: 24
    },
    large: { texts: "oops", color: "red", size: 99 }
  });
  assert.deepEqual(notes.small, { texts: { "2026-10-10": "hello\nworld" }, color: "#95cd81", size: 24 });
  assert.deepEqual(notes.large, { texts: {}, color: "#c4b6a0", size: 17 });
});

test("normalizeNotes files a legacy undated text under today", () => {
  const { formatDateKey } = require("../lib/date-utils");
  const today = formatDateKey(new Date());
  const notes = store.normalizeNotes({ small: { text: "old note" } });
  assert.deepEqual(notes.small.texts, { [today]: "old note" });
  assert.equal("text" in notes.small, false);
});