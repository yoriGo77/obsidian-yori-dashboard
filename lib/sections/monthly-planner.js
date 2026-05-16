"use strict";

const obsidian = require("obsidian");
const { Notice, Menu, Platform } = obsidian;
const { formatDateKey, formatMonthKey, pad2, shiftYear, parseDateKey } = require("../date-utils");
const { makeId } = require("../store");
const { ConfirmModal, FullPageModal } = require("../ui-modals");
const { fitTextarea, ensureFocusInput, createIconButton } = require("../dom-utils");
const { createArchiveNote, buildArchiveBody } = require("../archive");
const { attachMobilePanelKeyboardScroll } = require("../mobile-composer-scroll");

const MONTH_LABELS_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTH_LABELS_ZH = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

function getMonthLabels(ctx) {
  const lang = ctx?.settings?.uiLanguage || ctx?.plugin?.settings?.uiLanguage || "zh";
  return lang === "en" ? MONTH_LABELS_EN : MONTH_LABELS_ZH;
}

function getMonthLabel(monthIndex, ctx) {
  return getMonthLabels(ctx)[monthIndex] || "";
}

function getEntries(settings, monthKey) {
  return (settings?.data?.monthlyPlanner?.[monthKey] || [])
    .slice()
    .sort((a, b) => a.order - b.order);
}

function setEntries(settings, monthKey, list) {
  if (!settings?.data) return;
  if (!settings.data.monthlyPlanner) settings.data.monthlyPlanner = {};
  if (!list || list.length === 0) {
    delete settings.data.monthlyPlanner[monthKey];
    return;
  }
  list.forEach((entry, idx) => { entry.order = idx; });
  settings.data.monthlyPlanner[monthKey] = list;
}

function createEntry(settings, monthKey, title) {
  const list = getEntries(settings, monthKey);
  const entry = {
    id: makeId("mp"),
    title: (title || "").trim(),
    order: list.length
  };
  list.push(entry);
  setEntries(settings, monthKey, list);
  return entry;
}

function updateEntry(settings, monthKey, entryId, partial) {
  const list = getEntries(settings, monthKey);
  const idx = list.findIndex((entry) => entry.id === entryId);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...partial };
  setEntries(settings, monthKey, list);
  return list[idx];
}

function deleteEntry(settings, monthKey, entryId) {
  const list = getEntries(settings, monthKey).filter((entry) => entry.id !== entryId);
  setEntries(settings, monthKey, list);
}

function copyEntry(settings, monthKey, entryId) {
  const list = getEntries(settings, monthKey);
  const entry = list.find((e) => e.id === entryId);
  return entry ? { title: entry.title } : null;
}

function pasteEntry(settings, monthKey, clip) {
  if (!clip || typeof clip.title !== "string") return null;
  return createEntry(settings, monthKey, clip.title);
}

