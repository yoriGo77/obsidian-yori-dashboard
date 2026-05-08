"use strict";

const obsidian = require("obsidian");
const { Modal, FuzzySuggestModal, TFile, Platform } = obsidian;

class ConfirmModal extends Modal {
  constructor(app, options) {
    super(app);
    this.options = options || {};
  }
  onOpen() {
    const opts = this.options;
    const { contentEl, titleEl } = this;
    titleEl.setText(opts.title || "确认");
    contentEl.empty();
    if (opts.message) {
      const messageEl = contentEl.createEl("p", { cls: "yd-modal-message" });
      messageEl.setText(opts.message);
      if (opts.warning) messageEl.addClass("yd-modal-warning");
    }
    const actions = contentEl.createDiv({ cls: "yd-modal-actions" });
    const cancelBtn = actions.createEl("button", { cls: "yd-modal-cancel" });
    cancelBtn.setText(opts.cancelText || "取消");
    const confirmBtn = actions.createEl("button", { cls: "yd-modal-confirm" });
    confirmBtn.setText(opts.confirmText || "确定");
    if (opts.warning) confirmBtn.addClass("is-warning");
    cancelBtn.onclick = () => {
      this.close();
      if (typeof opts.onCancel === "function") opts.onCancel();
    };
    confirmBtn.onclick = async () => {
      this.close();
      if (typeof opts.onConfirm === "function") await opts.onConfirm();
    };
    requestAnimationFrame(() => confirmBtn.focus());
  }
  onClose() {
    this.contentEl.empty();
  }
}

class PromptModal extends Modal {
  constructor(app, options) {
    super(app);
    this.options = options || {};
  }
  onOpen() {
    const opts = this.options;
    const { contentEl, titleEl } = this;
    titleEl.setText(opts.title || "请输入");
    contentEl.empty();
    if (opts.message) {
      contentEl.createEl("p", { cls: "yd-modal-message", text: opts.message });
    }
    const input = contentEl.createEl("input", {
      cls: "yd-modal-input",
      type: "text",
      attr: { placeholder: opts.placeholder || "" }
    });
    if (opts.defaultValue) input.value = opts.defaultValue;
    const actions = contentEl.createDiv({ cls: "yd-modal-actions" });
    const cancelBtn = actions.createEl("button", { cls: "yd-modal-cancel" });
    cancelBtn.setText(opts.cancelText || "取消");
    const confirmBtn = actions.createEl("button", { cls: "yd-modal-confirm" });
    confirmBtn.setText(opts.confirmText || "确定");
    cancelBtn.onclick = () => {
      this.close();
      if (typeof opts.onCancel === "function") opts.onCancel();
    };
    const submit = async () => {
      const value = input.value.trim();
      if (!value && opts.required !== false) {
        input.focus();
        return;
      }
      this.close();
      if (typeof opts.onSubmit === "function") await opts.onSubmit(value);
    };
    confirmBtn.onclick = submit;
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        await submit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      }
    });
    requestAnimationFrame(() => input.focus());
  }
  onClose() {
    this.contentEl.empty();
  }
}

class NotePickerModal extends FuzzySuggestModal {
  constructor(app, options) {
    super(app);
    this.options = options || {};
    this.setPlaceholder(this.options.placeholder || "");
  }
  getItems() {
    const files = this.app.vault.getMarkdownFiles();
    return files.slice().sort((a, b) => (a.path || "").localeCompare(b.path || ""));
  }
  getItemText(item) {
    if (!item) return "";
    return item.path || item.name || "";
  }
  onChooseItem(item) {
    if (typeof this.options.onChoose === "function" && item instanceof TFile) {
      this.options.onChoose(item);
    }
  }
}

class FullPageModal extends Modal {
  constructor(app, options) {
    super(app);
    this.options = options || {};
  }
  onOpen() {
    const opts = this.options;
    this.modalEl?.addClass("yd-fullpage-modal");
    if (Platform?.isMobile) this.modalEl?.addClass("yd-fullpage-modal--mobile");
    if (opts.titleClass) this.modalEl?.addClass(opts.titleClass);
    const { contentEl, titleEl } = this;
    titleEl.setText(opts.title || "");
    contentEl.empty();
    contentEl.addClass("yd-fullpage-content");
    if (typeof opts.render === "function") {
      opts.render(contentEl, this);
    }
  }
  onClose() {
    this.modalEl?.removeClass("yd-fullpage-modal--mobile");
    this.contentEl.empty();
    if (typeof this.options.onClose === "function") this.options.onClose();
  }
}

module.exports = {
  ConfirmModal,
  PromptModal,
  NotePickerModal,
  FullPageModal
};
