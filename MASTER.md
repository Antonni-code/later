# Later design system

Single source of truth for the popup's visual layer. Every colour, size, radius and duration in `popup/popup.css` comes from this file.

## Theses

**Visual.** Later should feel like a first-party macOS utility. A soft grey canvas (`#f5f5f7`) holds white, 12px-rounded grouped panels with no borders; rows inside a panel are divided by hairline separators inset to the text, as in macOS and iOS grouped lists. One system font (SF Pro on Apple devices, Segoe UI on Windows), set with Apple's label hierarchy: near-black labels, one grey secondary, one link blue for interactive text. The single primary action, Save & close, is a near-black pill. Saved sites get rounded-square monograms in six soft tints so a long shelf can be scanned by colour. Light only.

**Interaction.** Calm and physical: hovers and colour changes in 150ms, the segmented control's white thumb slides between options in 280ms on the iOS curve `cubic-bezier(.32, .72, 0, 1)`, buttons press to `scale(.97)`, feedback and the alert rise 6px into place. Search filters as you type, `/` focuses it and Escape clears it. No bounce, glow, gradient or looping animation. `prefers-reduced-motion` turns every transition and entry off.

**Allowed patterns:** white grouped panels on a grey canvas; inset hairline separators between rows; a sliding segmented-control thumb with Apple's two-layer shadow; tinted monograms keyed to the site name; a keyboard-shortcut chip inside the Save pill; an Apple-style alert with split buttons; a soft yellow `<mark>` on search matches; the pine logo tile kept from the original brand.

## Colour

Light only (`color-scheme: light`). Contrast is computed on white unless stated.

| Token | Value | Use | Contrast |
| --- | --- | --- | --- |
| `--canvas` | `#f5f5f7` | Popup ground | |
| `--panel` | `#ffffff` | Grouped panels, alert | |
| `--fill` | `#7676801f` | Search field, segmented track, icon buttons | |
| `--fill-strong` | `#76768033` | Pressed fills | |
| `--hover` | `#00000008` | Row hover | |
| `--separator` | `#3c3c4329` | Hairlines | |
| `--label` | `#1d1d1f` | Titles, body | 16.8:1 |
| `--secondary` | `#66666b` | Hosts, times, notes, placeholders | 5.7:1, 4.8:1 on `--fill` |
| `--tint` | `#0066cc` | Text buttons, search caret | 5.6:1 |
| `--focus` | `#0066cc73` | 3px focus ring (Apple's translucent blue halo) | |
| `--primary` | `#1d1d1f` | Save pill | |
| `--primary-hover` | `#333336` | Save pill hover | |
| `--on-primary` | `#ffffff` | Text on the pill | 16.8:1 |
| `--on-primary-soft` | `#ffffff29` | Shortcut chip in the pill | |
| `--danger` | `#d70015` | Destructive text | 5.4:1 |
| `--danger-fill` | `#d700151a` | Remove-button hover, error banner | |
| `--mark` | `#fde68a` | Search-match highlight | label 13.5:1 |
| `--brand-pine` | `#20372b` | Logo tile only | |
| `--scrim` | `#0000002e` | Alert backdrop | |
| `--shadow-thumb` | `0 3px 8px #0000001f, 0 3px 1px #0000000a` | Segmented thumb | |
| `--shadow-alert` | `0 16px 48px #0000002e, 0 0 0 .5px #0000001a` | Alert | |
| `--shadow-panel` | `0 .5px 1px #0000000f` | Panels, a barely-there lift | |

Monogram tints (background / glyph, contrast): blue `#e5efff`/`#0a58ca` 5.6:1, green `#e3f6e8`/`#18753a` 5.0:1, orange `#fff0e0`/`#a34a07` 5.3:1, purple `#f1eafe`/`#6d28d9` 6.1:1, pink `#fde8f1`/`#be185d` 5.2:1, teal `#e0f5f5`/`#0f766e` 4.8:1. The tint is chosen from the site name, so a site always keeps its colour.

## Type

`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif`. No remote or bundled fonts.

| Token | Size / line | Weight | Use |
| --- | --- | --- | --- |
| `--fs-caption` | 11px / 14px | 400-500 | Hints, notes, chips |
| `--fs-footnote` | 12px / 16px | 400-600 | Hosts, times, segments, group headers |
| `--fs-body` | 13px / 18px | 400-600 | Titles, buttons, search |
| `--fs-headline` | 15px / 20px | 600 | Section titles, alert title, empty states |
| `--fs-title` | 17px / 22px | 600 | Wordmark |

Letter-spacing follows SF's optical tracking: `-0.01em` at 13px, `-0.02em` at 15px and up. Counts and times use tabular figures.

## Space, radius, elevation

- Spacing on a 4px grid: 4, 8, 12, 16, 20, 24.
- Radius: `--r-panel` 12px, `--r-control` 9px (search, segmented track), `--r-thumb` 7px, `--r-icon` 7px (24px monogram) and 9px (32px), `--r-pill` 999px.
- Elevation: `--shadow-panel` on panels, `--shadow-thumb` on the segmented thumb, `--shadow-alert` on the alert. Nothing else casts a shadow.

## Motion

| Token | Value | Use |
| --- | --- | --- |
| `--dur-fast` | 150ms | Hover, colour, opacity |
| `--dur` | 280ms | Segmented thumb, alert and feedback entry |
| `--ease` | `cubic-bezier(.32, .72, 0, 1)` | Everything |

Only `opacity`, `transform`, `color` and `background-color` animate.

## Components

- **Save pill**: `--primary`, white `--fs-body` semibold, 36px tall, `--r-pill`; hover `--primary-hover`, active `scale(.97)`, focus 3px `--tint` ring; shortcut chip on the right.
- **Text button**: `--tint`, no fill; hover opacity .7; destructive variant `--danger`.
- **Search field**: 30px, `--fill`, `--r-control`, magnifier in `--secondary`, `/` chip until focused.
- **Segmented control**: four equal segments on a `--fill` track; a white thumb with `--shadow-thumb` slides to the active segment (`data-active` on the track); labels `--fs-footnote`, active semibold.
- **Sort**: native `<select>` in `--tint`, right-aligned, chevron icon.
- **Grouped list**: white panel, rows 48px, hairline separators inset 48px from the left; hover `--hover`; actions are 26px round `--fill` buttons that fade in on hover or focus.
- **Group header** (site sort): sticky, `--panel`, `--fs-footnote` semibold `--secondary`, count on the right.
- **Alert**: 270px, 14px radius, centred title and message, two split buttons under a hairline: Cancel in `--tint`, the action in `--tint` semibold (or `--danger` when destructive).
- **Layout budget**: Chrome caps popups at 600px; the list scrolls inside its panel at 240px (five rows).
