import { LaterError, MAX_OPEN_BATCH, isWebUrl, makeSavedTab } from "./domain";
import type { CurrentTab } from "./domain";
import type { Request, Results } from "./contracts";
import { ShelfRepository } from "./repository";

export interface BrowserTab {
  id?: number | undefined;
  title?: string | undefined;
  url?: string | undefined;
  incognito?: boolean | undefined;
  pinned?: boolean | undefined;
}

export interface BrowserPort {
  currentTab(): Promise<BrowserTab | undefined>;
  getTab(id: number): Promise<BrowserTab>;
  closeTab(id: number): Promise<void>;
  openTab(url: string, active: boolean): Promise<void>;
  shortcut(): Promise<string>;
}

export class ShelfService {
  private saves = new Map<number, Promise<Results["SAVE_TAB"]>>();
  private batch: Promise<Results["OPEN_BATCH"]> | undefined;
  private selection: Promise<Results["OPEN_SELECTED"]> | undefined;

  constructor(private readonly repository: ShelfRepository, private readonly browser: BrowserPort) {}

  private async current(): Promise<CurrentTab | null> {
    const tab = await this.browser.currentTab();
    if (!tab || tab.id === undefined) return null;
    const saveable = isWebUrl(tab.url) && !tab.incognito && !tab.pinned;
    const reason = tab.incognito ? "Private-session tabs stay private. Later does not save them." : tab.pinned ? "Unpin this tab before saving it." : !isWebUrl(tab.url) ? "Open a regular web page to save it for later." : "";
    return { id: tab.id, title: tab.title || "Current page", url: tab.url || "", saveable, reason };
  }

  save(tabId: number): Promise<Results["SAVE_TAB"]> {
    const existing = this.saves.get(tabId);
    if (existing) return existing;
    const result = this.saveOnce(tabId).finally(() => { this.saves.delete(tabId); });
    this.saves.set(tabId, result);
    return result;
  }

  private async saveOnce(tabId: number): Promise<Results["SAVE_TAB"]> {
    let tab: BrowserTab;
    try { tab = await this.browser.getTab(tabId); } catch {
      throw new LaterError("TAB_GONE", "That tab is no longer open. Refresh Later and try again.");
    }
    if (tab.incognito) throw new LaterError("PRIVATE_TAB", "Later does not save private-session tabs.");
    if (tab.pinned) throw new LaterError("PINNED_TAB", "Unpin this tab before saving it.");
    const item = makeSavedTab(tab);
    await this.repository.add(item);
    // Check again: do not close a different page if navigation happened mid-save.
    try {
      const latest = await this.browser.getTab(tabId);
      if (latest.url !== tab.url || latest.pinned || latest.incognito) return { item, closed: false };
      await this.browser.closeTab(tabId);
      return { item, closed: true };
    } catch { return { item, closed: false }; }
  }

  async open(id: string): Promise<Results["OPEN_TAB"]> {
    const item = (await this.repository.list()).find(tab => tab.id === id);
    if (!item) throw new LaterError("ITEM_GONE", "This saved tab was removed. Refresh the shelf.");
    await this.browser.openTab(item.url, true);
    return { opened: 1 };
  }

  openBatch(): Promise<Results["OPEN_BATCH"]> {
    if (this.batch) return this.batch;
    this.batch = this.openBatchOnce().finally(() => { this.batch = undefined; });
    return this.batch;
  }

  private async openBatchOnce(): Promise<Results["OPEN_BATCH"]> {
    const items = await this.repository.list();
    let opened = 0;
    let failed = 0;
    // Bound resource use and report partial success. No unbounded Promise.all.
    for (const item of items.slice(0, MAX_OPEN_BATCH)) {
      try { await this.browser.openTab(item.url, false); opened++; } catch { failed++; }
    }
    return { opened, failed, total: items.length };
  }

  /** Opens saved pages by ID in the given order. IDs only: URLs always come from storage. */
  openSelected(ids: readonly string[]): Promise<Results["OPEN_SELECTED"]> {
    if (this.selection) return this.selection;
    this.selection = this.openSelectedOnce(ids.slice(0, MAX_OPEN_BATCH)).finally(() => { this.selection = undefined; });
    return this.selection;
  }

  private async openSelectedOnce(ids: readonly string[]): Promise<Results["OPEN_SELECTED"]> {
    const byId = new Map((await this.repository.list()).map(item => [item.id, item]));
    let opened = 0;
    let failed = 0;
    for (const id of ids) {
      const item = byId.get(id);
      if (!item) { failed++; continue; }
      try { await this.browser.openTab(item.url, false); opened++; } catch { failed++; }
    }
    return { opened, failed, total: ids.length };
  }

  async dispatch(request: Request): Promise<Results[keyof Results]> {
    switch (request.type) {
      case "GET_STATE": {
        const [items, currentTab, shortcut] = await Promise.all([this.repository.list(), this.current(), this.browser.shortcut()]);
        return { items, currentTab, shortcut };
      }
      case "SAVE_TAB": return this.save(request.tabId);
      case "OPEN_TAB": return this.open(request.id);
      case "REMOVE_TAB": return this.repository.remove(request.id);
      case "CLEAR_SHELF": return this.repository.clear();
      case "OPEN_BATCH": return this.openBatch();
      case "OPEN_SELECTED": return this.openSelected(request.ids);
    }
  }
}
