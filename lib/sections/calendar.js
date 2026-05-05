"use strict";

const obsidian = require("obsidian");
const { Notice, Menu } = obsidian;
const {
  formatDateKey,
  parseDateKey,
  getMonthMatrix,
  shiftMonth,
  getMondayOf,
  formatYearKey
} = require("../date-utils");
const { makeId } = require("../store");
const { ConfirmModal, FullPageModal } = require("../ui-modals");
const { fitTextarea, ensureFocusInput, createIconButton } = require("../dom-utils");
const { createArchiveNote, buildArchiveBody } = require("../archive");

const WEEK_LABELS_ZH = ["一", "二", "三", "四", "五", "六", "日"];
const WEEK_LABELS_EN = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES_ZH = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月"
];
const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const MONTH_SHORT_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function getMonthLabel(year, monthIndex, lang) {
  if (lang === "en") return `${MONTH_NAMES_EN[monthIndex]} ${year}`;
  return `${year}年${MONTH_NAMES_ZH[monthIndex]}`;
}

function getDayHeader(date, lang) {
  const d = new Date(date);
  const monthShort = MONTH_SHORT_EN[d.getMonth()];
  const dayNum = d.getDate();
  if (lang === "en") {
    return `${monthShort}.${dayNum} ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]}`;
  }
  const weekday = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][d.getDay()];
  return `${d.getMonth() + 1}月${dayNum}日\u3000${weekday}`;
}

function getWeekDayLabels(lang) {
  return lang === "en" ? WEEK_LABELS_EN : WEEK_LABELS_ZH;
}

function getEventList(settings, dateKey) {
  const map = settings?.data?.dailyEvents || {};
  const list = Array.isArray(map[dateKey]) ? map[dateKey] : [];
  return list.slice().sort((a, b) => a.order - b.order);
}

function setEventList(settings, dateKey, list) {
  if (!settings?.data) return;
  if (!settings.data.dailyEvents) settings.data.dailyEvents = {};
  if (!list || list.length === 0) {
    delete settings.data.dailyEvents[dateKey];
    return;
  }
  list.forEach((event, idx) => {
    event.order = idx;
  });
  settings.data.dailyEvents[dateKey] = list;
}

function createEvent(settings, dateKey, title) {
  const list = getEventList(settings, dateKey);
  const event = {
    id: makeId("evt"),
    title: (title || "").trim(),
    completed: false,
    order: list.length
  };
  list.push(event);
  setEventList(settings, dateKey, list);
  return event;
}

function updateEvent(settings, dateKey, eventId, partial) {
  const list = getEventList(settings, dateKey);
  const idx = list.findIndex((event) => event.id === eventId);
  if (idx === -1) return null;
  const updated = { ...list[idx], ...partial };
  list[idx] = updated;
  setEventList(settings, dateKey, list);
  return updated;
}

function deleteEvent(settings, dateKey, eventId) {
  const list = getEventList(settings, dateKey).filter((event) => event.id !== eventId);
  setEventList(settings, dateKey, list);
}

function copyEvent(settings, dateKey, eventId) {
  const list = getEventList(settings, dateKey);
  const event = list.find((e) => e.id === eventId);
  if (!event) return null;
  return { title: event.title, completed: false };
}

function pasteEvent(settings, dateKey, clipboard) {
  if (!clipboard || typeof clipboard.title !== "string") return null;
  return createEvent(settings, dateKey, clipboard.title);
}

function renderCalendarSection(parent, ctx) {
  const { t } = ctx;
  const wrap = parent.createDiv({ cls: "yd-section yd-section-calendar" });
  const body = wrap.createDiv({ cls: "yd-calendar-body" });
  const calCol = body.createDiv({ cls: "yd-calendar-mini" });
  const eventsCol = body.createDiv({ cls: "yd-calendar-events" });
  renderMiniCalendar(calCol, ctx);
  renderDayEvents(eventsCol, ctx);
  createIconButton(wrap, "more-horizontal", {
    cls: "yd-section-more-icon yd-calendar-more",
    label: t("common.more"),
    fallback: "···",
    onClick: () => openWeeklyModal(ctx)
  });
}

