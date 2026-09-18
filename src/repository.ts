import { LEGACY_KEY, LaterError, MAX_ITEMS, SHELF_KEY, parseItems, parseShelf } from "./domain";
import type { SavedTab, Shelf } from "./domain";

export interface StoragePort {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(values: Record<string, unknown>): Promise<void>;
}

// Only the service worker constructs this repository: one queue owns all writes.
export class ShelfRepository {
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly storage: StoragePort) {}

  private run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(operation);
    this.tail = result.catch(() => undefined);
    return result;
  }

  private async read(): Promise<Shelf> {
    const data = await this.storage.get([SHELF_KEY, LEGACY_KEY]);
    if (data[SHELF_KEY] !== undefined) {
      const shelf = parseShelf(data[SHELF_KEY]);
      if (data[LEGACY_KEY] !== undefined && (!Array.isArray(data[LEGACY_KEY]) || data[LEGACY_KEY].length > 0)) await this.storage.set({ [LEGACY_KEY]: [] });
      return shelf;
    }
    if (data[LEGACY_KEY] === undefined) return { version: 1, items: [] };
    const shelf: Shelf = { version: 1, items: parseItems(data[LEGACY_KEY]) };
    // Do not erase the source until the canonical write has completed.
    await this.storage.set({ [SHELF_KEY]: shelf });
    await this.storage.set({ [LEGACY_KEY]: [] });
    return shelf;
  }

  list(): Promise<SavedTab[]> {
    return this.run(async () => (await this.read()).items);
  }

  add(item: SavedTab): Promise<void> {
    return this.run(async () => {
      const shelf = await this.read();
      if (shelf.items.length >= MAX_ITEMS) throw new LaterError("SHELF_FULL", "Your shelf is full. Remove a saved tab before saving another. This tab is still open.");
      shelf.items.unshift(item);
      await this.storage.set({ [SHELF_KEY]: shelf });
    });
  }

  remove(id: string): Promise<SavedTab[]> {
    return this.run(async () => {
      const shelf = await this.read();
      shelf.items = shelf.items.filter(item => item.id !== id);
      await this.storage.set({ [SHELF_KEY]: shelf });
      return shelf.items;
    });
  }

  clear(): Promise<SavedTab[]> {
    return this.run(async () => {
      // Validate before overwriting: corrupt/newer data must not be erased.
      await this.read();
      await this.storage.set({ [SHELF_KEY]: { version: 1, items: [] }, [LEGACY_KEY]: [] });
      return [];
    });
  }
}
