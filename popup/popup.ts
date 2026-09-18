import { send } from "./api";
import { MAX_OPEN_BATCH, SHELF_KEY, displayHost, relativeTime } from "../src/domain";
import type { AppState, SavedTab } from "../src/domain";

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
  confirm: element<HTMLButtonElement>("dialog-confirm"), cancel: element<HTMLButtonElement>("dialog-cancel")
};
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

function createRow(tab: SavedTab, index: number): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "tab-item";
  const open = document.createElement("button");
  open.type = "button"; open.className = "tab-main"; open.title = tab.url;
  open.setAttribute("aria-label", `Reopen ${tab.title}`);
  const monogram = document.createElement("span");
  monogram.className = "tab-monogram"; monogram.setAttribute("aria-hidden", "true");
  monogram.textContent = displayHost(tab.url).charAt(0).toUpperCase();
  const copy = document.createElement("span"); copy.className = "tab-copy";
  const title = document.createElement("span"); title.className = "tab-title"; title.textContent = tab.title;
  const meta = document.createElement("span"); meta.className = "tab-meta";
  const host = document.createElement("span"); host.className = "tab-host"; host.textContent = displayHost(tab.url);
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
  ui.hint.textContent = tab?.saveable ? "It stays here until you’re ready." : tab?.reason || "Open a regular web page to get started.";
  ui.count.textContent = String(state.items.length); ui.count.setAttribute("aria-label", `${state.items.length} saved tabs`);
  ui.openAll.textContent = state.items.length > MAX_OPEN_BATCH ? "Open 20 newest" : "Open all";
  ui.empty.hidden = state.items.length > 0;
  ui.list.replaceChildren(...state.items.slice(0, visibleItems).map(createRow));
  ui.more.hidden = visibleItems >= state.items.length; ui.more.textContent = `Show ${Math.min(40, state.items.length - visibleItems)} more tabs`;
  ui.shortcut.textContent = state.shortcut === "Not assigned" ? "Assign a shortcut in Chrome" : `${state.shortcut} to save`;
  ui.shortcut.title = "Manage shortcuts at chrome://extensions/shortcuts";
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
if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && changes[SHELF_KEY]) void refresh(); });
}
void refresh();
