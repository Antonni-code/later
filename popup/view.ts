import { displayHost } from "../src/domain";
import type { SavedTab } from "../src/domain";

export type SortKey = "newest" | "oldest" | "title" | "site";
export type Range = "all" | "today" | "week" | "older";
export interface View { query: string; sort: SortKey; range: Range }
export interface Segment { text: string; match: boolean }

export const DEFAULT_VIEW: View = { query: "", sort: "newest", range: "all" };
export const SORT_KEYS: readonly SortKey[] = ["newest", "oldest", "title", "site"];
export const RANGES: readonly Range[] = ["all", "today", "week", "older"];
const WEEK = 7 * 86_400_000;
const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

export function terms(query: string): string[] {
  return query.toLocaleLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
}

export function isFiltered(view: View): boolean {
  return terms(view.query).length > 0 || view.range !== "all";
}

export function inRange(savedAt: string, range: Range, now = Date.now()): boolean {
  if (range === "all") return true;
  const time = Date.parse(savedAt);
  if (range === "today") { const start = new Date(now); start.setHours(0, 0, 0, 0); return time >= start.getTime(); }
  return range === "week" ? now - time < WEEK : now - time >= WEEK;
}

/** Filters and sorts without touching the shelf; every term must match the title or the site. */
export function applyView(items: readonly SavedTab[], view: View, now = Date.now()): SavedTab[] {
  const words = terms(view.query);
  const rows = items.map(tab => ({ tab, host: displayHost(tab.url), time: Date.parse(tab.savedAt) }))
    .filter(row => inRange(row.tab.savedAt, view.range, now))
    .filter(row => { const haystack = `${row.tab.title} ${row.host}`.toLocaleLowerCase(); return words.every(word => haystack.includes(word)); });
  const newest = (a: { time: number }, b: { time: number }) => b.time - a.time;
  if (view.sort === "newest") rows.sort(newest);
  if (view.sort === "oldest") rows.sort((a, b) => a.time - b.time);
  if (view.sort === "title") rows.sort((a, b) => collator.compare(a.tab.title, b.tab.title) || newest(a, b));
  if (view.sort === "site") rows.sort((a, b) => collator.compare(a.host, b.host) || newest(a, b));
  return rows.map(row => row.tab);
}

/** Splits text into plain and matching segments so matches can be marked without HTML injection. */
export function highlight(text: string, words: readonly string[]): Segment[] {
  if (!words.length) return [{ text, match: false }];
  const lower = text.toLocaleLowerCase();
  if (lower.length !== text.length) return [{ text, match: false }];
  const marks = new Array<boolean>(text.length).fill(false);
  for (const word of words) {
    for (let at = lower.indexOf(word); at !== -1; at = lower.indexOf(word, at + word.length)) marks.fill(true, at, at + word.length);
  }
  const segments: Segment[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = segments[segments.length - 1];
    if (last && last.match === marks[i]) last.text += text[i];
    else segments.push({ text: text[i] ?? "", match: marks[i] ?? false });
  }
  return segments;
}
