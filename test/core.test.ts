import { describe, expect, it, vi } from "vitest";
import { LEGACY_KEY, MAX_ITEMS, SHELF_KEY, isWebUrl, makeSavedTab, parseShelf } from "../src/domain";
import { isRequest, isTrustedSender } from "../src/contracts";
import { ShelfRepository } from "../src/repository";
import type { StoragePort } from "../src/repository";
import { ShelfService } from "../src/service";
import type { BrowserPort } from "../src/service";

function fixture(seed: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = structuredClone(seed);
  const storage: StoragePort = {
    get: vi.fn(async () => structuredClone(data)),
    set: vi.fn(async values => { Object.assign(data, structuredClone(values)); })
  };
  const browser: BrowserPort = {
    currentTab: vi.fn(async () => ({ id: 7, title: "Example", url: "https://example.com" })),
    getTab: vi.fn(async () => ({ id: 7, title: "Example", url: "https://example.com" })),
    closeTab: vi.fn(async () => undefined),
    openTab: vi.fn(async () => undefined),
    shortcut: vi.fn(async () => "Ctrl+Shift+L")
  };
  const repository = new ShelfRepository(storage);
  return { data, storage, browser, repository, service: new ShelfService(repository, browser) };
}

describe("domain and boundary validation", () => {
  it.each(["https://example.com", "http://localhost:3000"])('allows web URL %s', url => expect(isWebUrl(url)).toBe(true));
  it.each(["chrome://settings", "file:///secret.txt", "javascript:alert(1)", "data:text/html,hi", "https://user:pass@example.com", "invalid", "https://example.com/" + "x".repeat(8192)])('rejects unsupported URL', url => expect(isWebUrl(url)).toBe(false));
  it("trims and bounds titles", () => {
    expect(makeSavedTab({ title: "  Example  ", url: "https://example.com" }).title).toBe("Example");
    expect(makeSavedTab({ title: "x".repeat(1000), url: "https://example.com" }).title).toHaveLength(300);
    expect(makeSavedTab({ url: "https://example.com" }).title).toBe("example.com");
  });
  it("validates the entire message, not just the action", () => {
    expect(isRequest({ type: "SAVE_TAB", tabId: 7 })).toBe(true);
    for (const message of [{ type: "SAVE_TAB", tabId: -1 }, { type: "SAVE_TAB", tabId: 1.5 }, { type: "OPEN_TAB", url: "https://evil.com" }, { type: "GET_STATE", extra: 1 }, { type: "__proto__" }, null]) expect(isRequest(message)).toBe(false);
  });
  it("accepts only the exact extension popup sender", () => {
    const popup = "chrome-extension://abc/popup/index.html";
    expect(isTrustedSender({ id: "abc", url: popup }, "abc", popup)).toBe(true);
    expect(isTrustedSender({ id: "other", url: popup }, "abc", popup)).toBe(false);
    expect(isTrustedSender({ id: "abc", url: "https://example.com" }, "abc", popup)).toBe(false);
    expect(isTrustedSender({ id: "abc", url: popup, tab: {} }, "abc", popup)).toBe(false);
  });
  it("rejects newer schemas and duplicate or malformed records", () => {
    expect(() => parseShelf({ version: 2, items: [] })).toThrow();
    const item = makeSavedTab({ url: "https://example.com" });
    expect(() => parseShelf({ version: 1, items: [item, item] })).toThrow();
    expect(() => parseShelf({ version: 1, items: [{ ...item, url: "javascript:alert(1)" }] })).toThrow();
    expect(() => parseShelf({ version: 1, items: [{ ...item, savedAt: "yesterday" }] })).toThrow();
  });
});