function renderMonthlyPlannerSection(parent, ctx) {
  const { settings, t } = ctx;
  if (settings.showSection?.monthlyPlanner === false) return;
  const wrap = parent.createDiv({ cls: "yd-section yd-section-planner" });
  const header = wrap.createDiv({ cls: "yd-section-header yd-section-header-center" });
  header.createSpan({ cls: "yd-section-title", text: t("monthlyPlanner.title") });

  const focus = new Date();
  const currentMonthKey = formatMonthKey(focus);
  const map = settings?.data?.monthlyPlanner || {};
  const monthSet = new Set(Object.keys(map));
  monthSet.add(currentMonthKey);
  const monthKeys = Array.from(monthSet)
    .filter((mk) => /^\d{4}-\d{2}$/.test(mk))
    .sort();

  const list = wrap.createDiv({ cls: "yd-planner-section-list" });
  const limit = ctx.getLimit("monthlyPlanner");
  list.style.maxHeight = `${limit * 30 + 4}px`;

  let totalRendered = 0;
  let currentGroupEl = null;
  monthKeys.forEach((mk) => {
    const entries = getEntries(settings, mk);
    if (entries.length === 0 && mk !== currentMonthKey) return;
    const group = list.createDiv({ cls: "yd-planner-group" });
    if (mk === currentMonthKey) currentGroupEl = group;
    const [yearStr, monthStr] = mk.split("-");
    const monthIdx = parseInt(monthStr, 10) - 1;
    const monthLabel = getMonthLabel(monthIdx, ctx);
    const labelText = yearStr === String(focus.getFullYear())
      ? monthLabel
      : `${yearStr} ${monthLabel}`;
    group.createDiv({ cls: "yd-planner-month", text: labelText });
    if (entries.length === 0) {
      group.createDiv({ cls: "yd-empty-tip", text: t("common.empty") });
    } else {
      entries.forEach((entry) => renderEntryRow(group, entry, mk, ctx));
      totalRendered += entries.length;
    }
  });

  if (currentGroupEl) {
    requestAnimationFrame(() => {
      const listRect = list.getBoundingClientRect();
      const groupRect = currentGroupEl.getBoundingClientRect();
      list.scrollTop = list.scrollTop + (groupRect.top - listRect.top);
    });
  }

  if (totalRendered === 0 && monthKeys.length === 1) {
    // ensure something is shown when nothing exists yet (handled by empty tip above)
  }

  const addBtn = wrap.createEl("button", { cls: "yd-add-button", text: t("monthlyPlanner.addEntry") });
  addBtn.onclick = () => {
    addBtn.style.display = "none";
    const focusKey = ctx.state.focusDateKey || formatDateKey(new Date());
    const focusDate = parseDateKey(focusKey) || new Date();
    const defaultMonthKey = formatMonthKey(focusDate);
    renderMonthSelectComposer(wrap, defaultMonthKey, ctx, () => {
      addBtn.style.display = "";
      ctx.refresh();
    }, () => openYearlyView(ctx));
  };

  const footer = wrap.createDiv({ cls: "yd-section-footer" });
  createIconButton(footer, "more-horizontal", {
    cls: "yd-section-more-icon",
    label: t("common.more"),
    fallback: "···",
    onClick: () => openYearlyView(ctx)
  });
}

function renderEntryRow(parent, entry, monthKey, ctx) {
  const { t } = ctx;
  const row = parent.createDiv({ cls: "yd-planner-row" });
  row.createSpan({ cls: "yd-planner-bullet", text: "·" });
  const text = row.createDiv({ cls: "yd-planner-text", text: entry.title || t("common.unnamed") });
  text.onclick = () => {
    if (text.querySelector("textarea")) return;
    text.empty();
    const editor = text.createEl("textarea", { cls: "yd-event-editor" });
    editor.onclick = (evt) => evt.stopPropagation();
    editor.value = entry.title;
    fitTextarea(editor);
    ensureFocusInput(editor);
    let committed = false;
    const commit = async () => {
      if (committed) return;
      committed = true;
      const value = editor.value.trim();
      if (!value) deleteEntry(ctx.settings, monthKey, entry.id);
      else updateEntry(ctx.settings, monthKey, entry.id, { title: value });
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
    openEntryMenu(evt, entry, monthKey, ctx);
  };
}

function renderMonthSelectComposer(parent, defaultMonthKey, ctx, done, moreAction) {
  const { settings, t } = ctx;
  const wrap = parent.createDiv({ cls: "yd-task-composer yd-planner-composer" });
  parent.addClass("yd-section--composer-open");
  const headerRow = wrap.createDiv({ cls: "yd-composer-header" });
  const select = headerRow.createEl("select", { cls: "yd-select" });
  const focusYear = parseInt((defaultMonthKey || "").slice(0, 4), 10) || new Date().getFullYear();
  for (let m = 1; m <= 12; m += 1) {
    const monthKey = `${focusYear}-${pad2(m)}`;
    const option = select.createEl("option", { text: getMonthLabel(m - 1, ctx) });
    option.value = monthKey;
    if (monthKey === defaultMonthKey) option.selected = true;
  }
  if (defaultMonthKey) select.value = defaultMonthKey;

  let committed = false;
  let disposeKb = () => {};
  const cancel = () => {
    if (committed) return;
    committed = true;
    disposeKb();
    wrap.remove();
    parent.removeClass("yd-section--composer-open");
    done?.();
  };
  if (typeof moreAction === "function") {
    createIconButton(headerRow, "more-horizontal", {
      cls: "yd-section-more-icon yd-composer-more",
      label: t("common.more"),
      fallback: "···",
      onClick: () => {
        cancel();
        moreAction();
      }
    });
  }

  const editor = wrap.createEl("textarea", { cls: "yd-event-editor" });
  editor.placeholder = t("monthlyPlanner.placeholder");
  ensureFocusInput(editor);
  fitTextarea(editor);
  disposeKb = attachMobilePanelKeyboardScroll(wrap, [editor, select]);

  const finish = async () => {
    if (committed) return;
    committed = true;
    disposeKb();
    const value = editor.value.trim();
    const targetMonthKey = select.value;
    wrap.remove();
    parent.removeClass("yd-section--composer-open");
    if (value && targetMonthKey) {
      createEntry(settings, targetMonthKey, value);
      await ctx.save();
    }
    done?.();
  };
  editor.onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      finish();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };
  editor.oninput = () => fitTextarea(editor);
  wrap.addEventListener("focusout", (e) => {
    if (e.relatedTarget && wrap.contains(e.relatedTarget)) return;
    setTimeout(() => {
      if (!wrap.isConnected) return;
      if (document.activeElement && wrap.contains(document.activeElement)) return;
      finish();
    }, 0);
  });
}

