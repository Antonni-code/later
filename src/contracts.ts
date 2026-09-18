import { isRecord } from "./domain";
import type { AppState, SavedTab } from "./domain";

export interface Payloads {
  GET_STATE: Record<string, never>;
  SAVE_TAB: { tabId: number };
  OPEN_TAB: { id: string };
  REMOVE_TAB: { id: string };
  CLEAR_SHELF: Record<string, never>;
  OPEN_BATCH: Record<string, never>;
}

export interface Results {
  GET_STATE: AppState;
  SAVE_TAB: { item: SavedTab; closed: boolean };
  OPEN_TAB: { opened: number };
  REMOVE_TAB: SavedTab[];
  CLEAR_SHELF: SavedTab[];
  OPEN_BATCH: { opened: number; total: number; failed: number };
}

export type Action = keyof Payloads;
export type Request = { [K in Action]: { type: K } & Payloads[K] }[Action];
export type Reply<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export function isRequest(value: unknown): value is Request {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  const allowedKeys = value.type === "SAVE_TAB" ? ["type", "tabId"] : (value.type === "OPEN_TAB" || value.type === "REMOVE_TAB") ? ["type", "id"] : ["type"];
  if (Object.keys(value).some(key => !allowedKeys.includes(key))) return false;
  switch (value.type) {
    case "GET_STATE": case "CLEAR_SHELF": case "OPEN_BATCH": return true;
    case "SAVE_TAB": return typeof value.tabId === "number" && Number.isSafeInteger(value.tabId) && value.tabId >= 0;
    case "OPEN_TAB": case "REMOVE_TAB": return typeof value.id === "string" && value.id.length > 0 && value.id.length <= 100;
    default: return false;
  }
}

export function isTrustedSender(sender: { id?: string; url?: string; tab?: unknown }, extensionId: string, popupUrl: string): boolean {
  return sender.id === extensionId && sender.tab === undefined && sender.url === popupUrl;
}