describe("versioned local storage", () => {
  it("migrates legacy records without retaining remote favicons", async () => {
    const item = makeSavedTab({ url: "https://example.com" });
    const f = fixture({ [LEGACY_KEY]: [{ ...item, favIconUrl: "https://remote.com/tracker" }] });
    expect(await f.repository.list()).toEqual([item]);
    expect(f.data[SHELF_KEY]).toEqual({ version: 1, items: [item] });
    expect(f.data[LEGACY_KEY]).toEqual([]);
  });
  it("does not mutate corrupt legacy or newer-schema data", async () => {
    for (const seed of [{ [LEGACY_KEY]: "broken" }, { [SHELF_KEY]: { version: 2, items: [] } }]) {
      const f = fixture(seed);
      await expect(f.repository.clear()).rejects.toThrow();
      expect(f.storage.set).not.toHaveBeenCalled();
      expect(f.data).toEqual(seed);
    }
  });
  it("keeps legacy data if migration storage fails", async () => {
    const seed = { [LEGACY_KEY]: [makeSavedTab({ url: "https://example.com" })] };
    const f = fixture(seed);
    vi.mocked(f.storage.set).mockRejectedValue(new Error("quota"));
    await expect(f.repository.list()).rejects.toThrow();
    expect(f.data).toEqual(seed);
  });
  it("commits the migrated shelf before clearing the legacy source", async () => {
    const saved = makeSavedTab({ url: "https://example.com" });
    const f = fixture({ [LEGACY_KEY]: [saved] });
    const originalSet = f.storage.set;
    f.storage.set = vi.fn(async values => {
      if (LEGACY_KEY in values) {
        expect(f.data[SHELF_KEY]).toEqual({ version: 1, items: [saved] });
        throw new Error("cleanup interrupted");
      }
      await originalSet(values);
    });
    await expect(f.repository.list()).rejects.toThrow();
    expect(f.data[LEGACY_KEY]).toEqual([saved]);
    expect(f.data[SHELF_KEY]).toEqual({ version: 1, items: [saved] });
    f.storage.set = originalSet;
    expect(await f.repository.list()).toEqual([saved]);
    expect(f.data[LEGACY_KEY]).toEqual([]);
  });
  it("serializes concurrent writes without losing data", async () => {
    const f = fixture();
    await Promise.all(Array.from({ length: 30 }, (_, n) => f.repository.add(makeSavedTab({ url: `https://example.com/${n}` }))));
    expect(await f.repository.list()).toHaveLength(30);
    expect(new Set((await f.repository.list()).map(item => item.url)).size).toBe(30);
  });
  it("serializes deletes and saves together", async () => {
    const f = fixture();
    const old = makeSavedTab({ url: "https://example.com/old" });
    const next = makeSavedTab({ url: "https://example.com/next" });
    await f.repository.add(old);
    await Promise.all([f.repository.add(next), f.repository.remove(old.id)]);
    expect(await f.repository.list()).toEqual([next]);
  });
  it("recovers the queue after a failed write", async () => {
    const f = fixture();
    vi.mocked(f.storage.set).mockRejectedValueOnce(new Error("quota"));
    await expect(f.repository.add(makeSavedTab({ url: "https://example.com/failed" }))).rejects.toThrow();
    const good = makeSavedTab({ url: "https://example.com/good" });
    await f.repository.add(good);
    expect(await f.repository.list()).toEqual([good]);
  });
  it("rejects capacity overflow without evicting anything", async () => {
    const items = Array.from({ length: MAX_ITEMS }, (_, n) => makeSavedTab({ url: `https://example.com/${n}` }));
    const f = fixture({ [SHELF_KEY]: { version: 1, items } });
    await expect(f.service.save(7)).rejects.toMatchObject({ code: "SHELF_FULL" });
    expect(await f.repository.list()).toEqual(items);
    expect(f.browser.closeTab).not.toHaveBeenCalled();
  });
});

describe("save and reopen critical paths", () => {
  it("commits durable data before closing the captured tab", async () => {
    const f = fixture();
    vi.mocked(f.browser.closeTab).mockImplementation(async id => {
      expect(id).toBe(7);
      expect((await f.repository.list()).length).toBe(1);
    });
    expect((await f.service.save(7)).closed).toBe(true);
  });
  it("never closes a tab if saving fails", async () => {
    const f = fixture();
    vi.mocked(f.storage.set).mockRejectedValue(new Error("quota"));
    await expect(f.service.save(7)).rejects.toThrow();
    expect(f.browser.closeTab).not.toHaveBeenCalled();
  });
  it("retains saved data when Chrome cannot close the tab", async () => {
    const f = fixture();
    vi.mocked(f.browser.closeTab).mockRejectedValue(new Error("closed elsewhere"));
    expect((await f.service.save(7)).closed).toBe(false);
    expect(await f.repository.list()).toHaveLength(1);
  });
  it("does not close a tab that navigated during the save", async () => {
    const f = fixture();
    vi.mocked(f.browser.getTab).mockResolvedValueOnce({ id: 7, url: "https://example.com" }).mockResolvedValueOnce({ id: 7, url: "https://example.com/next" });
    expect((await f.service.save(7)).closed).toBe(false);
    expect(f.browser.closeTab).not.toHaveBeenCalled();
  });
  it("deduplicates overlapping commands for the same captured tab", async () => {
    const f = fixture();
    const [first, second] = await Promise.all([f.service.save(7), f.service.save(7)]);
    expect(first.item.id).toBe(second.item.id);
    expect(await f.repository.list()).toHaveLength(1);
    expect(f.browser.closeTab).toHaveBeenCalledTimes(1);
  });
  it.each([{ incognito: true }, { pinned: true }])("keeps protected tab open: %j", async flags => {
    const f = fixture();
    vi.mocked(f.browser.getTab).mockResolvedValue({ id: 7, url: "https://example.com", ...flags });
    await expect(f.service.save(7)).rejects.toThrow();
    expect(f.storage.set).not.toHaveBeenCalled();
    expect(f.browser.closeTab).not.toHaveBeenCalled();
  });
  it("opens only a known saved ID and retains the item", async () => {
    const f = fixture();
    const { item } = await f.service.save(7);
    await f.service.open(item.id);
    expect(f.browser.openTab).toHaveBeenCalledWith(item.url, true);
    expect(await f.repository.list()).toHaveLength(1);
    await expect(f.service.open("missing")).rejects.toMatchObject({ code: "ITEM_GONE" });
    expect(f.browser.openTab).toHaveBeenCalledTimes(1);
  });
  it("bounds bulk reopening and reports partial failures", async () => {
    const items = Array.from({ length: 25 }, (_, n) => makeSavedTab({ url: `https://example.com/${n}` }));
    const f = fixture({ [SHELF_KEY]: { version: 1, items } });
    vi.mocked(f.browser.openTab).mockRejectedValueOnce(new Error("Chrome failed"));
    const [first, second] = await Promise.all([f.service.openBatch(), f.service.openBatch()]);
    expect(first).toEqual({ opened: 19, total: 25, failed: 1 });
    expect(second).toEqual(first);
    expect(f.browser.openTab).toHaveBeenCalledTimes(20);
    expect(await f.repository.list()).toHaveLength(25);
  });
});