function renderInlineEditor(parent, initial, onCommit, onCancel) {
  const wrap = parent.createDiv({ cls: "yd-inline-editor" });
  const editor = wrap.createEl("textarea", { cls: "yd-event-editor" });
  editor.value = initial || "";
  fitTextarea(editor);
  ensureFocusInput(editor);
  const disposeKb = attachMobilePanelKeyboardScroll(wrap, [editor]);
  let committed = false;
  const finish = async (value) => {
    if (committed) return;
    committed = true;
    disposeKb();
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
      disposeKb();
      wrap.remove();
      if (typeof onCancel === "function") onCancel();
    }
  };
  editor.oninput = () => fitTextarea(editor);
  editor.onblur = () => finish(editor.value.trim());
}

function openEntryMenu(evt, entry, monthKey, ctx) {
  const { t } = ctx;
  const menu = new Menu();
  menu.addItem((item) =>
    item.setTitle(t("monthlyPlanner.contextDelete")).onClick(async () => {
      deleteEntry(ctx.settings, monthKey, entry.id);
      await ctx.save();
      ctx.refresh();
    })
  );
  menu.showAtMouseEvent(evt);
}

function openYearlyView(ctx) {
  const { plugin, t } = ctx;
  if (!ctx.state.plannerYear) ctx.state.plannerYear = new Date().getFullYear();
  const modal = new FullPageModal(plugin.app, {
    title: t("monthlyPlanner.title"),
    titleClass: "yd-planner-modal",
    render: (root, instance) => renderYearlyView(root, ctx, instance)
  });
  modal.open();
}

