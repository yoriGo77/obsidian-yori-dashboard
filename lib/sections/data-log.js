"use strict";

const obsidian = require("obsidian");
const { Notice, Setting, Menu } = obsidian;
const {
  formatDateKey,
  formatMonthKey,
  parseMonthKey,
  shiftMonth,
  getDaysInMonth,
  pad2
} = require("../date-utils");
const { makeId } = require("../store");
const { ConfirmModal, FullPageModal } = require("../ui-modals");
const { ensureFocusInput, createIconButton } = require("../dom-utils");
const { createArchiveNote, buildArchiveBody } = require("../archive");

const NAME_DISPLAY_LIMIT = 4;

function clipName(name, limit) {
  const max = Number.isFinite(limit) ? limit : NAME_DISPLAY_LIMIT;
  if (typeof name !== "string") return "";
  if (Array.from(name).length <= max) return name;
  return Array.from(name).slice(0, max).join("") + "...";
}

function getValue(settings, itemId, dateKey) {
  const map = settings?.data?.dataLog?.values?.[itemId];
  return map ? map[dateKey] : undefined;
}

function setValue(settings, itemId, dateKey, value) {
  if (!settings?.data?.dataLog) return;
  if (!settings.data.dataLog.values) settings.data.dataLog.values = {};
  if (!settings.data.dataLog.values[itemId]) settings.data.dataLog.values[itemId] = {};
  if (value === "" || value === null || value === undefined) {
    delete settings.data.dataLog.values[itemId][dateKey];
    return;
  }
  settings.data.dataLog.values[itemId][dateKey] = `${value}`;
}

function todaySnapshot(settings, dateKey) {
  return (settings?.data?.dataLog?.items || []).map((item) => ({
    item,
    value: getValue(settings, item.id, dateKey)
  }));
}

function renderDataLogSection(parent, ctx) {
  const { settings, t } = ctx;
  const wrap = parent.createDiv({ cls: "yd-section yd-section-datalog" });
  const header = wrap.createDiv({ cls: "yd-section-header yd-section-header-center" });
  header.createSpan({ cls: "yd-section-title", text: t("section.dataLog") });
  createIconButton(header, "sliders-horizontal", {
    cls: "yd-section-icon",
    label: t("common.settings"),
    fallback: "≡",
    onClick: () => openDataLogSettings(ctx)
  });

  const dateKey = ctx.state.focusDateKey || formatDateKey(new Date());
  const list = wrap.createDiv({ cls: "yd-datalog-list" });
  const limit = ctx.getLimit("dataLog");
  const rows = todaySnapshot(settings, dateKey);
  rows.slice(0, limit).forEach(({ item, value }) => {
    renderDataLogRow(list, item, value, dateKey, ctx);
  });
  if (rows.length > limit) {
    list.createDiv({ cls: "yd-events-overflow", text: `+ ${rows.length - limit}` });
  }
  if (rows.length === 0) {
    list.createDiv({ cls: "yd-empty-tip", text: t("common.empty") });
  }
}

function renderDataLogRow(parent, item, value, dateKey, ctx) {
  const row = parent.createDiv({ cls: "yd-datalog-row" });
  const nameEl = row.createDiv({ cls: "yd-datalog-name" });
  nameEl.setText(clipName(item.name || ""));
  if ((item.name || "").length > NAME_DISPLAY_LIMIT) {
    nameEl.setAttribute("title", item.name);
  }
  const valueEl = row.createDiv({ cls: "yd-datalog-value" });
  const display = value === undefined || value === "" ? "-" : value;
  valueEl.setText(display);
  valueEl.onclick = () => {
    if (valueEl.querySelector("input")) return;
    valueEl.empty();
    const input = valueEl.createEl("input", { cls: "yd-inline-input", type: "text" });
    input.onclick = (evt) => evt.stopPropagation();
    input.value = value || "";
    ensureFocusInput(input);
    let committed = false;
    const commit = async () => {
      if (committed) return;
      committed = true;
      setValue(ctx.settings, item.id, dateKey, input.value.trim());
      await ctx.save();
      ctx.refresh();
    };
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        ctx.refresh();
      }
    };
    input.onblur = commit;
  };
  createIconButton(row, "more-horizontal", {
    cls: "yd-datalog-more",
    label: ctx.t("dataLog.viewMore"),
    fallback: "···",
    onClick: () => openMonthHistory(ctx, item)
  });
}