function renderMiniCalendar(parent, ctx) {
  const { settings, t } = ctx;
  parent.empty();
  const lang = settings.uiLanguage || "zh";
  const focus = parseDateKey(ctx.state.focusDateKey) || new Date();
  const year = ctx.state.miniYear ?? focus.getFullYear();
  const monthIndex = ctx.state.miniMonthIndex ?? focus.getMonth();
  ctx.state.miniYear = year;
  ctx.state.miniMonthIndex = monthIndex;

  const head = parent.createDiv({ cls: "yd-mini-head" });
  createIconButton(head, "chevron-left", {
    cls: "yd-mini-arrow",
    fallback: "‹",
    onClick: () => {
      const shifted = shiftMonth(year, monthIndex, -1);
      ctx.state.miniYear = shifted.year;
      ctx.state.miniMonthIndex = shifted.monthIndex;
      ctx.refresh();
    }
  });
  head.createDiv({ cls: "yd-mini-label", text: getMonthLabel(year, monthIndex, lang) });
  createIconButton(head, "chevron-right", {
    cls: "yd-mini-arrow",
    fallback: "›",
    onClick: () => {
      const shifted = shiftMonth(year, monthIndex, 1);
      ctx.state.miniYear = shifted.year;
      ctx.state.miniMonthIndex = shifted.monthIndex;
      ctx.refresh();
    }
  });
  head.oncontextmenu = (evt) => {
    evt.preventDefault();
    const menu = new Menu();
    menu.addItem((item) =>
      item.setTitle(t("common.backToToday")).onClick(() => {
        const today = new Date();
        ctx.state.focusDateKey = formatDateKey(today);
        ctx.state.miniYear = today.getFullYear();
        ctx.state.miniMonthIndex = today.getMonth();
        ctx.refresh();
      })
    );
    menu.showAtMouseEvent(evt);
  };

  const labels = getWeekDayLabels(lang);
  const grid = parent.createDiv({ cls: "yd-mini-grid" });
  labels.forEach((label) => {
    grid.createDiv({ cls: "yd-mini-weekday", text: label });
  });
  const focusKey = ctx.state.focusDateKey || formatDateKey(new Date());
  const todayKey = formatDateKey(new Date());
  const cells = getMonthMatrix(year, monthIndex);
  cells.forEach((cell) => {
    const dateKey = formatDateKey(new Date(cell.year, cell.monthIndex, cell.day));
    const cellEl = grid.createDiv({ cls: "yd-mini-cell", text: `${cell.day}` });
    if (!cell.inMonth) cellEl.addClass("is-out");
    if (dateKey === todayKey) cellEl.addClass("is-today");
    if (dateKey === focusKey) cellEl.addClass("is-focus");
    cellEl.onclick = () => {
      ctx.state.focusDateKey = dateKey;
      ctx.state.miniYear = cell.year;
      ctx.state.miniMonthIndex = cell.monthIndex;
      ctx.refresh();
    };
  });
}

function renderDayEvents(parent, ctx) {
  const { settings, t } = ctx;
  parent.empty();
  const lang = settings.uiLanguage || "zh";
  const dateKey = ctx.state.focusDateKey || formatDateKey(new Date());
  const date = parseDateKey(dateKey) || new Date();

  const events = getEventList(settings, dateKey);
  const undoneCount = events.filter((event) => !event.completed).length;
  const countText = lang === "zh" ? `（${undoneCount}）` : `(${undoneCount})`;
  const head = parent.createDiv({ cls: "yd-events-head" });
  head.createDiv({
    cls: "yd-events-date",
    text: `${getDayHeader(date, lang)} ${countText}`
  });

  const list = parent.createDiv({ cls: "yd-events-list" });
  const limit = ctx.getLimit("dailyEvents");
  list.style.maxHeight = `${limit * 30 + 4}px`;
  events.forEach((event) => {
    renderEventRow(list, event, dateKey, ctx);
  });

  const addBtn = parent.createEl("button", {
    cls: "yd-add-button",
    text: t("calendar.addEvent")
  });
  addBtn.onclick = () => {
    addBtn.style.display = "none";
    renderInlineEditor(parent, "", async (value) => {
      addBtn.style.display = "";
      if (!value) return;
      createEvent(settings, dateKey, value);
      await ctx.save();
      ctx.refresh();
    }, () => {
      addBtn.style.display = "";
    });
  };
}

