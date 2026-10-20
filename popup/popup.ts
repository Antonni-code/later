import { send } from "./api";
import { MAX_OPEN_BATCH, SHELF_KEY, displayHost, relativeTime } from "../src/domain";
import type { AppState, SavedTab } from "../src/domain";
import { DEFAULT_VIEW, RANGES, SORT_KEYS, applyView, highlight, isFiltered, terms } from "./view";
import type { Range, SortKey, View } from "./view";

function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing UI element: ${id}`);
  return value as T;
}
const ui = {
  save: element<HTMLButtonElement>("save-current"), saveLabel: element("save-label"),
  title: element("current-title"), host: element("current-host"), monogram: element("current-monogram"), hint: element("current-hint"),
  shelf: element("shelf"), heading: element("saved-heading"), count: element("count"),
  list: element("saved-tabs"), empty: element("empty-state"), loading: element("loading-state"),
  openAll: element<HTMLButtonElement>("open-all"), clear: element<HTMLButtonElement>("clear-all"), more: element<HTMLButtonElement>("show-more"),
  note: element("shelf-note"), shortcut: element("shortcut"), feedback: element("feedback"), status: element("status"), retry: element<HTMLButtonElement>("retry"),
  dialog: element<HTMLDialogElement>("confirm-dialog"), dialogTitle: element("dialog-title"), dialogDescription: element("dialog-description"),
  confirm: element<HTMLButtonElement>("dialog-confirm"), cancel: element<HTMLButtonElement>("dialog-cancel"),
  toolbar: element("toolbar"), search: element<HTMLInputElement>("search"), sort: element<HTMLSelectElement>("sort"),
  rangeTrack: element("ranges"), ranges: [...document.querySelectorAll<HTMLButtonElement>("[data-range]")],
  noResults: element("no-results"), noResultsText: element("no-results-text"), clearFilters: element<HTMLButtonElement>("clear-filters")
};
/** Search, sort and range only change what the popup shows; the shelf itself is never rewritten. */
const TOOLS_MIN_ITEMS = 4;
let view: View = { ...DEFAULT_VIEW };
let state: AppState | null = null;
let busy = false;
let visibleItems = 40;
let refreshVersion = 0;

function icon(name: "open" | "remove"): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", name === "open" ? "M14 4h6v6M20 4l-9 9M10 4H4v16h16v-6" : "M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5m4-5v5");
  svg.append(path);
  return svg;
}

/** One of six monogram tints, stable per site, so a long shelf can be scanned by colour. */
function tint(host: string): string {
  let hash = 0;
  for (const char of host) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return String(hash % 6);
}

function marked(target: HTMLElement, text: string, words: readonly string[]): void {
  target.replaceChildren(...highlight(text, words).map(segment => {
    if (!segment.match) return document.createTextNode(segment.text);
    const mark = document.createElement("mark"); mark.textContent = segment.text; return mark;
  }));
}

function groupHeader(host: string, count: number): HTMLLIElement {
  const header = document.createElement("li");
  header.className = "group-header"; header.setAttribute("aria-hidden", "true");
  const name = document.createElement("span"); name.textContent = host;
  const total = document.createElement("span"); total.className = "group-count"; total.textContent = String(count);
  header.append(name, total);
  return header;
}

function feedback(message: string, error = false, retry = false): void {
  ui.status.textContent = message;
  ui.feedback.hidden = !message;
  ui.feedback.classList.toggle("error", error);
  ui.retry.hidden = !retry;
}

function controls(): void {
  ui.save.disabled = busy || !state?.currentTab?.saveable;
  ui.saveLabel.textContent = busy ? "Working…" : "Save & close tab";
  ui.openAll.disabled = busy || !state?.items.length;
  ui.clear.disabled = busy || !state?.items.length;
  ui.more.disabled = busy;
  ui.list.querySelectorAll<HTMLButtonElement>("button").forEach(button => { button.disabled = busy; });
}

async function act(operation: () => Promise<void>): Promise<void> {
  if (busy) return;
  busy = true;
  controls();
  feedback("");
  try { await operation(); } catch (error) {
    feedback(error instanceof Error ? error.message : "Could not finish that action. Please try again.", true);
  } finally { busy = false; controls(); }
}

function createRow(tab: SavedTab, index: number, words: readonly string[] = []): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "tab-item";
  const open = document.createElement("button");
  open.type = "button"; open.className = "tab-main"; open.title = tab.url;
  open.setAttribute("aria-label", `Reopen ${tab.title}`);
  const monogram = document.createElement("span");
  monogram.className = "tab-monogram"; monogram.setAttribute("aria-hidden", "true");
  monogram.textContent = displayHost(tab.url).charAt(0).toUpperCase(); monogram.dataset.tint = tint(displayHost(tab.url));
  const copy = document.createElement("span"); copy.className = "tab-copy";
  const title = document.createElement("span"); title.className = "tab-title"; marked(title, tab.title, words);
  const meta = document.createElement("span"); meta.className = "tab-meta";
  const host = document.createElement("span"); host.className = "tab-host"; marked(host, displayHost(tab.url), words);
  const time = document.createElement("span"); time.className = "tab-time"; time.textContent = `· ${relativeTime(tab.savedAt)}`;
  meta.append(host, time); copy.append(title, meta);
  const openIcon = icon("open"); openIcon.classList.add("open-icon");
  open.append(monogram, copy, openIcon);
  open.addEventListener("click", () => void act(async () => {
    await send("OPEN_TAB", { id: tab.id });
    feedback("Opened in a new tab. Your saved page stays on the shelf.");
  }));
  const remove = document.createElement("button");
  remove.type = "button"; remove.className = "delete-button"; remove.title = "Remove from shelf";
  remove.setAttribute("aria-label", `Remove ${tab.title} from shelf`); remove.append(icon("remove"));
  remove.addEventListener("click", () => void act(async () => {
    const items = await send("REMOVE_TAB", { id: tab.id });
    refreshVersion++;
    if (state) { state.items = items; render(); }
    feedback("Removed from your shelf.");
    setTimeout(() => {
      const rows = ui.list.querySelectorAll<HTMLButtonElement>(".delete-button");
      (rows[Math.min(index, rows.length - 1)] || ui.heading).focus();
    }, 0);
  }));
  item.append(open, remove);
  return item;
}

function render(): void {
  if (!state) return;
  const tab = state.currentTab;
  ui.loading.hidden = true; ui.shelf.setAttribute("aria-busy", "false");
  ui.title.textContent = tab?.title || "No current page"; ui.title.title = tab?.title || "";
  ui.host.textContent = tab?.url ? displayHost(tab.url) : "Open a regular web page";
  ui.monogram.textContent = tab?.url ? displayHost(tab.url).charAt(0).toUpperCase() : "—";
  if (tab?.url) ui.monogram.dataset.tint = tint(displayHost(tab.url)); else delete ui.monogram.dataset.tint;
  ui.hint.textContent = tab?.saveable ? "It stays here until you’re ready." : tab?.reason || "Open a regular web page to get started.";
  const total = state.items.length;
  const filtered = isFiltered(view);
  const shown = applyView(state.items, view);
  const words = terms(view.query);
  ui.toolbar.hidden = total < TOOLS_MIN_ITEMS && !filtered;
  ui.count.textContent = filtered ? `${shown.length} of ${total}` : String(total);
  ui.count.setAttribute("aria-label", filtered ? `${shown.length} of ${total} saved tabs shown` : `${total} saved tabs`);
  const selectable = Math.min(shown.length, MAX_OPEN_BATCH);
  ui.openAll.textContent = filtered ? `Open ${selectable} ${selectable === 1 ? "result" : "results"}` : total > MAX_OPEN_BATCH ? "Open 20 newest" : "Open all";
  ui.openAll.hidden = filtered && shown.length === 0;
  ui.empty.hidden = total > 0;
  ui.noResults.hidden = total === 0 || shown.length > 0;
  ui.noResultsText.textContent = view.query.trim() ? `No saved tabs match “${view.query.trim()}”.` : "Nothing saved in this range.";
  const visible = shown.slice(0, visibleItems);
  const rows: HTMLLIElement[] = [];
  const perHost = new Map<string, number>();
  if (view.sort === "site") for (const tab of shown) { const key = displayHost(tab.url); perHost.set(key, (perHost.get(key) ?? 0) + 1); }
  visible.forEach((tab, index) => {
    const key = displayHost(tab.url);
    if (view.sort === "site" && (index === 0 || displayHost(visible[index - 1]?.url ?? "") !== key)) rows.push(groupHeader(key, perHost.get(key) ?? 0));
    rows.push(createRow(tab, index, words));
  });
  ui.list.replaceChildren(...rows);
  ui.more.hidden = visibleItems >= shown.length; ui.more.textContent = `Show ${Math.min(40, shown.length - visibleItems)} more tabs`;
  const assigned = state.shortcut !== "Not assigned";
  ui.shortcut.textContent = assigned ? state.shortcut : ""; ui.shortcut.hidden = !assigned;
  ui.save.title = assigned ? `Save and close this tab (${state.shortcut})` : "Assign a shortcut at chrome://extensions/shortcuts";
  ui.note.textContent = state.items.length > 0 ? "Reopening keeps your saved page here." : "Your future self will thank you.";
  controls();
}

async function refresh(): Promise<void> {
  const version = ++refreshVersion;
  try {
    const next = await send("GET_STATE", {});
    if (version !== refreshVersion) return;
    state = next; render();
    if (ui.retry.hidden === false) feedback("");
  } catch (error) {
    if (version !== refreshVersion) return;
    ui.loading.hidden = true; ui.shelf.setAttribute("aria-busy", "false");
    ui.title.textContent = "Let’s get connected"; ui.host.textContent = "Your saved tabs have not been changed";
    feedback(error instanceof Error ? error.message : "Could not read your shelf.", true, true);
  }
}

function confirm(title: string, description: string, label: string, destructive = false): Promise<boolean> {
  ui.dialogTitle.textContent = title; ui.dialogDescription.textContent = description;
  ui.confirm.textContent = label; ui.confirm.classList.toggle("destructive", destructive);
  const previousFocus = document.activeElement;
  return new Promise(resolve => {
    const finish = (confirmed: boolean) => {
      ui.confirm.removeEventListener("click", yes); ui.cancel.removeEventListener("click", no); ui.dialog.removeEventListener("cancel", cancel);
      ui.dialog.close(); if (previousFocus instanceof HTMLElement) previousFocus.focus(); resolve(confirmed);
    };
    const yes = () => finish(true); const no = () => finish(false);
    const cancel = (event: Event) => { event.preventDefault(); finish(false); };
    ui.confirm.addEventListener("click", yes); ui.cancel.addEventListener("click", no); ui.dialog.addEventListener("cancel", cancel);
    ui.dialog.showModal(); ui.cancel.focus();
  });
}

ui.save.addEventListener("click", () => void act(async () => {
  const tab = state?.currentTab;
  if (!tab?.saveable) return;
  const result = await send("SAVE_TAB", { tabId: tab.id });
  await refresh();
  feedback(result.closed ? "Saved. Your page is waiting on the shelf." : "Saved, but the original tab stayed open. You can close it manually.", !result.closed);
}));
ui.openAll.addEventListener("click", async () => {
  if (busy || !state?.items.length || ui.dialog.open) return;
  if (isFiltered(view)) {
    const shown = applyView(state.items, view);
    const ids = shown.slice(0, MAX_OPEN_BATCH).map(tab => tab.id);
    if (!ids.length) return;
    const noun = ids.length === 1 ? "tab" : "tabs";
    if (!await confirm(`Open ${ids.length} matching ${noun}?`, shown.length > MAX_OPEN_BATCH ? `Only the first 20 of ${shown.length} results, in the current order, will open. Your shelf stays unchanged.` : "They open in the background and stay saved on your shelf.", `Open ${ids.length} ${noun}`)) return;
    void act(async () => {
      const result = await send("OPEN_SELECTED", { ids });
      feedback(`Opened ${result.opened} ${result.opened === 1 ? "tab" : "tabs"}.${result.failed ? ` ${result.failed} could not be opened. All pages remain saved.` : " All pages remain saved."}`, result.failed > 0);
    });
    return;
  }
  const count = Math.min(state.items.length, MAX_OPEN_BATCH);
  if (!await confirm(`Open ${count} saved ${count === 1 ? "tab" : "tabs"}?`, state.items.length > MAX_OPEN_BATCH ? "Only the 20 newest pages will open. Your shelf stays unchanged." : "Your pages will open in the background. They stay saved on your shelf.", `Open ${count} ${count === 1 ? "tab" : "tabs"}`)) return;
  void act(async () => {
    const result = await send("OPEN_BATCH", {});
    feedback(`Opened ${result.opened} ${result.opened === 1 ? "tab" : "tabs"}.${result.failed ? ` ${result.failed} could not be opened. All pages remain saved.` : " All pages remain saved."}`, result.failed > 0);
  });
});
ui.clear.addEventListener("click", async () => {
  if (busy || !state?.items.length || ui.dialog.open) return;
  if (!await confirm("Clear your shelf?", `This removes all ${state.items.length} saved pages from Later. Already-open tabs will stay open. This cannot be undone.`, "Clear shelf", true)) return;
  void act(async () => {
    const items = await send("CLEAR_SHELF", {}); refreshVersion++;
    if (state) { state.items = items; render(); }
    feedback("Your shelf is clear. Room for what’s next."); setTimeout(() => ui.save.focus(), 0);
  });
});
ui.retry.addEventListener("click", () => { feedback(""); ui.loading.hidden = state !== null; void refresh(); });
ui.more.addEventListener("click", () => { visibleItems += 40; render(); });

function setView(next: Partial<View>): void {
  view = { ...view, ...next };
  visibleItems = 40;
  ui.ranges.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.range === view.range)));
  ui.rangeTrack.dataset.active = view.range;
  render();
}
ui.search.addEventListener("input", () => setView({ query: ui.search.value }));
ui.search.addEventListener("keydown", event => {
  if (event.key !== "Escape" || !ui.search.value) return;
  event.preventDefault(); event.stopPropagation();
  ui.search.value = ""; setView({ query: "" });
});
ui.sort.addEventListener("change", () => {
  const sort = SORT_KEYS.find(key => key === ui.sort.value) ?? DEFAULT_VIEW.sort;
  setView({ sort: sort satisfies SortKey });
});
ui.ranges.forEach(button => button.addEventListener("click", () => {
  const range = RANGES.find(key => key === button.dataset.range) ?? DEFAULT_VIEW.range;
  setView({ range: range satisfies Range });
}));
ui.clearFilters.addEventListener("click", () => { ui.search.value = ""; setView({ query: "", range: "all" }); ui.search.focus(); });
document.addEventListener("keydown", event => {
  const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement;
  if (event.key !== "/" || typing || ui.toolbar.hidden || ui.dialog.open || event.metaKey || event.ctrlKey || event.altKey) return;
  event.preventDefault(); ui.search.focus();
});
if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && changes[SHELF_KEY]) void refresh(); });
}
void refresh();
