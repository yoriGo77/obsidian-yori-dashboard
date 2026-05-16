# Yori Dashboard

An Obsidian dashboard plugin that gathers your daily events, data logs, tasks, check-ins, moments, monthly plans, and quick links into one organized page you can view and edit at a glance.

## Features

- **Calendar + Daily Events** — A month mini-calendar lets you switch the focused date; the events column on the right manages today's items, and the More button opens a weekly view that supports archiving.
- **Data Log** — Record daily metrics such as weight, words written, sleep, expenses, etc. Browse the monthly history and archive it as a note.
- **Task Box** — Organize tasks by category boxes. Add quickly from the dashboard, or open the full task view for everything.
- **Check-in** — Customizable colored buttons for habits; the monthly view shows your streak.
- **Daily Moments** — Capture timestamped notes throughout the day with 12/24-hour support.
- **Monthly Planner** — Outline this month's plans, browse the entire year in the yearly view, and archive.
- **Quick Links** — Hover the bottom blank area of either column to add a quick link with a custom name and color that jumps to a chosen note.

## Installation

### Community plugin

1. Open Obsidian: **Settings → Community plugins → Browse**
2. Search for **Yori Dashboard**
3. Install and enable

### Manual install

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub release.
2. Place them inside your vault at `.obsidian/plugins/yori-dashboard/`.
3. If the folder doesn't exist, create `yori-dashboard` under `plugins`.
4. Enable the plugin in Obsidian.

> Note: `main.js` already bundles every module from `lib/` into a single file. For deployment **only those three files** are required — you don't need to copy `lib/`, `src/`, `tests/`, or `scripts/`.

## Usage

1. Click any date in the mini-calendar to switch focus; use the chevrons to change month.
2. Daily events support checkboxes, click-to-edit, and right-click for delete/copy/paste. The More button opens the weekly view.
3. In Data Log, click a value to edit it (Enter to commit). The `...` button opens the monthly history with archive support.
4. In Task Box, the right-top settings button manages categories; pick a category from the dropdown when adding a task on the dashboard.
5. Check-in buttons toggle today's status with one click. Color comes from the activity setting.
6. Daily Moments respects 12/24-hour format; existing entries follow the active format. Use the Daily Summary button to create or open a per-day summary note.
7. Monthly Planner's yearly view lists all 12 months; archive a year as a single note.
8. Hover the bottom blank area of a column to reveal `+ Quick link` and configure a button. Drag a quick button to reorder; right-click to delete.

## Settings

- **Interface language** — Chinese / English (Chinese defaults to 24-hour, English defaults to 12-hour).
- **Section length** — Medium / Long; controls how many items each section displays on the dashboard.
- **Time format** — 12 or 24 hour (affects Daily Moments).
- **Quick link open mode** — Smart / always new tab / replace current tab.
- **Archive folder** — Where archive notes are saved (created if missing).
- **Dashboard sections** — Toggle individual sections on or off.

## Compatibility

- Minimum Obsidian version: see `minAppVersion` in `manifest.json`.
- **Desktop and mobile (phone & tablet)** — The plugin runs on Obsidian desktop and on Obsidian Mobile with a tab-based layout (daily / trackers / tasks / links). `manifest.json` sets `isDesktopOnly` to `false`.

## Development

- Source entry: `src/main.js`. Business modules live in `lib/`; section renderers under `lib/sections/`.
- Unit tests: `npm test` (built on Node's built-in `node:test`).
- Bundle: `npm run build` — a zero-dependency bundling script that emits a single `main.js` to the project root.

## Feedback & Contributions

- Issues: https://github.com/yoriGo77/obsidian-yori-dashboard/issues

## License

MIT — see `LICENSE` in the repository root.