function renderEventRow(parent, event, dateKey, ctx) {
  const { settings, t } = ctx;
  const row = parent.createDiv({ cls: "yd-event-row" });
  const checkbox = row.createEl("input", { type: "checkbox" });
  checkbox.checked = !!event.completed;
  checkbox.onclick = (evt) => evt.stopPropagation();
  checkbox.onchange = async () => {
    updateEvent(settings, dateKey, event.id, { completed: checkbox.checked });
    await ctx.save();
    ctx.refresh();
  };
  if (event.completed) row.addClass("is-done");

  const text = row.createDiv({ cls: "yd-event-text", text: event.title || t("common.unnamed") });
  text.onclick = () => {
    if (text.querySelector("textarea")) return;
    text.empty();
    const editor = text.createEl("textarea", { cls: "yd-event-editor" });
    editor.onclick = (evt) => evt.stopPropagation();
    editor.value = event.title;
    fitTextarea(editor);
    ensureFocusInput(editor);
    let committed = false;
    const commit = async () => {
      if (committed) return;
      committed = true;
      const value = editor.value.trim();
      if (!value) {
        deleteEvent(settings, dateKey, event.id);
      } else {
        updateEvent(settings, dateKey, event.id, { title: value });
      }
      await ctx.save();
      ctx.refresh();
    };
    editor.onkeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        ctx.refresh();
      }
    };
    editor.oninput = () => fitTextarea(editor);
    editor.onblur = commit;
  };

  row.oncontextmenu = (evt) => {
    evt.preventDefault();
    openEventMenu(evt, event, dateKey, ctx);
  };
}

function renderInlineEditor(parent, initial, onCommit, onCancel) {
  const wrap = parent.createDiv({ cls: "yd-inline-editor" });
  const editor = wrap.createEl("textarea", { cls: "yd-event-editor" });
  editor.value = initial || "";
  fitTextarea(editor);
  ensureFocusInput(editor);
  let committed = false;
  const finish = async (value) => {
    if (committed) return;
    committed = true;
    wrap.remove();
    await onCommit(value);
  };
  editor.onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      finish(editor.value.trim());
    } else if (e.key === "Escape") {
      e.preventDefault();
      committed = true;
      wrap.remove();
      if (typeof onCancel === "function") onCancel();
    }
  };
  editor.oninput = () => fitTextarea(editor);
  editor.onblur = () => finish(editor.value.trim());
}

function openEventMenu(evt, event, dateKey, ctx) {
  const { t, plugin } = ctx;
  const menu = new Menu();
  menu.addItem((item) =>
    item.setTitle(t("calendar.contextDelete")).onClick(() => {
      const modal = new ConfirmModal(plugin.app, {
        title: t("calendar.deleteConfirmTitle"),
        message: t("calendar.deleteConfirmMsg", { title: event.title || t("common.unnamed") }),
        confirmText: t("common.delete"),
        cancelText: t("common.cancel"),
        warning: true,
        onConfirm: async () => {
          deleteEvent(ctx.settings, dateKey, event.id);
          await ctx.save();
          ctx.refresh();
        }
      });
      modal.open();
    })
  );
  menu.showAtMouseEvent(evt);
}

function openWeeklyModal(ctx) {
  const { plugin, t } = ctx;
  const modal = new FullPageModal(plugin.app, {
    title: t("calendar.weekTitle"),
    titleClass: "yd-week-modal",
    render: (root, instance) => renderWeeklyView(root, ctx, instance)
  });
  modal.open();
}