function openMonthHistory(ctx, item) {
  const { plugin, t } = ctx;
  const stateKey = `dl_history_${item.id}`;
  if (!ctx.state[stateKey]) ctx.state[stateKey] = formatMonthKey(new Date());
  const modal = new FullPageModal(plugin.app, {
    title: `${item.name} · ${t("section.dataLog")}`,
    titleClass: "yd-history-modal",
    render: (root, instance) => renderMonthHistory(root, ctx, item, stateKey, instance)
  });
  modal.open();
}

function renderMonthHistory(root, ctx, item, stateKey, modal) {
  root.empty();
  const { settings, t } = ctx;
  const monthKey = ctx.state[stateKey];
  const date = parseMonthKey(monthKey) || new Date();
  const year = date.getFullYear();
  const monthIndex = date.getMonth();

  const top = root.createDiv({ cls: "yd-history-top" });
  createIconButton(top, "chevron-left", {
    cls: "yd-mini-arrow",
    fallback: "‹",
    onClick: () => {
      const shifted = shiftMonth(year, monthIndex, -1);
      ctx.state[stateKey] = `${shifted.year}-${pad2(shifted.monthIndex + 1)}`;
      renderMonthHistory(root, ctx, item, stateKey, modal);
    }
  });
  top.createDiv({ cls: "yd-history-title", text: `${year}-${pad2(monthIndex + 1)}` });
  createIconButton(top, "chevron-right", {
    cls: "yd-mini-arrow",
    fallback: "›",
    onClick: () => {
      const shifted = shiftMonth(year, monthIndex, 1);
      ctx.state[stateKey] = `${shifted.year}-${pad2(shifted.monthIndex + 1)}`;
      renderMonthHistory(root, ctx, item, stateKey, modal);
    }
  });
  createIconButton(top, "archive", {
    cls: "yd-section-more-icon",
    label: t("common.archive"),
    fallback: "⊟",
    onClick: () => archiveMonth(ctx, item, year, monthIndex)
  });
  top.oncontextmenu = (evt) => {
    evt.preventDefault();
    const menu = new Menu();
    menu.addItem((mi) =>
      mi.setTitle(t("common.backToMonth")).onClick(() => {
        const now = new Date();
        ctx.state[stateKey] = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
        renderMonthHistory(root, ctx, item, stateKey, modal);
      })
    );
    menu.showAtMouseEvent(evt);
  };

  const grid = root.createDiv({ cls: "yd-history-grid" });
  const days = getDaysInMonth(year, monthIndex);
  let hasAny = false;
  for (let day = 1; day <= days; day += 1) {
    const dateKey = `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
    const value = getValue(settings, item.id, dateKey);
    if (value !== undefined && value !== "") hasAny = true;
    const cell = grid.createDiv({ cls: "yd-history-cell" });
    cell.createSpan({ cls: "yd-history-date", text: `${monthIndex + 1}/${day}` });
    const valueEl = cell.createSpan({ cls: "yd-history-value" });
    valueEl.setText(value === undefined || value === "" ? "-" : value);
    valueEl.onclick = () => {
      if (valueEl.querySelector("input")) return;
      valueEl.empty();
      const input = valueEl.createEl("input", { cls: "yd-inline-input", type: "text" });
      input.onclick = (evt) => evt.stopPropagation();
      input.value = value || "";
      ensureFocusInput(input);
      let committed = false;
      const commit = async () => {
        if (committed) return;
        committed = true;
        setValue(ctx.settings, item.id, dateKey, input.value.trim());
        await ctx.save();
        renderMonthHistory(root, ctx, item, stateKey, modal);
      };
      input.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          renderMonthHistory(root, ctx, item, stateKey, modal);
        }
      };
      input.onblur = commit;
    };
  }
  if (!hasAny) {
    root.createDiv({
      cls: "yd-empty-tip",
      text: t("dataLog.empty", {
        month: `${year}-${pad2(monthIndex + 1)}`,
        name: item.name
      })
    });
  }
}

function archiveMonth(ctx, item, year, monthIndex) {
  const { plugin, t } = ctx;
  const fileName = t("dataLog.archiveTitle", {
    month: `${year}-${pad2(monthIndex + 1)}`,
    name: item.name
  });
  const lines = [];
  const days = getDaysInMonth(year, monthIndex);
  for (let day = 1; day <= days; day += 1) {
    const dateKey = `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
    const value = getValue(ctx.settings, item.id, dateKey);
    lines.push(`- ${dateKey} : ${value === undefined || value === "" ? "-" : value}`);
  }
  const content = buildArchiveBody(
    [t("dataLog.archiveDateLine", { date: formatDateKey(new Date()) })],
    [{ heading: `${item.name} · ${year}-${pad2(monthIndex + 1)}`, lines }]
  );
  createArchiveNote(plugin.app, {
    folder: ctx.settings.archiveFolder,
    fileName,
    content,
    notice: false,
    openOnCreate: false
  }).then((file) => {
    new Notice(t("dataLog.archiveCreated", { path: file.path }));
  });
}

