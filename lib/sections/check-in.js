"use strict";

const obsidian = require("obsidian");
const { Notice, Menu } = obsidian;
const {
  formatDateKey,
  parseMonthKey,
  getDaysInMonth,
  shiftMonth,
  pad2
} = require("../date-utils");
const { makeId } = require("../store");
const { ConfirmModal, FullPageModal } = require("../ui-modals");
const { PALETTE } = require("../constants");
const { withAlpha } = require("../color-utils");
const { createIconButton } = require("../dom-utils");

function getItems(settings) {
  return (settings?.data?.checkIn?.items || [])
    .filter((item) => !item.deleted)
    .slice()
    .sort((a, b) => a.order - b.order);
}

function getAllItems(settings) {
  return (settings?.data?.checkIn?.items || []).slice().sort((a, b) => a.order - b.order);
}

function isChecked(settings, itemId, dateKey) {
  return !!settings?.data?.checkIn?.records?.[itemId]?.[dateKey];
}

function setChecked(settings, itemId, dateKey, value) {
  if (!settings?.data?.checkIn) return;
  if (!settings.data.checkIn.records) settings.data.checkIn.records = {};
  if (!settings.data.checkIn.records[itemId]) settings.data.checkIn.records[itemId] = {};
  if (value) settings.data.checkIn.records[itemId][dateKey] = true;
  else delete settings.data.checkIn.records[itemId][dateKey];
}

function countMonth(settings, itemId, year, monthIndex) {
  const map = settings?.data?.checkIn?.records?.[itemId] || {};
  let done = 0;
  for (const key of Object.keys(map)) {
    const parts = key.split("-");
    if (parts.length !== 3) continue;
    if (Number(parts[0]) !== year) continue;
    if (Number(parts[1]) !== monthIndex + 1) continue;
    if (map[key]) done += 1;
  }
  return done;
}

function renderCheckInSection(parent, ctx) {
  const { settings, t } = ctx;
  const wrap = parent.createDiv({ cls: "yd-section yd-section-checkin" });
  const header = wrap.createDiv({ cls: "yd-section-header yd-section-header-center" });
  header.createSpan({ cls: "yd-section-title", text: t("section.checkIn") });
  createIconButton(header, "sliders-horizontal", {
    cls: "yd-section-icon",
    label: t("common.settings"),
    fallback: "≡",
    onClick: () => openCheckInSettings(ctx)
  });

  const dateKey = ctx.state.focusDateKey || formatDateKey(new Date());
  const items = getItems(settings);
  const limit = ctx.getLimit("checkIn");
  const visible = items.slice(0, limit);
  const list = wrap.createDiv({ cls: "yd-checkin-list" });
  visible.forEach((item) => renderCheckInRow(list, item, dateKey, ctx));
  if (items.length > limit) {
    list.createDiv({ cls: "yd-events-overflow", text: `+ ${items.length - limit}` });
  }
  if (items.length === 0) {
    list.createDiv({ cls: "yd-empty-tip", text: t("common.empty") });
  }

  const footer = wrap.createDiv({ cls: "yd-section-footer" });
  createIconButton(footer, "more-horizontal", {
    cls: "yd-section-more-icon",
    label: t("checkIn.viewMore"),
    fallback: "···",
    onClick: () => openCheckInMonthly(ctx)
  });
}

function renderCheckInRow(parent, item, dateKey, ctx) {
  const checked = isChecked(ctx.settings, item.id, dateKey);
  const row = parent.createDiv({ cls: "yd-checkin-row" });
  const btn = row.createEl("button", { cls: "yd-checkin-btn", text: ctx.t("checkIn.button") });
  if (checked) {
    btn.addClass("is-done");
    btn.style.backgroundColor = item.color;
    btn.style.borderColor = item.color;
    btn.setText("√");
  } else {
    btn.style.borderColor = withAlpha(item.color, 0.5);
  }
  btn.onclick = async () => {
    setChecked(ctx.settings, item.id, dateKey, !checked);
    await ctx.save();
    ctx.refresh();
  };
  row.createSpan({ cls: "yd-checkin-name", text: item.name || ctx.t("common.unnamed") });
}