function renderWeeklyView(root, ctx, modal) {
  root.empty();
  const { settings, t } = ctx;
  const lang = settings.uiLanguage || "zh";
  const focus = parseDateKey(ctx.state.weekAnchorKey) || parseDateKey(ctx.state.focusDateKey) || new Date();
  const monday = getMondayOf(focus);
  ctx.state.weekAnchorKey = formatDateKey(monday);

  const top = root.createDiv({ cls: "yd-week-top" });
  const nav = top.createDiv({ cls: "yd-week-nav" });
  createIconButton(nav, "chevron-left", {
    cls: "yd-mini-arrow",
    fallback: "‹",
    onClick: () => {
      const shifted = new Date(monday);
      shifted.setDate(shifted.getDate() - 7);
      ctx.state.weekAnchorKey = formatDateKey(shifted);
      renderWeeklyView(root, ctx, modal);
    }
  });
  const sundayDate = new Date(monday);
  sundayDate.setDate(monday.getDate() + 6);
  nav.createDiv({
    cls: "yd-week-range",
    text: `${formatDateKey(monday)} - ${formatDateKey(sundayDate)}`
  });
  createIconButton(nav, "chevron-right", {
    cls: "yd-mini-arrow",
    fallback: "›",
    onClick: () => {
      const shifted = new Date(monday);
      shifted.setDate(shifted.getDate() + 7);
      ctx.state.weekAnchorKey = formatDateKey(shifted);
      renderWeeklyView(root, ctx, modal);
    }
  });
  createIconButton(top, "archive", {
    cls: "yd-section-more-icon",
    label: t("calendar.weekArchive"),
    fallback: "⊟",
    onClick: () => archiveWeek(ctx, monday, sundayDate)
  });
  top.oncontextmenu = (evt) => {
    evt.preventDefault();
    const menu = new Menu();
    menu.addItem((item) =>
      item.setTitle(t("common.backToWeek")).onClick(() => {
        const todayMonday = getMondayOf(new Date());
        ctx.state.weekAnchorKey = formatDateKey(todayMonday);
        renderWeeklyView(root, ctx, modal);
      })
    );
    menu.showAtMouseEvent(evt);
  };

  const grid = root.createDiv({ cls: "yd-week-grid" });
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const dateKey = formatDateKey(day);
    const col = grid.createDiv({ cls: "yd-week-col" });
    const head = col.createDiv({ cls: "yd-week-col-head" });
    const dayLabel = head.createDiv({ cls: "yd-week-col-day" });
    dayLabel.setText(getDayHeader(day, lang));
    dayLabel.onclick = () => {
      ctx.state.focusDateKey = dateKey;
      ctx.state.miniYear = day.getFullYear();
      ctx.state.miniMonthIndex = day.getMonth();
      modal.close();
      ctx.refresh();
    };
    const list = col.createDiv({ cls: "yd-week-list" });
    const events = getEventList(ctx.settings, dateKey);
    const modalCtx = Object.assign({}, ctx, {
      refresh: () => {
        ctx.refresh();
        renderWeeklyView(root, ctx, modal);
      }
    });
    events.forEach((event) => {
      renderEventRow(list, event, dateKey, modalCtx);
    });
    const addBtn = col.createEl("button", { cls: "yd-add-button", text: t("calendar.weekAddEvent") });
    addBtn.onclick = () => {
      addBtn.style.display = "none";
      renderInlineEditor(col, "", async (value) => {
        addBtn.style.display = "";
        if (!value) return;
        createEvent(ctx.settings, dateKey, value);
        await ctx.save();
        renderWeeklyView(root, ctx, modal);
      }, () => {
        addBtn.style.display = "";
      });
    };
  }
}

function archiveWeek(ctx, monday, sunday) {
  const { plugin, t } = ctx;
  const modal = new ConfirmModal(plugin.app, {
    title: t("calendar.weekArchive"),
    message: `${formatDateKey(monday)} - ${formatDateKey(sunday)}`,
    confirmText: t("common.archive"),
    cancelText: t("common.cancel"),
    onConfirm: async () => {
      const startKey = formatDateKey(monday);
      const endKey = formatDateKey(sunday);
      const fileName = t("calendar.archiveNoteTitle", { start: startKey, end: endKey });
      const sections = [];
      for (let i = 0; i < 7; i += 1) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        const dateKey = formatDateKey(day);
        const events = getEventList(ctx.settings, dateKey);
        sections.push({
          heading: dateKey,
          lines: events.length === 0
            ? ["(空)"]
            : events.map((event) => `- [${event.completed ? "x" : " "}] ${event.title || ""}`)
        });
      }
      const body = buildArchiveBody(
        [
          t("calendar.archivePlanLine", { range: `${startKey} ~ ${endKey}` }),
          t("calendar.archiveDateLine", { date: formatDateKey(new Date()) })
        ],
        sections
      );
      const file = await createArchiveNote(plugin.app, {
        folder: ctx.settings.archiveFolder,
        fileName,
        content: body,
        notice: false,
        openOnCreate: false
      });
      new Notice(t("calendar.archiveCreated", { path: file.path }));
    }
  });
  modal.open();
}

module.exports = {
  render: renderCalendarSection,
  openWeeklyModal,
  getEventList,
  setEventList,
  createEvent,
  updateEvent,
  deleteEvent,
  copyEvent,
  pasteEvent
};
