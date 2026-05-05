"use strict";

const {
  DEFAULT_SETTINGS,
  DEFAULT_DATA_LOG_ITEMS,
  DEFAULT_TASK_BOXES,
  DEFAULT_CHECKIN_ITEMS,
  DEFAULT_SECTION_ORDER
} = require("./constants");

function deepClone(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((entry) => deepClone(entry));
  const result = {};
  for (const key of Object.keys(value)) {
    result[key] = deepClone(value[key]);
  }
  return result;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeDefaults(defaults, value) {
  if (!isPlainObject(defaults)) return value === undefined ? deepClone(defaults) : value;
  if (!isPlainObject(value)) return deepClone(defaults);
  const merged = {};
  for (const key of Object.keys(defaults)) {
    merged[key] = mergeDefaults(defaults[key], value[key]);
  }
  for (const key of Object.keys(value)) {
    if (!(key in merged)) merged[key] = value[key];
  }
  return merged;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeDataLog(data) {
  const block = isPlainObject(data) ? data : {};
  const items = ensureArray(block.items).map((item, idx) => ({
    id: item && typeof item.id === "string" && item.id ? item.id : `dl_${Date.now()}_${idx}`,
    name: typeof item?.name === "string" ? item.name : "",
    notePath: typeof item?.notePath === "string" ? item.notePath : "",
    order: Number.isFinite(item?.order) ? item.order : idx
  }));
  if (items.length === 0) {
    DEFAULT_DATA_LOG_ITEMS.forEach((item, idx) => items.push({ ...item, order: idx, notePath: "" }));
  } else {
    items.sort((a, b) => a.order - b.order).forEach((item, idx) => {
      item.order = idx;
    });
  }
  const values = isPlainObject(block.values) ? block.values : {};
  const cleanedValues = {};
  for (const itemId of Object.keys(values)) {
    if (!isPlainObject(values[itemId])) continue;
    const dailyMap = {};
    for (const dateKey of Object.keys(values[itemId])) {
      const value = values[itemId][dateKey];
      if (value === undefined || value === null) continue;
      dailyMap[dateKey] = String(value);
    }
    cleanedValues[itemId] = dailyMap;
  }
  return { items, values: cleanedValues };
}

function normalizeTaskBox(data) {
  const block = isPlainObject(data) ? data : {};
  const boxes = ensureArray(block.boxes).map((box, idx) => ({
    id: box && typeof box.id === "string" && box.id ? box.id : `tb_${Date.now()}_${idx}`,
    name: typeof box?.name === "string" ? box.name : "",
    order: Number.isFinite(box?.order) ? box.order : idx
  }));
  if (boxes.length === 0) {
    DEFAULT_TASK_BOXES.forEach((box, idx) => boxes.push({ ...box, order: idx }));
  } else {
    boxes.sort((a, b) => a.order - b.order).forEach((box, idx) => {
      box.order = idx;
    });
  }
  const validBoxIds = new Set(boxes.map((box) => box.id));
  const tasks = ensureArray(block.tasks)
    .map((task, idx) => ({
      id: task && typeof task.id === "string" && task.id ? task.id : `task_${Date.now()}_${idx}`,
      boxId: typeof task?.boxId === "string" ? task.boxId : "",
      title: typeof task?.title === "string" ? task.title : "",
      completed: !!task?.completed,
      order: Number.isFinite(task?.order) ? task.order : idx
    }))
    .filter((task) => validBoxIds.has(task.boxId));
  return { boxes, tasks };
}

function normalizeCheckIn(data) {
  const block = isPlainObject(data) ? data : {};
  const items = ensureArray(block.items).map((item, idx) => ({
    id: item && typeof item.id === "string" && item.id ? item.id : `ci_${Date.now()}_${idx}`,
    name: typeof item?.name === "string" ? item.name : "",
    color: typeof item?.color === "string" ? item.color : "#af9165",
    order: Number.isFinite(item?.order) ? item.order : idx
  }));
  if (items.length === 0) {
    DEFAULT_CHECKIN_ITEMS.forEach((item, idx) => items.push({ ...item, order: idx }));
  } else {
    items.sort((a, b) => a.order - b.order).forEach((item, idx) => {
      item.order = idx;
    });
  }
  const records = isPlainObject(block.records) ? block.records : {};
  const cleaned = {};
  for (const itemId of Object.keys(records)) {
    const dayMap = isPlainObject(records[itemId]) ? records[itemId] : null;
    if (!dayMap) continue;
    const out = {};
    for (const dateKey of Object.keys(dayMap)) {
      out[dateKey] = !!dayMap[dateKey];
    }
    cleaned[itemId] = out;
  }
  return { items, records: cleaned };
}

function normalizeDailyEvents(data) {
  const block = isPlainObject(data) ? data : {};
  const out = {};
  for (const dateKey of Object.keys(block)) {
    const list = ensureArray(block[dateKey])
      .map((event, idx) => ({
        id: event && typeof event.id === "string" && event.id ? event.id : `evt_${Date.now()}_${idx}`,
        title: typeof event?.title === "string" ? event.title : "",
        completed: !!event?.completed,
        order: Number.isFinite(event?.order) ? event.order : idx
      }))
      .sort((a, b) => a.order - b.order);
    list.forEach((event, idx) => {
      event.order = idx;
    });
    out[dateKey] = list;
  }
  return out;
}

function normalizeDailyMoments(data) {
  const block = isPlainObject(data) ? data : {};
  const out = {};
  for (const dateKey of Object.keys(block)) {
    const list = ensureArray(block[dateKey])
      .map((moment, idx) => ({
        id: moment && typeof moment.id === "string" && moment.id ? moment.id : `dm_${Date.now()}_${idx}`,
        hours: Number.isFinite(moment?.hours) ? Math.max(0, Math.min(23, Math.floor(moment.hours))) : 0,
        minutes: Number.isFinite(moment?.minutes) ? Math.max(0, Math.min(59, Math.floor(moment.minutes))) : 0,
        text: typeof moment?.text === "string" ? moment.text : ""
      }))
      .sort((a, b) => a.hours * 60 + a.minutes - (b.hours * 60 + b.minutes));
    out[dateKey] = list;
  }
  return out;
}

function normalizeMonthlyPlanner(data) {
  const block = isPlainObject(data) ? data : {};
  const out = {};
  for (const monthKey of Object.keys(block)) {
    const list = ensureArray(block[monthKey])
      .map((entry, idx) => ({
        id: entry && typeof entry.id === "string" && entry.id ? entry.id : `mp_${Date.now()}_${idx}`,
        title: typeof entry?.title === "string" ? entry.title : "",
        order: Number.isFinite(entry?.order) ? entry.order : idx
      }))
      .sort((a, b) => a.order - b.order);
    list.forEach((entry, idx) => {
      entry.order = idx;
    });
    out[monthKey] = list;
  }
  return out;
}

function normalizeQuickEntries(data) {
  const block = isPlainObject(data) ? data : {};
  function normSide(side) {
    return ensureArray(block[side]).map((entry, idx) => ({
      id: entry && typeof entry.id === "string" && entry.id ? entry.id : `qe_${Date.now()}_${idx}`,
      name: typeof entry?.name === "string" ? entry.name : "",
      color: typeof entry?.color === "string" && entry.color ? entry.color : "#af9165",
      notePath: typeof entry?.notePath === "string" ? entry.notePath : "",
      order: Number.isFinite(entry?.order) ? entry.order : idx
    }))
    .sort((a, b) => a.order - b.order)
    .map((entry, idx) => ({ ...entry, order: idx }));
  }
  return {
    left: normSide("left"),
    right: normSide("right")
  };
}

function normalizeSectionOrder(raw) {
  const block = isPlainObject(raw) ? raw : {};
  function pickGroup(key) {
    const allowed = DEFAULT_SECTION_ORDER[key];
    const seen = new Set();
    const out = [];
    ensureArray(block[key]).forEach((id) => {
      if (typeof id === "string" && allowed.includes(id) && !seen.has(id)) {
        out.push(id);
        seen.add(id);
      }
    });
    allowed.forEach((id) => {
      if (!seen.has(id)) out.push(id);
    });
    return out;
  }
  return {
    groupA: pickGroup("groupA"),
    groupB: pickGroup("groupB")
  };
}

function normalizeSettings(raw) {
  const merged = mergeDefaults(DEFAULT_SETTINGS, raw || {});
  if (!isPlainObject(merged.data)) merged.data = deepClone(DEFAULT_SETTINGS.data);
  merged.data.dailyEvents = normalizeDailyEvents(merged.data.dailyEvents);
  merged.data.dataLog = normalizeDataLog(merged.data.dataLog);
  merged.data.taskBox = normalizeTaskBox(merged.data.taskBox);
  merged.data.checkIn = normalizeCheckIn(merged.data.checkIn);
  merged.data.dailyMoments = normalizeDailyMoments(merged.data.dailyMoments);
  merged.data.monthlyPlanner = normalizeMonthlyPlanner(merged.data.monthlyPlanner);
  merged.data.quickEntries = normalizeQuickEntries(merged.data.quickEntries);
  merged.sectionOrder = normalizeSectionOrder(merged.sectionOrder);
  merged.showSection = isPlainObject(merged.showSection)
    ? { ...DEFAULT_SETTINGS.showSection, ...merged.showSection }
    : { ...DEFAULT_SETTINGS.showSection };
  merged.showSection.calendar = true;
  merged.showSection.quickEntries = true;
  if (!Number.isFinite(merged.schemaVersion)) merged.schemaVersion = 1;
  return merged;
}

function makeId(prefix) {
  const tag = prefix || "id";
  return `${tag}_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

module.exports = {
  deepClone,
  isPlainObject,
  mergeDefaults,
  normalizeSettings,
  normalizeDailyEvents,
  normalizeDataLog,
  normalizeTaskBox,
  normalizeCheckIn,
  normalizeDailyMoments,
  normalizeMonthlyPlanner,
  normalizeQuickEntries,
  normalizeSectionOrder,
  makeId
};
