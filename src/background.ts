import { isRequest, isTrustedSender } from "./contracts";
import { LaterError, SHELF_KEY, parseShelf } from "./domain";
import { ShelfRepository } from "./repository";
import { ShelfService } from "./service";

const repository = new ShelfRepository({
  get: async keys => chrome.storage.local.get(keys),
  set: async values => chrome.storage.local.set(values)
});

const service = new ShelfService(repository, {
  currentTab: async () => (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0],
  getTab: async id => chrome.tabs.get(id),
  closeTab: async id => chrome.tabs.remove(id),
  openTab: async (url, active) => { await chrome.tabs.create({ url, active }); },
  shortcut: async () => (await chrome.commands.getAll()).find(command => command.name === "save-current-tab")?.shortcut || "Not assigned"
});

function errorReply(error: unknown) {
  return {
    ok: false,
    error: error instanceof LaterError ? { code: error.code, message: error.message } : { code: "OPERATION_FAILED", message: "Later could not complete that action. Nothing was removed from your shelf. Please try again." }
  };
}

async function updateBadge(count: number): Promise<void> {
  await chrome.action.setTitle({ title: "Later — Close now, reopen later" });
  await chrome.action.setBadgeBackgroundColor({ color: "#1f2d25" });
  await chrome.action.setBadgeText({ text: count > 0 ? (count > 99 ? "99+" : String(count)) : "" });
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (!isTrustedSender(sender, chrome.runtime.id, chrome.runtime.getURL("popup/index.html"))) {
    sendResponse({ ok: false, error: { code: "FORBIDDEN", message: "This action must come from the Later popup." } });
    return false;
  }
  if (!isRequest(message)) {
    sendResponse({ ok: false, error: { code: "INVALID_REQUEST", message: "This request could not be understood." } });
    return false;
  }
  void service.dispatch(message).then(data => {
    sendResponse({ ok: true, data });
    if (message.type === "GET_STATE" && "items" in data) void updateBadge(data.items.length).catch(() => undefined);
  }, error => sendResponse(errorReply(error)));
  return true;
});

chrome.commands.onCommand.addListener(command => {
  if (command !== "save-current-tab") return;
  void (async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id === undefined) return;
    const result = await service.save(tab.id);
    if (!result.closed) throw new LaterError("CLOSE_FAILED", "Saved but not closed.");
  })().catch(async () => {
    // Visible error cue without logging private page data or requesting notifications.
    await chrome.action.setBadgeBackgroundColor({ color: "#a43d2d" });
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setTitle({ title: "Later — last shortcut action needs attention. Open the popup to check your shelf." });
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[SHELF_KEY]) return;
  try { void updateBadge(parseShelf(changes[SHELF_KEY].newValue).items.length).catch(() => undefined); } catch { /* leave malformed data untouched */ }
});

chrome.runtime.onInstalled.addListener(() => {
  void repository.list().then(items => updateBadge(items.length)).catch(() => undefined);
});
