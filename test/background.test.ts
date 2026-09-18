import { beforeEach, expect, it, vi } from "vitest";
import { SHELF_KEY } from "../src/domain";

type Sender = { id?: string; url?: string; tab?: unknown };
type Handler = (request: unknown, sender: Sender, respond: (reply: unknown) => void) => boolean;

beforeEach(() => { vi.resetModules(); });

async function setup() {
  const data: Record<string, unknown> = {};
  const addListener = vi.fn<(handler: Handler) => void>();
  const set = vi.fn(async (values: Record<string, unknown>) => { Object.assign(data, structuredClone(values)); });
  const remove = vi.fn(async () => { expect(data[SHELF_KEY]).toBeDefined(); });
  vi.stubGlobal("chrome", {
    runtime: { id: "abc", getURL: (path: string) => `chrome-extension://abc/${path}`, onMessage: { addListener }, onInstalled: { addListener: vi.fn() } },
    storage: { local: { get: vi.fn(async () => structuredClone(data)), set }, onChanged: { addListener: vi.fn() } },
    tabs: { query: vi.fn(async () => [{ id: 7, title: "Example", url: "https://example.com" }]), get: vi.fn(async () => ({ id: 7, title: "Example", url: "https://example.com" })), remove, create: vi.fn(async () => undefined) },
    commands: { getAll: vi.fn(async () => [{ name: "save-current-tab", shortcut: "Ctrl+Shift+L" }]), onCommand: { addListener: vi.fn() } },
    action: { setBadgeText: vi.fn(async () => undefined), setBadgeBackgroundColor: vi.fn(async () => undefined), setTitle: vi.fn(async () => undefined) }
  });
  await import("../src/background");
  expect(addListener).toHaveBeenCalledTimes(1);
  const handler = addListener.mock.calls[0]?.[0];
  if (!handler) throw new Error("Worker listener not installed");
  return { handler, data, remove, set };
}

const popup = { id: "abc", url: "chrome-extension://abc/popup/index.html" } satisfies Sender;

it("rejects unauthorized senders before dispatching a privileged action", async () => {
  const f = await setup(); const respond = vi.fn();
  expect(f.handler({ type: "SAVE_TAB", tabId: 7 }, { id: "evil", url: popup.url }, respond)).toBe(false);
  expect(respond).toHaveBeenCalledWith(expect.objectContaining({ ok: false, error: expect.objectContaining({ code: "FORBIDDEN" }) }));
  expect(f.set).not.toHaveBeenCalled(); expect(f.remove).not.toHaveBeenCalled();
});

it("rejects arbitrary reopen URLs from even a trusted sender", async () => {
  const f = await setup(); const respond = vi.fn();
  expect(f.handler({ type: "OPEN_TAB", url: "https://example.com" }, popup, respond)).toBe(false);
  expect(respond).toHaveBeenCalledWith(expect.objectContaining({ ok: false, error: expect.objectContaining({ code: "INVALID_REQUEST" }) }));
});

it("keeps the message channel open until the tab has been saved and closed", async () => {
  const f = await setup(); const respond = vi.fn();
  expect(f.handler({ type: "SAVE_TAB", tabId: 7 }, popup, respond)).toBe(true);
  await vi.waitFor(() => expect(respond).toHaveBeenCalledWith(expect.objectContaining({ ok: true, data: expect.objectContaining({ closed: true }) })));
  expect(f.remove).toHaveBeenCalledWith(7);
});

it("returns user-safe failures and keeps the tab open on persistence error", async () => {
  const f = await setup(); const respond = vi.fn();
  f.set.mockRejectedValue(new Error("private implementation failure"));
  f.handler({ type: "SAVE_TAB", tabId: 7 }, popup, respond);
  await vi.waitFor(() => expect(respond).toHaveBeenCalledWith(expect.objectContaining({ ok: false, error: expect.objectContaining({ code: "OPERATION_FAILED" }) })));
  expect(JSON.stringify(respond.mock.calls)).not.toContain("private implementation failure");
  expect(f.remove).not.toHaveBeenCalled();
});