function openCheckInMonthly(ctx) {
  const { plugin, t } = ctx;
  if (!ctx.state.checkInMonthKey) {
    const now = new Date();
    ctx.state.checkInMonthKey = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  }
  const modal = new FullPageModal(plugin.app, {
    title: t("checkIn.title"),
    titleClass: "yd-checkin-modal",
    render: (root, instance) => renderCheckInMonthly(root, ctx, instance)
  });
  modal.open();
}

function renderCheckInMonthly(root, ctx, modal) {
  root.empty();
  const { settings, t } = ctx;
  const monthKey = ctx.state.checkInMonthKey;
  const date = parseMonthKey(monthKey) || new Date();
  const year = date.getFullYear();
  const monthIndex = date.getMonth();

  const top = root.createDiv({ cls: "yd-history-top" });
  createIconButton(top, "chevron-left", {
    cls: "yd-mini-arrow",
    fallback: "‹",
    onClick: () => {
      const shifted = shiftMonth(year, monthIndex, -1);
      ctx.state.checkInMonthKey = `${shifted.year}-${pad2(shifted.monthIndex + 1)}`;
      renderCheckInMonthly(root, ctx, modal);
    }
  });
  top.createDiv({ cls: "yd-history-title", text: `${year}-${pad2(monthIndex + 1)}` });
  createIconButton(top, "chevron-right", {
    cls: "yd-mini-arrow",
    fallback: "›",
    onClick: () => {
      const shifted = shiftMonth(year, monthIndex, 1);
      ctx.state.checkInMonthKey = `${shifted.year}-${pad2(shifted.monthIndex + 1)}`;
      renderCheckInMonthly(root, ctx, modal);
    }
  });
  top.oncontextmenu = (evt) => {
    evt.preventDefault();
    const menu = new Menu();
    menu.addItem((mi) =>
      mi.setTitle(t("common.backToMonth")).onClick(() => {
        const now = new Date();
        ctx.state.checkInMonthKey = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
        renderCheckInMonthly(root, ctx, modal);
      })
    );
    menu.showAtMouseEvent(evt);
  };

  const allItems = getAllItems(settings);
  const monthItems = allItems.filter((item) => {
    if (!item.deleted) return true;
    const records = settings.data.checkIn.records?.[item.id] || {};
    return Object.keys(records).some((key) => key.startsWith(`${year}-${pad2(monthIndex + 1)}`));
  });
  if (monthItems.length === 0) {
    root.createDiv({ cls: "yd-empty-tip", text: t("common.empty") });
    return;
  }

  const days = getDaysInMonth(year, monthIndex);
  monthItems.forEach((item) => {
    const block = root.createDiv({ cls: "yd-checkin-block" });
    const blockHead = block.createDiv({ cls: "yd-checkin-blockhead" });
    blockHead.createDiv({ cls: "yd-checkin-blockname", text: item.name || t("common.unnamed") });
    const done = countMonth(settings, item.id, year, monthIndex);
    const prog = blockHead.createDiv({ cls: "yd-checkin-progress" });
    prog.createSpan({ cls: "yd-checkin-progress-done", text: String(done) });
    prog.appendText(` / ${days}`);
    const grid = block.createDiv({ cls: "yd-checkin-grid" });
    for (let day = 1; day <= days; day += 1) {
      const dateKey = `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
      const cell = grid.createDiv({ cls: "yd-checkin-cell", text: `${day}` });
      if (isChecked(settings, item.id, dateKey)) {
        cell.addClass("is-done");
        cell.style.backgroundColor = item.color;
      }
      cell.onclick = async () => {
        const current = isChecked(settings, item.id, dateKey);
        setChecked(settings, item.id, dateKey, !current);
        await ctx.save();
        renderCheckInMonthly(root, ctx, modal);
      };
    }
  });
}

function openCheckInSettings(ctx) {
  const { plugin, t } = ctx;
  const modal = new FullPageModal(plugin.app, {
    title: t("checkIn.settingsTitle"),
    titleClass: "yd-settings-modal",
    render: (root, instance) => renderCheckInSettings(root, ctx, instance)
  });
  modal.open();
}

function renderCheckInSettings(root, ctx, modal) {
  root.empty();
  const { settings, t } = ctx;
  root.createDiv({ cls: "yd-settings-desc", text: t("checkIn.settingsDesc") });

  const list = root.createDiv({ cls: "yd-settings-list" });
  const items = settings.data.checkIn.items;

  items.forEach((item, idx) => {
    if (item.deleted) return;
    const row = list.createDiv({ cls: "yd-settings-row yd-checkin-settings-row" });
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
      renderCheckInSettings(root, ctx, modal);
    });

    const colorWrap = row.createDiv({ cls: "yd-color-wrap" });
    const colorBtn = colorWrap.createEl("button", { cls: "yd-color-button" });
    colorBtn.style.backgroundColor = item.color;
    colorBtn.title = t("common.preview");
    let palette = null;
    const closePalette = () => {
      if (palette) {
        palette.remove();
        palette = null;
      }
    };
    colorBtn.onclick = (evt) => {
      evt.stopPropagation();
      if (palette) {
        closePalette();
        return;
      }
      palette = colorWrap.createDiv({ cls: "yd-color-palette" });
      PALETTE.forEach((entry) => {
        const swatch = palette.createDiv({ cls: "yd-color-swatch" });
        swatch.style.backgroundColor = entry.color;
        swatch.title = entry.name;
        swatch.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        swatch.addEventListener("click", async (e) => {
          e.stopPropagation();
          item.color = entry.color;
          colorBtn.style.backgroundColor = entry.color;
          await ctx.save();
          closePalette();
        });
      });
      const closeOnce = (e) => {
        if (palette && palette.contains(e.target)) return;
        if (colorBtn.contains(e.target)) return;
        closePalette();
        document.removeEventListener("mousedown", closeOnce, true);
      };
      document.addEventListener("mousedown", closeOnce, true);
    };

    const input = row.createEl("input", { type: "text", cls: "yd-settings-input" });
    input.value = item.name;
    input.placeholder = t("checkIn.activityName");
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
      const records = settings.data.checkIn.records?.[item.id] || {};
      const hasHistory = Object.keys(records).length > 0;
      const message = hasHistory
        ? t("checkIn.deleteItemHistoryConfirm", { name: item.name || t("common.unnamed") })
        : t("checkIn.deleteItemConfirm", { name: item.name || t("common.unnamed") });
      const confirm = new ConfirmModal(ctx.plugin.app, {
        title: t("common.delete"),
        message,
        confirmText: t("common.delete"),
        cancelText: t("common.cancel"),
        warning: true,
        onConfirm: async () => {
          if (hasHistory) {
            item.deleted = true;
          } else {
            const removeIdx = items.findIndex((entry) => entry.id === item.id);
            if (removeIdx >= 0) items.splice(removeIdx, 1);
          }
          items.forEach((entry, i) => { entry.order = i; });
          await ctx.save();
          renderCheckInSettings(root, ctx, modal);
        }
      });
      confirm.open();
    };
  });

  const addBtn = root.createEl("button", { cls: "yd-add-button", text: t("checkIn.addActivity") });
  addBtn.onclick = async () => {
    items.push({
      id: makeId("ci"),
      name: "",
      color: PALETTE[items.length % PALETTE.length]?.color || "#af9165",
      order: items.length
    });
    await ctx.save();
    renderCheckInSettings(root, ctx, modal);
  };

  const actions = root.createDiv({ cls: "yd-modal-actions yd-modal-actions-end" });
  const closeBtn = actions.createEl("button", { cls: "yd-modal-confirm", text: t("common.confirm") });
  closeBtn.onclick = async () => {
    settings.data.checkIn.items = items.filter((item) => (item.name || "").trim());
    settings.data.checkIn.items.forEach((item, idx) => { item.order = idx; });
    await ctx.save();
    modal.close();
    ctx.refresh();
  };
}

module.exports = {
  render: renderCheckInSection,
  openSettings: openCheckInSettings,
  openMonthly: openCheckInMonthly,
  getItems,
  isChecked,
  setChecked,
  countMonth
};
