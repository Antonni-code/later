import { describe, expect, it } from "vitest";
import type { SavedTab } from "../src/domain";
import { DEFAULT_VIEW, applyView, dayBucket, highlight, inRange, isFiltered, terms } from "../popup/view";

const now = Date.parse("2026-10-20T12:00:00Z");
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
const tab = (id: string, title: string, url: string, hours: number): SavedTab => ({ id, title, url, savedAt: hoursAgo(hours) });
const items = [
  tab("1", "Designing for the long term", "https://read.cv/a", 1),
  tab("2", "item 10 notes", "https://github.com/x", 30),
  tab("3", "item 9 notes", "https://www.github.com/y", 200),
  tab("4", "Calm design", "https://read.cv/b", 2)
];
const ids = (rows: SavedTab[]) => rows.map(row => row.id);

describe("shelf view", () => {
  it("leaves the shelf unfiltered by default", () => {
    expect(isFiltered(DEFAULT_VIEW)).toBe(false);
    expect(ids(applyView(items, DEFAULT_VIEW, now))).toEqual(["1", "4", "2", "3"]);
  });
  it("matches every term against title or site, case-insensitively", () => {
    expect(ids(applyView(items, { ...DEFAULT_VIEW, query: "DESIGN" }, now))).toEqual(["1", "4"]);
    expect(ids(applyView(items, { ...DEFAULT_VIEW, query: "notes github" }, now))).toEqual(["2", "3"]);
    expect(applyView(items, { ...DEFAULT_VIEW, query: "nothing" }, now)).toEqual([]);
    expect(terms("  a   b ")).toEqual(["a", "b"]);
  });
  it("sorts oldest, by natural title order, and by site", () => {
    expect(ids(applyView(items, { ...DEFAULT_VIEW, sort: "oldest" }, now))).toEqual(["3", "2", "4", "1"]);
    expect(ids(applyView(items, { ...DEFAULT_VIEW, sort: "title" }, now))).toEqual(["4", "1", "3", "2"]);
    expect(ids(applyView(items, { ...DEFAULT_VIEW, sort: "site" }, now))).toEqual(["2", "3", "1", "4"]);
  });
  it("filters by when a page was saved", () => {
    expect(inRange(hoursAgo(1), "week", now)).toBe(true);
    expect(ids(applyView(items, { ...DEFAULT_VIEW, range: "week" }, now))).toEqual(["1", "4", "2"]);
    expect(ids(applyView(items, { ...DEFAULT_VIEW, range: "older" }, now))).toEqual(["3"]);
  });
  it("marks matches as segments instead of markup", () => {
    expect(highlight("Design <b>design</b>", ["design"])).toEqual([
      { text: "Design", match: true }, { text: " <b>", match: false }, { text: "design", match: true }, { text: "</b>", match: false }
    ]);
    expect(highlight("İstanbul", ["i"])).toEqual([{ text: "İstanbul", match: false }]);
  });
  it("buckets saved dates into today, yesterday, this week and earlier", () => {
    const local = new Date(2026, 9, 20, 12).getTime();
    expect(dayBucket(new Date(2026, 9, 20, 1).toISOString(), local)).toBe("Today");
    expect(dayBucket(new Date(2026, 9, 19, 23).toISOString(), local)).toBe("Yesterday");
    expect(dayBucket(new Date(2026, 9, 16, 12).toISOString(), local)).toBe("This week");
    expect(dayBucket(new Date(2026, 9, 1, 12).toISOString(), local)).toBe("Earlier");
  });
});
