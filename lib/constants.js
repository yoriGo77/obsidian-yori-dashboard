"use strict";

const VIEW_TYPE = "yori-dashboard-view";
const ICON_ID = "yori-dashboard-icon";
const EVENT_CLIPBOARD_KEY = "__yori_dashboard_clipboard__";

const ACCENT = "#99876c";
const ACCENT_DEEP = "#af9165";
const ACCENT_SOFT = "#efe8e0";
const PANEL_BG = "#fbf7f2";
const CARD_BG = "#f4ede2";
const MUTED_TEXT = "#a89c87";

const PALETTE = [
  { name: "green", color: "#95cd81" },
  { name: "cyan", color: "#79ced6" },
  { name: "blue", color: "#91b0df" },
  { name: "purple", color: "#d8a1ce" },
  { name: "red", color: "#e48962" },
  { name: "khaki", color: "#c49a58" },
  { name: "yellow", color: "#e4d277" },
  { name: "light-green", color: "#cecf96" },
  { name: "light-mint", color: "#88cfba" },
  { name: "light-blue", color: "#8dcae8" },
  { name: "light-purple", color: "#d2bedf" },
  { name: "light-pink", color: "#e1aca6" },
  { name: "light-brown", color: "#c4b6a0" },
  { name: "light-orange", color: "#e8c284" }
];

const NOTE_OPEN_MODES = ["smart", "newTab", "replace"];
const TIME_FORMATS = ["12", "24"];
const LANGUAGES = ["zh", "en"];
const SECTION_LENGTHS = ["medium", "long"];

const SECTION_LIMITS = {
  medium: {
    dailyEvents: 5,
    taskBox: 8,
    dailyMoments: 5,
    monthlyPlanner: 6,
    dataLog: 5,
    checkIn: 5
  },
  long: {
    dailyEvents: 12,
    taskBox: 12,
    dailyMoments: 12,
    monthlyPlanner: 12,
    dataLog: 12,
    checkIn: 12
  }
};

const DEFAULT_DATA_LOG_ITEMS = [];

const DEFAULT_TASK_BOXES = [];

const DEFAULT_CHECKIN_ITEMS = [];

const DEFAULT_QUICK_ENTRIES_LEFT = [];
const DEFAULT_QUICK_ENTRIES_RIGHT = [];

const DEFAULT_SECTION_ORDER = {
  groupA: ["dataLog", "checkIn"],
  groupB: ["taskBox", "dailyMoments", "monthlyPlanner"]
};

const DEFAULT_SETTINGS = {
  schemaVersion: 1,
  uiLanguage: "zh",
  timeFormat: "24",
  sectionLength: "medium",
  noteOpenMode: "smart",
  archiveFolder: "Yori Dashboard Archive",
  showSection: {
    calendar: true,
    dataLog: true,
    taskBox: true,
    checkIn: true,
    dailyMoments: true,
    monthlyPlanner: true,
    quickEntries: true
  },
  sectionOrder: {
    groupA: ["dataLog", "checkIn"],
    groupB: ["taskBox", "dailyMoments", "monthlyPlanner"]
  },
  data: {
    dailyEvents: {},
    dataLog: {
      items: DEFAULT_DATA_LOG_ITEMS,
      values: {}
    },
    taskBox: {
      boxes: DEFAULT_TASK_BOXES,
      tasks: []
    },
    checkIn: {
      items: DEFAULT_CHECKIN_ITEMS,
      records: {}
    },
    dailyMoments: {},
    monthlyPlanner: {},
    quickEntries: {
      left: DEFAULT_QUICK_ENTRIES_LEFT,
      right: DEFAULT_QUICK_ENTRIES_RIGHT
    }
  }
};

module.exports = {
  VIEW_TYPE,
  ICON_ID,
  EVENT_CLIPBOARD_KEY,
  ACCENT,
  ACCENT_DEEP,
  ACCENT_SOFT,
  PANEL_BG,
  CARD_BG,
  MUTED_TEXT,
  PALETTE,
  NOTE_OPEN_MODES,
  TIME_FORMATS,
  LANGUAGES,
  SECTION_LENGTHS,
  SECTION_LIMITS,
  DEFAULT_DATA_LOG_ITEMS,
  DEFAULT_TASK_BOXES,
  DEFAULT_CHECKIN_ITEMS,
  DEFAULT_SECTION_ORDER,
  DEFAULT_SETTINGS
};