function renderYearlyView(root, ctx, modal) {
  root.empty();
  const { settings, t } = ctx;
  const year = ctx.state.plannerYear;
  const top = root.createDiv({ cls: "yd-history-top" });
  createIconButton(top, "chevron-left", {
    cls: "yd-mini-arrow",
    fallback: "‹",
    onClick: () => {
      ctx.state.plannerYear = shiftYear(year, -1);
      renderYearlyView(root, ctx, modal);
    }
  });
  top.createDiv({ cls: "yd-history-title", text: t("monthlyPlanner.yearTitle", { year }) });
  createIconButton(top, "chevron-right", {
    cls: "yd-mini-arrow",
    fallback: "›",
    onClick: () => {
      ctx.state.plannerYear = shiftYear(year, 1);
      renderYearlyView(root, ctx, modal);
    }
  });
  createIconButton(top, "archive", {
    cls: "yd-section-more-icon yd-history-archive",
    label: t("common.archive"),
    fallback: "⊟",
    onClick: () => archiveYear(ctx, year, () => renderYearlyView(root, ctx, modal))
  });
  top.oncontextmenu = (evt) => {
    evt.preventDefault();
    const menu = new Menu();
    menu.addItem((mi) =>
      mi.setTitle(t("common.backToYear")).onClick(() => {
        ctx.state.plannerYear = new Date().getFullYear();
        renderYearlyView(root, ctx, modal);
      })
    );
    menu.showAtMouseEvent(evt);
  };

  const grid = root.createDiv({ cls: "yd-planner-grid" });
  const modalCtx = Object.assign({}, ctx, {
    refresh: () => {
      ctx.refresh();
      renderYearlyView(root, ctx, modal);
    }
  });
  const isMobilePlanner = !!Platform?.isMobile;
  for (let m = 0; m < 12; m += 1) {
    const monthKey = `${year}-${pad2(m + 1)}`;
    const col = grid.createDiv({ cls: "yd-planner-cell" });
    let addBtn;
    if (isMobilePlanner) {
      const cellHead = col.createDiv({ cls: "yd-planner-cell-head" });
      cellHead.createDiv({ cls: "yd-planner-month", text: getMonthLabel(m, ctx) });
      addBtn = cellHead.createEl("button", {
        cls: "yd-add-button yd-planner-head-add",
        text: t("common.sectionAdd")
      });
    } else {
      col.createDiv({ cls: "yd-planner-month", text: getMonthLabel(m, ctx) });
    }
    const list = col.createDiv({ cls: "yd-planner-list" });
    getEntries(settings, monthKey).forEach((entry) =>
      renderEntryRow(list, entry, monthKey, modalCtx)
    );
    if (!isMobilePlanner) {
      addBtn = col.createEl("button", { cls: "yd-add-button", text: t("monthlyPlanner.addShort") });
    }
    addBtn.onclick = () => {
      if (!isMobilePlanner) addBtn.style.display = "none";
      renderInlineEditor(col, "", async (value) => {
        if (!isMobilePlanner) addBtn.style.display = "";
        if (!value) return;
        createEntry(settings, monthKey, value);
        await ctx.save();
        renderYearlyView(root, ctx, modal);
      }, () => {
        if (!isMobilePlanner) addBtn.style.display = "";
      });
    };
  }
}

function archiveYear(ctx, year, refresh) {
  const { plugin, t } = ctx;
  const modal = new ConfirmModal(plugin.app, {
    title: t("common.archive"),
    message: t("monthlyPlanner.archiveYearPrompt", { year }),
    confirmText: t("common.archive"),
    cancelText: t("common.cancel"),
    onConfirm: async () => {
      const sections = [];
      for (let m = 0; m < 12; m += 1) {
        const monthKey = `${year}-${pad2(m + 1)}`;
        const entries = getEntries(ctx.settings, monthKey);
        sections.push({
          heading: `${getMonthLabel(m, ctx)} (${monthKey})`,
          lines: entries.length === 0 ? ["(空)"] : entries.map((entry) => `- ${entry.title || ""}`)
        });
      }
      const body = buildArchiveBody(
        [t("monthlyPlanner.archiveDateLine", { date: formatDateKey(new Date()) })],
        sections
      );
      const file = await createArchiveNote(plugin.app, {
        folder: ctx.settings.archiveFolder,
        fileName: t("monthlyPlanner.archiveTitle", { year }),
        content: body,
        notice: false,
        openOnCreate: false
      });
      new Notice(t("monthlyPlanner.archiveCreated", { path: file.path }));
      if (typeof refresh === "function") refresh();
    }
  });
  modal.open();
}

module.exports = {
  render: renderMonthlyPlannerSection,
  openYearlyView,
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  copyEntry,
  pasteEntry
};
