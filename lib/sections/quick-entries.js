"use strict";

const obsidian = require("obsidian");
const { Notice, Menu, TFile } = obsidian;
const { makeId } = require("../store");
const { PALETTE } = require("../constants");
const { FullPageModal, NotePickerModal, ConfirmModal } = require("../ui-modals");
const { withAlpha } = require("../color-utils");
const { createIconButton } = require("../dom-utils");

function getEntries(settings, side) {
  const block = settings?.data?.quickEntries || {};
  const list = side === "left" ? block.left : block.right;
  return (list || []).slice().sort((a, b) => a.order - b.order);
}

function setEntries(settings, side, list) {
  if (!settings?.data) return;
  if (!settings.data.quickEntries) settings.data.quickEntries = { left: [], right: [] };
  list.forEach((entry, idx) => { entry.order = idx; });
  settings.data.quickEntries[side] = list;
}

async function openLinkedNote(plugin, notePath) {
  if (!notePath) return false;
  const file = plugin.app.vault.getAbstractFileByPath(notePath);
  if (!file || !(file instanceof TFile)) {
    new Notice("Note not found");
    return false;
  }
  const mode = plugin.settings.noteOpenMode || "smart";
  if (mode === "smart") {
    let leaf = null;
    plugin.app.workspace.iterateAllLeaves((entry) => {
      if (leaf) return;
      if (entry.view?.file?.path === notePath) leaf = entry;
    });
    if (leaf) {
      plugin.app.workspace.setActiveLeaf(leaf, { focus: true });
      return true;
    }
    await plugin.app.workspace.getLeaf(true).openFile(file);
    return true;
  }
  if (mode === "newTab") {
    await plugin.app.workspace.getLeaf(true).openFile(file);
    return true;
  }
  await plugin.app.workspace.getLeaf(false).openFile(file);
  return true;
}

function renderQuickEntriesSide(parent, side, ctx) {
  const { settings, t } = ctx;
  if (settings.showSection?.quickEntries === false) return;
  const wrap = parent.createDiv({ cls: `yd-quick-side yd-quick-${side}` });
  const list = wrap.createDiv({ cls: "yd-quick-list" });
  const entries = getEntries(settings, side);
  entries.forEach((entry) => renderQuickButton(list, entry, side, ctx));
  const blank = wrap.createDiv({ cls: "yd-quick-blank" });
  const addBtn = blank.createEl("button", {
    cls: "yd-quick-add",
    text: t("quickEntries.add")
  });
  addBtn.onclick = () => openSettings(ctx, side);
}

function renderQuickButton(parent, entry, side, ctx) {
  const { settings, t, plugin } = ctx;
  const btn = parent.createEl("button", { cls: "yd-quick-button" });
  btn.style.backgroundColor = withAlpha(entry.color || "#af9165", 0.2);
  btn.style.borderColor = entry.color || "#af9165";
  btn.style.color = entry.color || "#af9165";
  btn.setText(entry.name || t("common.unnamed"));
  btn.dataset.entryId = entry.id;
  btn.dataset.side = side;
  btn.setAttribute("draggable", "true");

  btn.onclick = async (evt) => {
    if (btn.dataset.dragging === "1") return;
    if (!entry.notePath) {
      new Notice(t("quickEntries.noteMissing"));
      return;
    }
    await openLinkedNote(plugin, entry.notePath);
  };

  btn.oncontextmenu = (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    const menu = new Menu();
    menu.addItem((item) =>
      item
        .setTitle(t("common.delete"))
        .setIcon("trash")
        .onClick(() => {
          const confirm = new ConfirmModal(plugin.app, {
            title: t("common.delete"),
            message: t("quickEntries.deleteConfirm", { name: entry.name || t("common.unnamed") }),
            confirmText: t("common.delete"),
            cancelText: t("common.cancel"),
            warning: true,
            onConfirm: async () => {
              const list = (settings.data.quickEntries?.[side] || []).slice();
              const idx = list.findIndex((item) => item.id === entry.id);
              if (idx >= 0) list.splice(idx, 1);
              list.forEach((item, i) => { item.order = i; });
              if (settings.data.quickEntries) settings.data.quickEntries[side] = list;
              await ctx.save();
              ctx.refresh();
            }
          });
          confirm.open();
        })
    );
    menu.showAtMouseEvent(evt);
  };

  btn.addEventListener("dragstart", (e) => {
    btn.dataset.dragging = "1";
    e.dataTransfer?.setData("text/plain", JSON.stringify({ id: entry.id, side }));
    e.dataTransfer.effectAllowed = "move";
    btn.addClass("is-dragging");
  });
  btn.addEventListener("dragend", () => {
    btn.removeClass("is-dragging");
    setTimeout(() => { btn.dataset.dragging = "0"; }, 0);
  });
  btn.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    btn.addClass("is-drop-target");
  });
  btn.addEventListener("dragleave", () => btn.removeClass("is-drop-target"));
  btn.addEventListener("drop", async (e) => {
    e.preventDefault();
    btn.removeClass("is-drop-target");
    let payload = null;
    try {
      payload = JSON.parse(e.dataTransfer?.getData("text/plain") || "{}");
    } catch (_err) {}
    if (!payload || payload.side !== side || !payload.id || payload.id === entry.id) return;
    const list = (settings.data.quickEntries?.[side] || []).slice();
    const fromIdx = list.findIndex((item) => item.id === payload.id);
    const toIdx = list.findIndex((item) => item.id === entry.id);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    list.forEach((item, i) => { item.order = i; });
    if (settings.data.quickEntries) settings.data.quickEntries[side] = list;
    await ctx.save();
    ctx.refresh();
  });
}

