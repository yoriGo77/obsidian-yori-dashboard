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
