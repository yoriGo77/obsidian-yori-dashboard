"use strict";

const { PALETTE, NOTE_FONT_SIZES, DEFAULT_NOTE_SIZE, DEFAULT_NOTE_COLOR } = require("../constants");
const { FullPageModal } = require("../ui-modals");
const { fitTextarea, createIconButton } = require("../dom-utils");
const { formatDateKey } = require("../date-utils");

const LINE_HEIGHT = 1.6;

/**
 * `small` lives in the left column, `large` in the right one.
 * Text is stored per date (`texts[dateKey]`); colour and size are shared by all dates.
 */
function getNote(settings, kind) {
  if (!settings.data.notes) settings.data.notes = {};
  const notes = settings.data.notes;
  if (!notes[kind]) notes[kind] = { texts: {}, color: DEFAULT_NOTE_COLOR, size: DEFAULT_NOTE_SIZE };
  if (!notes[kind].texts) notes[kind].texts = {};
  return notes[kind];
}

function applyTextStyle(el, note) {
  el.style.fontSize = `${note.size}px`;
  el.style.color = note.color;
}

function renderStickyNote(parent, ctx, kind) {
  const { settings, t } = ctx;
  const note = getNote(settings, kind);
  const dateKey = ctx.state.focusDateKey || formatDateKey(new Date());
  const currentText = () => note.texts[dateKey] || "";

  const wrap = parent.createDiv({ cls: `yd-section yd-section-note yd-section-note--${kind}` });
  const box = wrap.createDiv({ cls: "yd-note-box" });
  createIconButton(box, "sliders-horizontal", {
    cls: "yd-section-icon yd-note-settings-btn",
    label: t("note.settings"),
    fallback: "≡",
    onClick: () => openNoteSettings(ctx, kind)
  });

  const body = box.createDiv({ cls: "yd-note-body" });
  applyTextStyle(body, note);

  const showText = () => {
    body.empty();
    const view = body.createDiv({
      cls: currentText() ? "yd-note-text" : "yd-note-text is-empty",
      text: currentText() || t("note.empty")
    });
    view.onclick = startEdit;
  };

  function startEdit() {
    if (body.querySelector("textarea")) return;
    body.empty();
    const editor = body.createEl("textarea", { cls: "yd-note-editor" });
    editor.placeholder = t("note.placeholder");
    editor.value = currentText();
    editor.rows = 1;
    const minHeight = Math.round(note.size * LINE_HEIGHT);
    fitTextarea(editor, minHeight);
    requestAnimationFrame(() => {
      editor.focus();
      const end = editor.value.length;
      editor.setSelectionRange(end, end);
    });

    let done = false;
    const finish = async (save) => {
      if (done) return;
      done = true;
      if (save) {
        const next = editor.value.replace(/\s+$/, "");
        if (next !== currentText()) {
          if (next) note.texts[dateKey] = next;
          else delete note.texts[dateKey];
          await ctx.save();
        }
      }
      showText();
    };

    editor.oninput = () => fitTextarea(editor, minHeight);
    editor.onkeydown = (e) => {
      // Ignore Enter that merely confirms an IME composition (Chinese/Japanese input).
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        finish(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    };
    editor.onblur = () => finish(true);
  }

  showText();
}

function openNoteSettings(ctx, kind) {
  const { plugin, t } = ctx;
  const note = getNote(ctx.settings, kind);
  const modal = new FullPageModal(plugin.app, {
    title: t("note.settingsTitle"),
    titleClass: "yd-settings-modal",
    render: (root, instance) => renderNoteSettings(root, ctx, note, instance),
    onClose: () => ctx.refresh()
  });
  modal.open();
  modal.modalEl?.addClass("yd-note-modal");
}

function renderNoteSettings(root, ctx, note, modal) {
  const { t } = ctx;
  root.empty();
  root.createDiv({ cls: "yd-settings-desc", text: t("note.settingsDesc") });

  const fields = root.createDiv({ cls: "yd-note-fields" });

  const colorRow = fields.createDiv({ cls: "yd-note-field" });
  colorRow.createSpan({ cls: "yd-note-field-label", text: t("note.textColor") });
  const colorWrap = colorRow.createDiv({ cls: "yd-color-wrap" });
  const colorBtn = colorWrap.createEl("button", {
    cls: "yd-color-button yd-note-color-btn",
    attr: { type: "button" }
  });
  colorBtn.style.backgroundColor = note.color;
  colorBtn.title = t("common.preview");

  let palette = null;
  let closeOutside = null;
  const closePalette = () => {
    if (palette) {
      palette.remove();
      palette = null;
    }
    if (closeOutside) {
      document.removeEventListener("mousedown", closeOutside, true);
      closeOutside = null;
    }
  };
  colorBtn.onclick = (evt) => {
    evt.stopPropagation();
    if (palette) {
      closePalette();
      return;
    }
    palette = colorWrap.createDiv({ cls: "yd-color-palette yd-note-palette" });
    PALETTE.forEach((entry) => {
      const swatch = palette.createDiv({ cls: "yd-color-swatch" });
      swatch.style.backgroundColor = entry.color;
      swatch.title = entry.name;
      if (entry.color.toLowerCase() === note.color.toLowerCase()) swatch.addClass("is-selected");
      swatch.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      swatch.addEventListener("click", async (e) => {
        e.stopPropagation();
        note.color = entry.color;
        colorBtn.style.backgroundColor = entry.color;
        await ctx.save();
        closePalette();
      });
    });
    closeOutside = (e) => {
      if (palette && palette.contains(e.target)) return;
      if (colorBtn.contains(e.target)) return;
      closePalette();
    };
    document.addEventListener("mousedown", closeOutside, true);
  };

  const sizeRow = fields.createDiv({ cls: "yd-note-field" });
  sizeRow.createSpan({ cls: "yd-note-field-label", text: t("note.textSize") });
  const select = sizeRow.createEl("select", { cls: "yd-select yd-note-size-select" });
  NOTE_FONT_SIZES.forEach((size) => {
    const option = select.createEl("option", { text: String(size) });
    option.value = String(size);
  });
  select.value = String(note.size);
  select.onchange = async () => {
    const next = Number(select.value);
    if (!NOTE_FONT_SIZES.includes(next)) return;
    note.size = next;
    await ctx.save();
  };

  root.createDiv({ cls: "yd-note-tips", text: t("note.tips") });

  const actions = root.createDiv({ cls: "yd-modal-actions yd-modal-actions-end" });
  const okBtn = actions.createEl("button", { cls: "yd-modal-confirm", text: t("common.confirm") });
  okBtn.onclick = () => {
    closePalette();
    modal.close();
  };
}

module.exports = {
  renderSmall: (parent, ctx) => renderStickyNote(parent, ctx, "small"),
  renderLarge: (parent, ctx) => renderStickyNote(parent, ctx, "large"),
  openSettings: openNoteSettings,
  getNote
};
