export const SHELF_KEY = "later.shelf";
export const LEGACY_KEY = "savedTabs";
export const MAX_ITEMS = 500;
export const MAX_OPEN_BATCH = 20;

export interface SavedTab {
  id: string;
  title: string;
  url: string;
  savedAt: string;
}

export interface Shelf {
  version: 1;
  items: SavedTab[];
}

export interface CurrentTab {
  id: number;
  title: string;
  url: string;
  saveable: boolean;
  reason: string;
}

export interface AppState {
  items: SavedTab[];
  currentTab: CurrentTab | null;
  shortcut: string;
}

export class LaterError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "LaterError";
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isWebUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 8192) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

export function makeSavedTab(tab: { title?: string | undefined; url?: string | undefined }): SavedTab {
  if (!isWebUrl(tab.url)) throw new LaterError("UNSUPPORTED_PAGE", "Later saves ordinary HTTP and HTTPS pages. This page cannot be saved.");
  return {
    id: crypto.randomUUID(),
    title: (tab.title?.trim() || new URL(tab.url).hostname).slice(0, 300),
    url: tab.url,
    savedAt: new Date().toISOString()
  };
}

export function parseItems(value: unknown): SavedTab[] {
  if (!Array.isArray(value) || value.length > MAX_ITEMS) throw new LaterError("INVALID_STORAGE", "Your saved shelf could not be read. Nothing has been changed.");
  const ids = new Set<string>();
  return value.map((item: unknown) => {
    if (!isRecord(item) || typeof item.id !== "string" || !item.id || item.id.length > 100 || ids.has(item.id) || typeof item.title !== "string" || item.title.length > 300 || !isWebUrl(item.url) || typeof item.savedAt !== "string" || item.savedAt.length > 40 || !Number.isFinite(Date.parse(item.savedAt))) {
      throw new LaterError("INVALID_STORAGE", "Your saved shelf could not be read. Nothing has been changed.");
    }
    ids.add(item.id);
    return { id: item.id, title: item.title, url: item.url, savedAt: item.savedAt };
  });
}

export function parseShelf(value: unknown): Shelf {
  if (!isRecord(value) || value.version !== 1) throw new LaterError("UNKNOWN_SCHEMA", "This shelf uses an unsupported format. Nothing has been changed.");
  return { version: 1, items: parseItems(value.items) };
}

export function displayHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Saved page"; }
}

export function relativeTime(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return "Just saved";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}
