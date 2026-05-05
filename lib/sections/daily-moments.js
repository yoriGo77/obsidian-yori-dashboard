"use strict";

const obsidian = require("obsidian");
const { Notice, normalizePath, Menu } = obsidian;
const { formatDateKey, formatTimeDisplay, nowTimeParts, pad2 } = require("../date-utils");
const { makeId } = require("../store");
const { fitTextarea, ensureFocusInput, createIconButton } = require("../dom-utils");
const { ConfirmModal } = require("../ui-modals");
const { ensureFolder } = require("../archive");

function getMoments(settings, dateKey) {
  return (settings?.data?.dailyMoments?.[dateKey] || []).slice().sort(byTime);
}

function byTime(a, b) {
  return a.hours * 60 + a.minutes - (b.hours * 60 + b.minutes);
}

function setMoments(settings, dateKey, list) {
  if (!settings?.data) return;
  if (!settings.data.dailyMoments) settings.data.dailyMoments = {};
  if (!list || list.length === 0) {
    delete settings.data.dailyMoments[dateKey];
    return;
  }
  settings.data.dailyMoments[dateKey] = list.slice().sort(byTime);
}

function createMoment(settings, dateKey, parts) {
  const list = getMoments(settings, dateKey);
  const moment = {
    id: makeId("dm"),
    hours: Math.max(0, Math.min(23, Math.floor(parts.hours ?? 0))),
    minutes: Math.max(0, Math.min(59, Math.floor(parts.minutes ?? 0))),
    text: typeof parts.text === "string" ? parts.text : ""
  };
  list.push(moment);
  setMoments(settings, dateKey, list);
  return moment;
}

function updateMoment(settings, dateKey, momentId, partial) {
  const list = getMoments(settings, dateKey);
  const idx = list.findIndex((moment) => moment.id === momentId);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...partial };
  setMoments(settings, dateKey, list);
  return list[idx];
}

function deleteMoment(settings, dateKey, momentId) {
  const list = getMoments(settings, dateKey).filter((m) => m.id !== momentId);
  setMoments(settings, dateKey, list);
}

function renderDailyMomentsSection(parent, ctx) {
  const { settings, t } = ctx;
  if (settings.showSection?.dailyMoments === false) return;
  const lang = settings.uiLanguage || "zh";
  const wrap = parent.createDiv({ cls: "yd-section yd-section-moments" });
  const header = wrap.createDiv({ cls: "yd-section-header yd-section-header-center" });
  const dateKey = ctx.state.focusDateKey || formatDateKey(new Date());
  const moments = getMoments(settings, dateKey);
  const countText = lang === "zh" ? `（${moments.length}）` : `(${moments.length})`;
  header.createSpan({
    cls: "yd-section-title",
    text: `${t("section.dailyMoments")} ${countText}`
  });
  const triggerCompose = () => {
    addBtn.style.display = "none";
    renderMomentComposer(wrap, dateKey, null, ctx, () => {
      addBtn.style.display = "";
      ctx.refresh();
    });
  };
  createIconButton(header, "notebook-pen", {
    cls: "yd-section-icon yd-diary-btn",
    label: t("dailyMoments.diary"),
    fallback: "Summary",
    onClick: () => openDiary(ctx, dateKey)
  });

  const list = wrap.createDiv({ cls: "yd-moments-list" });
  const limit = ctx.getLimit("dailyMoments");
  list.style.maxHeight = `${limit * 32 + 4}px`;
  moments.forEach((moment) => renderMomentRow(list, moment, dateKey, ctx));
  if (moments.length === 0) {
    list.createDiv({ cls: "yd-empty-tip", text: t("common.empty") });
  } else {
    requestAnimationFrame(() => {
      list.scrollTop = list.scrollHeight;
    });
  }

  const addBtn = wrap.createEl("button", { cls: "yd-add-button", text: t("dailyMoments.note") });
  addBtn.onclick = triggerCompose;
}

function renderMomentRow(parent, moment, dateKey, ctx) {
  const { settings, t } = ctx;
  const row = parent.createDiv({ cls: "yd-moment-row" });
  const time = row.createDiv({
    cls: "yd-moment-time",
    text: formatTimeDisplay(moment.hours, moment.minutes, settings.timeFormat || "24")
  });
  const text = row.createDiv({ cls: "yd-moment-text", text: moment.text || t("common.unnamed") });
  const enterEdit = () => {
    const placeholder = parent.createDiv({ cls: "yd-moment-row" });
    parent.insertBefore(placeholder, row);
    row.remove();
    renderMomentComposer(placeholder.parentElement, dateKey, moment, ctx, () => {
      placeholder.remove();
      ctx.refresh();
    }, placeholder);
  };
  text.onclick = enterEdit;
  time.onclick = enterEdit;
  row.oncontextmenu = (evt) => {
    evt.preventDefault();
    const menu = new Menu();
    menu.addItem((item) =>
      item.setTitle(t("dailyMoments.contextDelete")).onClick(() => {
        const confirm = new ConfirmModal(ctx.plugin.app, {
          title: t("common.delete"),
          message: t("dailyMoments.deleteConfirm"),
          confirmText: t("common.delete"),
          cancelText: t("common.cancel"),
          warning: true,
          onConfirm: async () => {
            deleteMoment(settings, dateKey, moment.id);
            await ctx.save();
            ctx.refresh();
          }
        });
        confirm.open();
      })
    );
    menu.showAtMouseEvent(evt);
  };
}

