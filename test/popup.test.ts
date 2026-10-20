// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState, SavedTab } from "../src/domain";
import type { Request } from "../src/contracts";

const html = readFileSync("popup/index.html", "utf8");
function item(n = 1): SavedTab { return { id: String(n), title: `Useful page ${n}`, url: `https://example.com/${n}`, savedAt: new Date().toISOString() }; }
function button(id: string) { return document.getElementById(id) as HTMLButtonElement; }
function text(id: string) { return document.getElementById(id)?.textContent; }

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = new DOMParser().parseFromString(html, "text/html").body.innerHTML;
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function(this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function(this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function prepare(items = [item()], options: { saveable?: boolean; failed?: boolean } = {}) {
  const state: AppState = { items, currentTab: { id: 7, title: "Current useful page", url: "https://example.com/current", saveable: options.saveable ?? true, reason: "This page cannot be saved." }, shortcut: "Ctrl+Shift+L" };
  const sendMessage = vi.fn(async (request: Request) => {
    if (request.type === "GET_STATE") return options.failed ? { ok: false, error: { code: "INVALID_STORAGE", message: "Your shelf could not be read. Nothing was changed." } } : { ok: true, data: structuredClone(state) };
    if (request.type === "REMOVE_TAB") { state.items = state.items.filter(row => row.id !== request.id); return { ok: true, data: [...state.items] }; }
    if (request.type === "CLEAR_SHELF") { state.items = []; return { ok: true, data: [] }; }
    if (request.type === "OPEN_SELECTED") return { ok: true, data: { opened: request.ids.length, total: request.ids.length, failed: 0 } };
    if (request.type === "OPEN_BATCH") return { ok: true, data: { opened: Math.min(20, state.items.length), total: state.items.length, failed: 0 } };
    if (request.type === "SAVE_TAB") { const saved = item(99); state.items.unshift(saved); return { ok: true, data: { item: saved, closed: false } }; }
    return { ok: true, data: { opened: 1 } };
  });
  vi.stubGlobal("chrome", { runtime: { id: "test", sendMessage }, storage: { onChanged: { addListener: vi.fn() } } });
  await import("../popup/popup");
  await vi.waitFor(() => expect(document.getElementById("loading-state")?.hidden).toBe(true));
  return { state, sendMessage };
}

describe("popup user journey", () => {
  it("renders shelf data and current tab without requesting remote assets", async () => {
    await prepare();
    expect(text("count")).toBe("1"); expect(text("current-title")).toBe("Current useful page");
    expect(document.querySelectorAll(".tab-item")).toHaveLength(1);
    expect(document.querySelectorAll("img, iframe, link[href^='https']")).toHaveLength(0);
    expect(button("save-current").disabled).toBe(false);
  });
  it("renders malicious-looking titles as plain text", async () => {
    const saved = { ...item(), title: '<img src=x onerror="alert(1)">' };
    await prepare([saved]);
    expect(document.querySelector(".tab-title")?.textContent).toBe(saved.title);
    expect(document.querySelectorAll("img")).toHaveLength(0);
  });
  it("explains the empty state and disables empty actions", async () => {
    await prepare([]);
    expect(document.getElementById("empty-state")?.hidden).toBe(false);
    expect(button("open-all").disabled).toBe(true); expect(button("clear-all").disabled).toBe(true);
  });
  it("keeps unsupported pages from saving", async () => {
    await prepare([], { saveable: false });
    expect(button("save-current").disabled).toBe(true);
    expect(text("current-hint")).toContain("cannot be saved");
  });
  it("makes initial-read failure actionable without claiming an empty shelf", async () => {
    await prepare([], { failed: true });
    expect(text("status")).toContain("Nothing was changed");
    expect(button("retry").hidden).toBe(false);
    expect(document.getElementById("empty-state")?.hidden).toBe(true);
    expect(button("save-current").disabled).toBe(true);
  });
  it("saves the captured tab ID and reports close failure truthfully", async () => {
    const f = await prepare([]);
    button("save-current").click();
    await vi.waitFor(() => expect(text("status")).toContain("original tab stayed open"));
    expect(f.sendMessage).toHaveBeenCalledWith({ type: "SAVE_TAB", tabId: 7 });
    expect(text("count")).toBe("1"); expect(button("save-current").disabled).toBe(false);
  });
  it("removes a saved item and restores keyboard focus", async () => {
    const f = await prepare([item(1), item(2)]);
    (document.querySelector(".delete-button") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(text("count")).toBe("1"));
    await vi.waitFor(() => expect(document.activeElement?.getAttribute("aria-label")).toContain("Remove Useful page 2"));
    expect(f.sendMessage).toHaveBeenCalledWith({ type: "REMOVE_TAB", id: "1" });
  });
  it("requires clear confirmation and supports cancelling with Escape", async () => {
    const f = await prepare();
    button("clear-all").focus(); button("clear-all").click();
    const dialog = document.getElementById("confirm-dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(true); expect(document.activeElement?.id).toBe("dialog-cancel");
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(dialog.open).toBe(false); expect(document.activeElement?.id).toBe("clear-all");
    expect(f.sendMessage.mock.calls.some(([request]) => request.type === "CLEAR_SHELF")).toBe(false);
    button("clear-all").click(); button("dialog-confirm").click();
    await vi.waitFor(() => expect(text("count")).toBe("0"));
    expect(document.getElementById("empty-state")?.hidden).toBe(false);
  });
  it("labels bounded bulk opening and confirms before sending", async () => {
    const f = await prepare(Array.from({ length: 25 }, (_, n) => item(n)));
    expect(text("open-all")).toBe("Open 20 newest");
    button("open-all").click(); expect(text("dialog-description")).toContain("20 newest");
    expect(f.sendMessage.mock.calls.some(([request]) => request.type === "OPEN_BATCH")).toBe(false);
    button("dialog-confirm").click();
    await vi.waitFor(() => expect(text("status")).toContain("Opened 20 tabs"));
    expect(text("count")).toBe("25");
  });
  it("bounds initial rendered rows and can reveal more", async () => {
    await prepare(Array.from({ length: 45 }, (_, n) => item(n)));
    expect(document.querySelectorAll(".tab-item")).toHaveLength(40);
    expect(button("show-more").hidden).toBe(false);
    button("show-more").click();
    expect(document.querySelectorAll(".tab-item")).toHaveLength(45);
    expect(button("show-more").hidden).toBe(true);
  });
  it("prevents repeated clicks while an action is pending", async () => {
    const f = await prepare();
    let finish: ((value: { ok: true; data: { opened: number } }) => void) | undefined;
    f.sendMessage.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const open = document.querySelector(".tab-main") as HTMLButtonElement;
    open.click(); open.click();
    expect(f.sendMessage.mock.calls.filter(([request]) => request.type === "OPEN_TAB")).toHaveLength(1);
    expect(open.disabled).toBe(true);
    finish?.({ ok: true, data: { opened: 1 } });
    await vi.waitFor(() => expect(open.disabled).toBe(false));
  });
});

describe("finding pages on a full shelf", () => {
  const shelf = () => [
    { id: "a", title: "Designing calm tools", url: "https://read.cv/a", savedAt: new Date().toISOString() },
    { id: "b", title: "Weekend reading", url: "https://news.example/b", savedAt: new Date(Date.now() - 864e5 * 10).toISOString() },
    { id: "c", title: "A design system", url: "https://github.com/c", savedAt: new Date(Date.now() - 36e5).toISOString() },
    { id: "d", title: "Release notes", url: "https://github.com/d", savedAt: new Date(Date.now() - 72e5).toISOString() }
  ];
  function type(value: string) {
    const search = document.getElementById("search") as HTMLInputElement;
    search.value = value; search.dispatchEvent(new Event("input"));
    return search;
  }

  it("hides the tools on a small shelf", async () => {
    await prepare([item(1), item(2)]);
    expect(document.getElementById("toolbar")?.hidden).toBe(true);
  });
  it("filters as you type, marks matches as text, and counts results", async () => {
    await prepare(shelf());
    expect(document.getElementById("toolbar")?.hidden).toBe(false);
    type("design");
    expect(text("count")).toBe("2 of 4");
    expect([...document.querySelectorAll(".tab-title")].map(node => node.textContent)).toEqual(["Designing calm tools", "A design system"]);
    expect([...document.querySelectorAll("mark")].map(node => node.textContent)).toEqual(["Design", "design"]);
    expect(text("open-all")).toBe("Open 2 results");
  });
  it("explains an empty result and clears filters", async () => {
    await prepare(shelf());
    type("zzz");
    expect(document.getElementById("no-results")?.hidden).toBe(false);
    expect(text("no-results-text")).toContain("zzz");
    expect(button("open-all").hidden).toBe(true);
    expect(document.getElementById("empty-state")?.hidden).toBe(true);
    button("clear-filters").click();
    expect(text("count")).toBe("4");
    expect(document.querySelectorAll(".tab-item")).toHaveLength(4);
  });
  it("clears the search with Escape and focuses it with slash", async () => {
    await prepare(shelf());
    const search = type("notes");
    search.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(search.value).toBe(""); expect(text("count")).toBe("4");
    search.blur();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(search);
  });
  it("groups by site and filters by saved date", async () => {
    await prepare(shelf());
    const sort = document.getElementById("sort") as HTMLSelectElement;
    sort.value = "site"; sort.dispatchEvent(new Event("change"));
    expect([...document.querySelectorAll(".group-header")].map(node => node.textContent)).toEqual(["github.com2", "news.example1", "read.cv1"]);
    const range = document.getElementById("range") as HTMLSelectElement;
    range.value = "older"; range.dispatchEvent(new Event("change"));
    expect(text("count")).toBe("1 of 4");
    expect(range.value).toBe("older");
  });
  it("opens only the visible results by ID after confirming", async () => {
    const f = await prepare(shelf());
    type("github");
    button("open-all").click();
    expect(text("dialog-title")).toBe("Open 2 matching tabs?");
    button("dialog-confirm").click();
    await vi.waitFor(() => expect(text("status")).toContain("Opened 2 tabs"));
    expect(f.sendMessage).toHaveBeenCalledWith({ type: "OPEN_SELECTED", ids: ["c", "d"] });
    expect(f.sendMessage.mock.calls.some(([request]) => request.type === "OPEN_BATCH")).toBe(false);
  });
});
