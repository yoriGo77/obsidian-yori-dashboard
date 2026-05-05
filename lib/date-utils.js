"use strict";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad2(value) {
  return `${value}`.padStart(2, "0");
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayKey(now) {
  return formatDateKey(now || new Date());
}

function formatDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseDateKey(key) {
  if (!key || typeof key !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function parseMonthKey(key) {
  if (!key || typeof key !== "string") return null;
  const match = /^(\d{4})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

function formatYearKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}`;
}

function getMondayOf(date) {
  const base = startOfDay(date || new Date());
  const day = base.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + delta);
  return base;
}

function getWeekKey(date) {
  return formatDateKey(getMondayOf(date));
}

function getWeekRange(date) {
  const monday = getMondayOf(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}

function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function getMonthMatrix(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1);
  const startDay = firstDay.getDay();
  const leadingBlanks = startDay === 0 ? 6 : startDay - 1;
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const cells = [];
  const prevMonthDays = getDaysInMonth(year, monthIndex - 1);
  for (let i = 0; i < leadingBlanks; i += 1) {
    const day = prevMonthDays - leadingBlanks + 1 + i;
    cells.push({ day, inMonth: false, year, monthIndex: monthIndex - 1 });
  }
  for (let i = 1; i <= daysInMonth; i += 1) {
    cells.push({ day: i, inMonth: true, year, monthIndex });
  }
  while (cells.length % 7 !== 0) {
    const idx = cells.length - leadingBlanks - daysInMonth;
    cells.push({ day: idx + 1, inMonth: false, year, monthIndex: monthIndex + 1 });
  }
  return cells;
}

function shiftMonth(year, monthIndex, delta) {
  const date = new Date(year, monthIndex + delta, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

function shiftYear(year, delta) {
  return year + delta;
}

function diffDaysSince(dateKey, now) {
  const d = parseDateKey(dateKey);
  if (!d) return 0;
  const today = startOfDay(now || new Date());
  return Math.round((today.getTime() - d.getTime()) / MS_PER_DAY);
}

function formatTimeDigits(hours, minutes) {
  return `${pad2(hours)}:${pad2(minutes)}`;
}

function formatTimeDisplay(hours, minutes, format) {
  if (format === "12") {
    const isPm = hours >= 12;
    let h = hours % 12;
    if (h === 0) h = 12;
    return `${pad2(h)}:${pad2(minutes)} ${isPm ? "PM" : "AM"}`;
  }
  return formatTimeDigits(hours, minutes);
}

function nowTimeParts(now) {
  const d = now || new Date();
  return { hours: d.getHours(), minutes: d.getMinutes() };
}

function timeKey(date) {
  const d = date || new Date();
  return `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}${pad2(d.getMilliseconds() % 1000).slice(0, 2)}`;
}

module.exports = {
  pad2,
  startOfDay,
  todayKey,
  formatDateKey,
  parseDateKey,
  formatMonthKey,
  parseMonthKey,
  formatYearKey,
  getMondayOf,
  getWeekKey,
  getWeekRange,
  getDaysInMonth,
  getMonthMatrix,
  shiftMonth,
  shiftYear,
  diffDaysSince,
  formatTimeDigits,
  formatTimeDisplay,
  nowTimeParts,
  timeKey
};