function openDataLogSettings(ctx) {
  const { plugin, t } = ctx;
  const modal = new FullPageModal(plugin.app, {
    title: t("dataLog.settingsTitle"),
    titleClass: "yd-settings-modal",
    render: (root, instance) => renderDataLogSettings(root, ctx, instance),
    onClose: () => finalizeDataLogSettings(ctx)
  });
  modal.open();
}

async function finalizeDataLogSettings(ctx) {
  const items = ctx.settings?.data?.dataLog?.items;
  if (!Array.isArray(items)) return;
  const filtered = items.filter((item) => (item.name || "").trim());
  filtered.forEach((item, idx) => { item.order = idx; });
  ctx.settings.data.dataLog.items = filtered;
  await ctx.save();
  ctx.refresh();
}

function renderDataLogSettings(root, ctx, modal) {
  root.empty();
  const { settings, t } = ctx;
  root.createDiv({ cls: "yd-settings-desc", text: t("dataLog.settingsDesc") });
  root.createDiv({ cls: "yd-settings-hint", text: t("dataLog.settingsHint") });

  const list = root.createDiv({ cls: "yd-settings-list" });
  const items = settings.data.dataLog.items;

  items.forEach((item, idx) => {
    const row = list.createDiv({ cls: "yd-settings-row" });
    const drag = row.createDiv({ cls: "yd-drag-handle" });
    createIconButton(drag, "grip-vertical", { cls: "yd-drag-handle-icon", fallback: "⋮⋮" });
    drag.setAttribute("draggable", "true");
    drag.addEventListener("dragstart", (e) => {
      e.dataTransfer?.setData("text/plain", `${idx}`);
      row.addClass("is-dragging");
    });
    drag.addEventListener("dragend", () => row.removeClass("is-dragging"));
    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      row.addClass("is-drop-target");
    });
    row.addEventListener("dragleave", () => row.removeClass("is-drop-target"));
    row.addEventListener("drop", async (e) => {
      e.preventDefault();
      row.removeClass("is-drop-target");
      const fromIdx = Number(e.dataTransfer?.getData("text/plain"));
      if (!Number.isFinite(fromIdx) || fromIdx === idx) return;
      const moved = items.splice(fromIdx, 1)[0];
      items.splice(idx, 0, moved);
      items.forEach((entry, i) => { entry.order = i; });
      await ctx.save();
      renderDataLogSettings(root, ctx, modal);
    });

    const input = row.createEl("input", { type: "text", cls: "yd-settings-input" });
    input.value = item.name;
    input.placeholder = t("dataLog.placeholder");
    input.onchange = async () => {
      item.name = input.value.trim();
      await ctx.save();
    };
    const delBtn = createIconButton(row, "x", {
      cls: "yd-settings-delete",
      label: t("common.delete"),
      fallback: "✕"
    });
    delBtn.onclick = () => {
      const confirm = new ConfirmModal(ctx.plugin.app, {
        title: t("common.delete"),
        message: t("dataLog.deleteConfirm", { name: item.name || t("common.unnamed") }),
        confirmText: t("common.delete"),
        cancelText: t("common.cancel"),
        warning: true,
        onConfirm: async () => {
          const removeIdx = items.findIndex((entry) => entry.id === item.id);
          if (removeIdx >= 0) items.splice(removeIdx, 1);
          items.forEach((entry, i) => { entry.order = i; });
          if (settings.data.dataLog.values && settings.data.dataLog.values[item.id]) {
            delete settings.data.dataLog.values[item.id];
          }
          await ctx.save();
          renderDataLogSettings(root, ctx, modal);
        }
      });
      confirm.open();
    };
  });

  const addBtn = root.createEl("button", { cls: "yd-add-button", text: t("dataLog.addItem") });
  addBtn.onclick = async () => {
    items.push({ id: makeId("dl"), name: "", notePath: "", order: items.length });
    await ctx.save();
    renderDataLogSettings(root, ctx, modal);
  };

  const actions = root.createDiv({ cls: "yd-modal-actions yd-modal-actions-end" });
  const closeBtn = actions.createEl("button", { cls: "yd-modal-confirm", text: t("common.confirm") });
  closeBtn.onclick = () => modal.close();
}

module.exports = {
  render: renderDataLogSection,
  openSettings: openDataLogSettings,
  openMonthHistory,
  getValue,
  setValue
};
