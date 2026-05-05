"use strict";

const obsidian = require("obsidian");
const {
  Plugin,
  ItemView,
  Notice,
  PluginSettingTab,
  Setting,
  ToggleComponent,
  setIcon,
  addIcon
} = obsidian;

const constants = require("../lib/constants");
const i18n = require("../lib/i18n");
const dateUtils = require("../lib/date-utils");
const storeUtils = require("../lib/store");

const calendarSection = require("../lib/sections/calendar");
const dataLogSection = require("../lib/sections/data-log");
const taskBoxSection = require("../lib/sections/task-box");
const checkInSection = require("../lib/sections/check-in");
const momentsSection = require("../lib/sections/daily-moments");
const plannerSection = require("../lib/sections/monthly-planner");
const quickEntriesSection = require("../lib/sections/quick-entries");

const { VIEW_TYPE, ICON_ID, SECTION_LIMITS, DEFAULT_SETTINGS } = constants;

const DASHBOARD_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <rect x="14" y="14" width="32" height="32" rx="4"/>
  <rect x="54" y="14" width="32" height="20" rx="4"/>
  <rect x="54" y="42" width="32" height="44" rx="4"/>
  <rect x="14" y="54" width="32" height="32" rx="4"/>
</svg>`;

class YoriDashboardPlugin extends Plugin {
  async onload() {
    addIcon(ICON_ID, DASHBOARD_ICON_SVG);
    await this.loadSettings();

    this.translator = i18n.createTranslator(() => this.settings.uiLanguage || "zh");

    this.registerView(VIEW_TYPE, (leaf) => new YoriDashboardView(leaf, this));

    this.addRibbonIcon(ICON_ID, this.translator("ribbon.open"), () => this.activateView());
    this.addCommand({
      id: "open-yori-dashboard",
      name: this.translator("command.open"),
      callback: () => this.activateView()
    });

    this.addSettingTab(new YoriDashboardSettingTab(this.app, this));
  }

  onunload() {
    /* Obsidian 会在插件 unload 时自动清理已注册的 view，
       不需要也不应再调用 detachLeavesOfType（会破坏用户布局）。 */
  }

  async loadSettings() {
    const raw = await this.loadData();
    this.settings = storeUtils.normalizeSettings(raw);
    if (!this._migrated) {
      this._migrated = true;
      await this.saveSettings();
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.refreshAllViews();
  }

  refreshAllViews() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => {
      if (leaf?.view?.scheduleRender) leaf.view.scheduleRender();
    });
  }

  async activateView() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (existing) {
      this.app.workspace.revealLeaf(existing);
      return;
    }
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
}

class YoriDashboardView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.viewState = {
      focusDateKey: dateUtils.formatDateKey(new Date())
    };
    this.clipboard = {};
    this._renderHandle = null;
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return this.plugin.translator("view.title");
  }

  getIcon() {
    return ICON_ID;
  }

  async onOpen() {
    this.scheduleRender();
  }

  async onClose() {
    if (this._renderHandle) cancelAnimationFrame(this._renderHandle);
    this.containerEl.empty();
  }

  scheduleRender() {
    if (this._renderHandle) cancelAnimationFrame(this._renderHandle);
    this._renderHandle = requestAnimationFrame(() => {
      this._renderHandle = null;
      try {
        this.render();
      } catch (err) {
        console.error("[Yori Dashboard] render failed", err);
      }
    });
  }

  buildContext() {
    const plugin = this.plugin;
    const view = this;
    const ctx = {
      plugin,
      app: plugin.app,
      settings: plugin.settings,
      state: this.viewState,
      clipboard: this.clipboard,
      t: plugin.translator,
      save: async () => {
        await plugin.saveData(plugin.settings);
      },
      refresh: () => view.scheduleRender(),
      getLimit(section) {
        const length = plugin.settings.sectionLength || "medium";
        const limits = SECTION_LIMITS[length] || SECTION_LIMITS.medium;
        return limits[section] || limits.dailyEvents;
      }
    };
    return ctx;
  }

  render() {
    this.containerEl.addClass("yd-dashboard-host");
    const host = this.containerEl.children[1] || this.containerEl;
    host.empty();
    host.addClass("yd-view-content");
    const root = host.createDiv({ cls: "yd-root" });
    const ctx = this.buildContext();
    const settings = this.plugin.settings;

    calendarSection.render(root, ctx);

    const grid = root.createDiv({ cls: "yd-grid" });
    const colLeft = grid.createDiv({ cls: "yd-col yd-col-left" });
    const colRight = grid.createDiv({ cls: "yd-col yd-col-right" });

    const renderers = {
      dataLog: () => dataLogSection.render(colLeft, ctx),
      checkIn: () => checkInSection.render(colLeft, ctx),
      taskBox: () => taskBoxSection.render(colRight, ctx),
      dailyMoments: () => momentsSection.render(colRight, ctx),
      monthlyPlanner: () => plannerSection.render(colRight, ctx)
    };

    const order = settings.sectionOrder || { groupA: ["dataLog", "checkIn"], groupB: ["taskBox", "dailyMoments", "monthlyPlanner"] };
    (order.groupA || []).forEach((key) => {
      if (settings.showSection?.[key] !== false && renderers[key]) renderers[key]();
    });
    (order.groupB || []).forEach((key) => {
      if (settings.showSection?.[key] !== false && renderers[key]) renderers[key]();
    });

    quickEntriesSection.renderSide(colLeft, "left", ctx);
    quickEntriesSection.renderSide(colRight, "right", ctx);
  }
}

class YoriDashboardSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    const t = this.plugin.translator;
    containerEl.empty();

    new Setting(containerEl)
      .setName(t("settings.language"))
      .setDesc(t("settings.languageDesc"))
      .addDropdown((dd) =>
        dd
          .addOption("zh", t("settings.languageZh"))
          .addOption("en", t("settings.languageEn"))
          .setValue(this.plugin.settings.uiLanguage)
          .onChange(async (value) => {
            this.plugin.settings.uiLanguage = value;
            if (value === "zh" && this.plugin.settings.timeFormat === "12") {
              this.plugin.settings.timeFormat = "24";
            } else if (value === "en" && this.plugin.settings.timeFormat === "24") {
              this.plugin.settings.timeFormat = "12";
            }
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(containerEl)
      .setName(t("settings.sectionLength"))
      .setDesc(t("settings.sectionLengthDesc"))
      .addDropdown((dd) =>
        dd
          .addOption("medium", t("settings.sectionLengthMedium"))
          .addOption("long", t("settings.sectionLengthLong"))
          .setValue(this.plugin.settings.sectionLength)
          .onChange(async (value) => {
            this.plugin.settings.sectionLength = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settings.timeFormat"))
      .setDesc(t("settings.timeFormatDesc"))
      .addDropdown((dd) =>
        dd
          .addOption("24", t("settings.timeFormat24"))
          .addOption("12", t("settings.timeFormat12"))
          .setValue(this.plugin.settings.timeFormat)
          .onChange(async (value) => {
            this.plugin.settings.timeFormat = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settings.noteOpen"))
      .setDesc(t("settings.noteOpenDesc"))
      .addDropdown((dd) =>
        dd
          .addOption("smart", t("settings.noteOpenSmart"))
          .addOption("newTab", t("settings.noteOpenNew"))
          .addOption("replace", t("settings.noteOpenReplace"))
          .setValue(this.plugin.settings.noteOpenMode)
          .onChange(async (value) => {
            this.plugin.settings.noteOpenMode = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settings.archiveFolder"))
      .setDesc(t("settings.archiveFolderDesc"))
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.archiveFolder)
          .setValue(this.plugin.settings.archiveFolder)
          .onChange(async (value) => {
            this.plugin.settings.archiveFolder = value.trim() || DEFAULT_SETTINGS.archiveFolder;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName(t("settings.toggleSection")).setHeading();

    const labelMap = {
      dataLog: "settings.section.dataLog",
      checkIn: "settings.section.checkIn",
      taskBox: "settings.section.taskBox",
      dailyMoments: "settings.section.dailyMoments",
      monthlyPlanner: "settings.section.monthlyPlanner"
    };

    const renderGroup = (groupKey) => {
      const groupEl = containerEl.createDiv({ cls: "yd-section-order-group" });
      const list = this.plugin.settings.sectionOrder?.[groupKey] || [];
      list.forEach((key) => {
        const row = groupEl.createDiv({ cls: "yd-section-order-row" });
        row.setAttribute("draggable", "true");
        row.dataset.key = key;
        const handle = row.createSpan({ cls: "yd-section-order-handle" });
        if (typeof setIcon === "function") {
          try { setIcon(handle, "grip-vertical"); } catch (_e) {}
        }
        if (!handle.firstChild) handle.setText("≡");
        row.createSpan({ cls: "yd-section-order-label", text: t(labelMap[key]) });
        const toggleWrap = row.createDiv({ cls: "yd-section-order-toggle" });
        const toggle = new ToggleComponent(toggleWrap);
        toggle
          .setValue(this.plugin.settings.showSection[key] !== false)
          .onChange(async (value) => {
            this.plugin.settings.showSection[key] = value;
            await this.plugin.saveSettings();
          });

        row.addEventListener("dragstart", (e) => {
          row.classList.add("is-dragging");
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
            try { e.dataTransfer.setData("text/plain", key); } catch (_e) {}
          }
        });
        row.addEventListener("dragend", () => row.classList.remove("is-dragging"));
        row.addEventListener("dragover", (e) => {
          e.preventDefault();
          row.classList.add("is-drop-target");
        });
        row.addEventListener("dragleave", () => row.classList.remove("is-drop-target"));
        row.addEventListener("drop", async (e) => {
          e.preventDefault();
          row.classList.remove("is-drop-target");
          const fromKey = e.dataTransfer ? e.dataTransfer.getData("text/plain") : "";
          if (!fromKey || fromKey === key) return;
          const arr = this.plugin.settings.sectionOrder[groupKey];
          const fromIdx = arr.indexOf(fromKey);
          const toIdx = arr.indexOf(key);
          if (fromIdx === -1 || toIdx === -1) return;
          arr.splice(fromIdx, 1);
          arr.splice(toIdx, 0, fromKey);
          await this.plugin.saveSettings();
          this.display();
        });
      });
    };

    renderGroup("groupA");
    containerEl.createEl("hr", { cls: "yd-section-order-divider" });
    renderGroup("groupB");

    containerEl.createEl("hr", { cls: "yd-settings-divider" });

    const tipsBlock = containerEl.createDiv({ cls: "yd-settings-tips-block" });
    const tipsContent = tipsBlock.createDiv({ cls: "yd-settings-tips-content" });
    tipsContent.createEl("div", { cls: "yd-settings-tips-title", text: t("settings.tipsTitle") });
    ["settings.tipMobile"].forEach((key) => {
      tipsContent.createEl("div", { cls: "yd-settings-tip-line", text: t(key) });
    });

    const donateLink = tipsBlock.createEl("a", {
      cls: "yd-settings-donate",
      attr: {
        href: t("settings.donateUrl"),
        target: "_blank",
        rel: "noopener"
      }
    });
    const heart = donateLink.createDiv({ cls: "yd-settings-donate-heart" });
    if (typeof setIcon === "function") {
      try { setIcon(heart, "heart"); } catch (_err) {}
    }
    donateLink.createDiv({ cls: "yd-settings-donate-label", text: t("settings.donate") });
  }
}

module.exports = YoriDashboardPlugin;
module.exports.default = YoriDashboardPlugin;