function renderMomentComposer(parent, dateKey, existing, ctx, done, replaceTarget) {
  const { settings, t } = ctx;
  const wrap = document.createElement("div");
  wrap.className = "yd-moment-composer";
  if (replaceTarget && replaceTarget.parentElement) {
    replaceTarget.parentElement.insertBefore(wrap, replaceTarget);
  } else {
    parent.appendChild(wrap);
  }
  const initial = existing || nowTimeParts(new Date());
  const timeWrap = document.createElement("div");
  timeWrap.className = "yd-moment-time-input";
  wrap.appendChild(timeWrap);

  const hourInput = document.createElement("input");
  hourInput.type = "number";
  hourInput.min = "0";
  hourInput.max = settings.timeFormat === "12" ? "12" : "23";
  hourInput.className = "yd-time-input";
  const minuteInput = document.createElement("input");
  minuteInput.type = "number";
  minuteInput.min = "0";
  minuteInput.max = "59";
  minuteInput.className = "yd-time-input";

  let displayHours = initial.hours ?? 0;
  let isPm = displayHours >= 12;
  if (settings.timeFormat === "12") {
    let h12 = displayHours % 12;
    if (h12 === 0) h12 = 12;
    hourInput.value = `${pad2(h12)}`;
  } else {
    hourInput.value = `${pad2(initial.hours ?? 0)}`;
  }
  minuteInput.value = `${pad2(initial.minutes ?? 0)}`;

  timeWrap.appendChild(hourInput);
  const colon = document.createElement("span");
  colon.textContent = ":";
  colon.className = "yd-time-colon";
  timeWrap.appendChild(colon);
  timeWrap.appendChild(minuteInput);

  let amBtn = null;
  let pmBtn = null;
  if (settings.timeFormat === "12") {
    amBtn = document.createElement("button");
    amBtn.className = "yd-time-ampm";
    amBtn.textContent = "AM";
    pmBtn = document.createElement("button");
    pmBtn.className = "yd-time-ampm";
    pmBtn.textContent = "PM";
    if (isPm) pmBtn.classList.add("is-active");
    else amBtn.classList.add("is-active");
    amBtn.onclick = (e) => {
      e.preventDefault();
      isPm = false;
      amBtn.classList.add("is-active");
      pmBtn.classList.remove("is-active");
    };
    pmBtn.onclick = (e) => {
      e.preventDefault();
      isPm = true;
      pmBtn.classList.add("is-active");
      amBtn.classList.remove("is-active");
    };
    timeWrap.appendChild(amBtn);
    timeWrap.appendChild(pmBtn);
  }

  const editor = document.createElement("textarea");
  editor.className = "yd-event-editor";
  editor.placeholder = t("dailyMoments.placeholder");
  editor.value = existing?.text || "";
  wrap.appendChild(editor);
  fitTextarea(editor);
  ensureFocusInput(editor);

  let committed = false;
  const finish = async () => {
    if (committed) return;
    committed = true;
    const value = editor.value.trim();
    let h = Number(hourInput.value);
    const m = Math.max(0, Math.min(59, Number(minuteInput.value) || 0));
    if (!Number.isFinite(h)) h = 0;
    if (settings.timeFormat === "12") {
      let h12 = ((h % 12) || 12);
      if (isPm) h12 = h12 === 12 ? 12 : h12 + 12;
      else h12 = h12 === 12 ? 0 : h12;
      h = h12;
    } else {
      h = Math.max(0, Math.min(23, h));
    }
    wrap.remove();
    if (!value) {
      if (existing) deleteMoment(settings, dateKey, existing.id);
    } else if (existing) {
      updateMoment(settings, dateKey, existing.id, { hours: h, minutes: m, text: value });
    } else {
      createMoment(settings, dateKey, { hours: h, minutes: m, text: value });
    }
    await ctx.save();
    if (typeof done === "function") done();
  };
  editor.onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      finish();
    } else if (e.key === "Escape") {
      e.preventDefault();
      committed = true;
      wrap.remove();
      if (typeof done === "function") done();
    }
  };
  editor.oninput = () => fitTextarea(editor);
  editor.onblur = (e) => {
    if (wrap.contains(e.relatedTarget)) return;
    finish();
  };
}

async function openDiary(ctx, dateKey) {
  const { plugin, settings, t } = ctx;
  const folder = (settings.archiveFolder || "").trim();
  const fileName = `${dateKey}-Summary.md`;
  const fullPath = folder
    ? normalizePath(`${folder}/${fileName}`)
    : normalizePath(fileName);
  const existing = plugin.app.vault.getAbstractFileByPath(fullPath);
  if (existing) {
    await plugin.app.workspace.getLeaf(true).openFile(existing);
    return;
  }
  const moments = getMoments(settings, dateKey);
  const confirmModal = new ConfirmModal(plugin.app, {
    title: t("dailyMoments.diaryConfirmTitle"),
    message: t("dailyMoments.diaryConfirmMsg", { date: dateKey }),
    confirmText: t("common.confirm"),
    cancelText: t("common.cancel"),
    onConfirm: async () => {
      if (folder) await ensureFolder(plugin.app, folder);
      const lines = moments.map((m) => {
        const time = formatTimeDisplay(m.hours, m.minutes, settings.timeFormat || "24");
        return `- ${time} ${m.text || ""}`.trimEnd();
      });
      if (lines.length === 0) {
        lines.push(`- ${t("common.empty")}`);
      }
      const body = [
        `# ${dateKey} Daily Summary`,
        "",
        ...lines,
        "",
        "---",
        "",
        ""
      ].join("\n");
      const file = await plugin.app.vault.create(fullPath, body);
      await plugin.app.workspace.getLeaf(true).openFile(file);
      new Notice(t("dailyMoments.diaryCreated", { path: file.path }));
    }
  });
  confirmModal.open();
}

module.exports = {
  render: renderDailyMomentsSection,
  openDiary,
  getMoments,
  createMoment,
  updateMoment,
  deleteMoment
};