function openSettings(ctx, side) {
  const { plugin, t } = ctx;
  const titleKey = side === "left" ? "quickEntries.left" : "quickEntries.right";
  const modal = new FullPageModal(plugin.app, {
    title: t(titleKey),
    titleClass: "yd-settings-modal",
    render: (root, instance) => renderSettings(root, ctx, side, instance),
    onClose: () => finalizeQuickEntries(ctx, side)
  });
  modal.open();
}

async function finalizeQuickEntries(ctx, side) {
  const map = ctx.settings?.data?.quickEntries;
  if (!map || !Array.isArray(map[side])) return;
  const filtered = map[side].filter((entry) => (entry.name || "").trim());
  filtered.forEach((entry, idx) => { entry.order = idx; });
  map[side] = filtered;
  await ctx.save();
  ctx.refresh();
}

function renderSettings(root, ctx, side, modal) {
  root.empty();
  const { settings, t, plugin } = ctx;
  root.createDiv({ cls: "yd-settings-desc", text: t("quickEntries.settingsDesc") });

  const list = root.createDiv({ cls: "yd-settings-list" });
  const entries = settings.data.quickEntries[side];

  entries.forEach((entry, idx) => {
    const row = list.createDiv({ cls: "yd-settings-row yd-quick-settings-row" });
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
      const moved = entries.splice(fromIdx, 1)[0];
      entries.splice(idx, 0, moved);
      entries.forEach((entry, i) => { entry.order = i; });
      await ctx.save();
      renderSettings(root, ctx, side, modal);
    });

    const colorWrap = row.createDiv({ cls: "yd-color-wrap" });
    const colorBtn = colorWrap.createEl("button", { cls: "yd-color-button" });
    colorBtn.style.backgroundColor = entry.color || "#af9165";
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
      PALETTE.forEach((p) => {
        const swatch = palette.createDiv({ cls: "yd-color-swatch" });
        swatch.style.backgroundColor = p.color;
        swatch.title = p.name;
        swatch.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        swatch.addEventListener("click", async (e) => {
          e.stopPropagation();
          entry.color = p.color;
          colorBtn.style.backgroundColor = p.color;
          await ctx.save();
          closePalette();
          ctx.refresh();
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
    input.value = entry.name;
    input.placeholder = t("quickEntries.entryName");
    input.onchange = async () => {
      entry.name = input.value.trim();
      await ctx.save();
      ctx.refresh();
    };

    const noteBtn = row.createEl("button", { cls: "yd-settings-link" });
    noteBtn.setText(entry.notePath || t("quickEntries.linkNote"));
    noteBtn.onclick = () => {
      const picker = new NotePickerModal(plugin.app, {
        placeholder: t("quickEntries.notePicker"),
        onChoose: async (file) => {
          entry.notePath = file.path;
          noteBtn.setText(file.path);
          await ctx.save();
          renderSettings(root, ctx, side, modal);
          ctx.refresh();
        }
      });
      picker.open();
    };

    const delBtn = createIconButton(row, "x", {
      cls: "yd-settings-delete",
      label: t("common.delete"),
      fallback: "✕"
    });
    delBtn.onclick = async () => {
      const removeIdx = entries.findIndex((e) => e.id === entry.id);
      if (removeIdx >= 0) entries.splice(removeIdx, 1);
      entries.forEach((e, i) => { e.order = i; });
      await ctx.save();
      renderSettings(root, ctx, side, modal);
      ctx.refresh();
    };
  });

  const addBtn = root.createEl("button", { cls: "yd-add-button", text: t("quickEntries.addEntry") });
  addBtn.onclick = async () => {
    entries.push({
      id: makeId("qe"),
      name: "",
      color: PALETTE[entries.length % PALETTE.length]?.color || "#af9165",
      notePath: "",
      order: entries.length
    });
    await ctx.save();
    renderSettings(root, ctx, side, modal);
    ctx.refresh();
  };

  const actions = root.createDiv({ cls: "yd-modal-actions yd-modal-actions-end" });
  const closeBtn = actions.createEl("button", { cls: "yd-modal-confirm", text: t("common.confirm") });
  closeBtn.onclick = () => modal.close();
}

module.exports = {
  renderSide: renderQuickEntriesSide,
  openSettings,
  getEntries,
  setEntries
};
