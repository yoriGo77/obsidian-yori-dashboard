"use strict";

const { TFile } = require("obsidian");

const calendarSection = require("./sections/calendar");
const dataLogSection = require("./sections/data-log");
const taskBoxSection = require("./sections/task-box");
const checkInSection = require("./sections/check-in");
const momentsSection = require("./sections/daily-moments");
const plannerSection = require("./sections/monthly-planner");
const quickEntriesSection = require("./sections/quick-entries");
const { searchMarkdownNotes } = require("./note-search");

function renderTabBar(parent, ctx) {
  const row = parent.createDiv({ cls: "yd-mobile-tabrow" });
  const active = ctx.state.mobileTab || "today";
  const tabs = [
    { id: "today", labelKey: "mobile.tabToday" },
    { id: "trackers", labelKey: "mobile.tabTrackers" },
    { id: "tasks", labelKey: "mobile.tabTasks" },
    { id: "links", labelKey: "mobile.tabLinks" }
  ];
  tabs.forEach(({ id, labelKey }) => {
    const btn = row.createEl("button", {
      cls: "yd-mobile-tab",
      type: "button",
      text: ctx.t(labelKey)
    });
    if (id === active) btn.addClass("is-active");
    btn.setAttr("aria-pressed", id === active ? "true" : "false");
    btn.onclick = () => {
      ctx.state.mobileTab = id;
      ctx.refresh();
    };
  });
}

function tabEmpty(panel, ctx) {
  panel.createDiv({ cls: "yd-empty-tip yd-mobile-tab-empty", text: ctx.t("mobile.tabEmpty") });
}

function renderToday(panel, ctx) {
  const { settings } = ctx;
  calendarSection.render(panel, ctx, { layout: "mobileCard" });
  if (settings.showSection?.dailyMoments !== false) {
    momentsSection.render(panel, ctx, { layout: "mobileCard" });
  }
}

function renderTrackers(panel, ctx) {
  const { settings } = ctx;
  let any = false;
  if (settings.showSection?.dataLog !== false) {
    dataLogSection.render(panel, ctx);
    any = true;
  }
  if (settings.showSection?.checkIn !== false) {
    checkInSection.render(panel, ctx);
    any = true;
  }
  if (!any) tabEmpty(panel, ctx);
}

function renderTasks(panel, ctx) {
  const { settings } = ctx;
  let any = false;
  if (settings.showSection?.taskBox !== false) {
    taskBoxSection.render(panel, ctx);
    any = true;
  }
  if (settings.showSection?.monthlyPlanner !== false) {
    plannerSection.render(panel, ctx);
    any = true;
  }
  if (!any) tabEmpty(panel, ctx);
}

function renderLinks(panel, ctx) {
  const { settings, t, app, plugin } = ctx;
  if (settings.showSection?.quickEntries === false) {
    tabEmpty(panel, ctx);
    return;
  }
  const wrap = panel.createDiv({ cls: "yd-mobile-links-wrap" });

  const searchBlock = wrap.createDiv({ cls: "yd-mobile-search-block" });
  const inputRow = searchBlock.createDiv({ cls: "yd-mobile-search-row" });
  const input = inputRow.createEl("input", {
    type: "search",
    cls: "yd-mobile-search-input",
    attr: { placeholder: t("mobile.searchPlaceholder"), enterkeyhint: "search" }
  });
  const resultsEl = searchBlock.createDiv({ cls: "yd-mobile-search-results" });

  const runSearch = async () => {
    resultsEl.empty();
    const q = input.value.trim();
    if (!q) return;
    const hits = await searchMarkdownNotes(app, q, 50);
    if (hits.length === 0) {
      resultsEl.createDiv({ cls: "yd-empty-tip", text: t("mobile.noResults") });
      return;
    }
    const list = resultsEl.createDiv({ cls: "yd-mobile-search-list" });
    hits.forEach(({ file, display }) => {
      if (!(file instanceof TFile)) return;
      const row = list.createEl("button", { cls: "yd-mobile-search-hit", type: "button" });
      row.setText(display || file.basename);
      row.title = file.path;
      row.onclick = async () => {
        await quickEntriesSection.openLinkedNote(plugin, file.path);
      };
    });
  };

  const searchBtn = inputRow.createEl("button", {
    cls: "yd-mobile-search-submit",
    type: "button",
    text: t("common.search")
  });
  searchBtn.onclick = () => {
    runSearch();
  };
  input.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch();
    }
  };

  const stack = wrap.createDiv({ cls: "yd-mobile-quick-stack" });
  quickEntriesSection.renderMobileStack(stack, ctx);
}

function renderMobileDashboard(root, ctx) {
  root.addClass("yd-mobile-root");
  const dock = root.createDiv({ cls: "yd-mobile-dock" });
  renderTabBar(dock, ctx);
  const panel = root.createDiv({ cls: "yd-mobile-panel" });
  const tab = ctx.state.mobileTab || "today";
  if (tab === "today") renderToday(panel, ctx);
  else if (tab === "trackers") renderTrackers(panel, ctx);
  else if (tab === "tasks") renderTasks(panel, ctx);
  else renderLinks(panel, ctx);
}

module.exports = { renderMobileDashboard };
