# Later design system

Single source of truth for the popup's visual layer. Every colour, size, radius and duration in `popup/popup.css` comes from this file.

## Theses

**Visual.** A quiet, monochrome utility on one white surface. No cards, panels or colour coding: structure comes from type weight, spacing and two hairlines (under the current tab, above the shelf actions). One near-black for text and the single primary action, one grey for everything secondary, red only for destructive actions, and the pine logo as the only brand colour. One system font (SF on Apple devices, Segoe UI on Windows) at three sizes. Native menus for filtering and sorting, because they are accessible, keyboard-ready and cost nothing to ship. Light only.

**Interaction.** Immediate and understated: 140ms colour and opacity changes, a 1.5% press on the primary button, row actions that appear on hover or focus, and a 4px fade-in for feedback and the dialog. Search filters as you type, `/` focuses it and Escape clears it. No sliding, bouncing, glowing or looping. `prefers-reduced-motion` turns all of it off.

**Allowed patterns:** two hairline rules; a keyboard-shortcut hint inside the Save button and a `/` hint inside search; a soft yellow `<mark>` on search matches; sticky site headers when sorted by site; the pine logo tile kept from the original brand.

## Tokens

Light only (`color-scheme: light`). Contrast on white unless stated.

| Token | Value | Use | Contrast |
| --- | --- | --- | --- |
| `--bg` | `#ffffff` | Surface, text on the primary button | 18.9:1 on `--text` |
| `--subtle` | `#f4f4f5` | Search field, monograms, secondary button, feedback | |
| `--hover` | `#f7f7f8` | Row hover, loading rows | |
| `--line` | `#ebebed` | Hairlines, `/` hint border, dialog border | |
| `--text` | `#111111` | Text, primary button, focus ring | 18.9:1 |
| `--muted` | `#6b6b6b` | Secondary text, menus, text buttons | 5.3:1, 4.9:1 on `--subtle` |
| `--danger` | `#c8261b` | Destructive text and button | 5.9:1 |
| `--danger-subtle` | `#fdf1f0` | Remove hover, error feedback | |
| `--mark` | `#fdeaa0` | Search-match highlight | `--text` on it 15.7:1 |
| `--brand-pine` | `#20372b` | Logo tile only | |
| `--scrim` | `#11111133` | Dialog backdrop | |
| `--shadow-dialog` | `0 1px 2px #1111110d, 0 12px 32px #1111111f` | Dialog only | |

Type: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif` at `--fs-sm` 12px, `--fs-md` 13px (base, 18px line), `--fs-lg` 15px; weights 400, 500 for row titles, 600 for headings and buttons. Counts and times use tabular figures.

Space on a 4px grid with a 16px page margin. Radius `--r` 8px (buttons, fields, rows), `--r-sm` 6px (monograms, menus, remove button), 12px for the dialog. Motion: `--dur` 140ms on `--ease` `cubic-bezier(.2, 0, 0, 1)`; only opacity, transform and colours animate.

## Components

- **Primary button**: `--text` fill, white 600 text, 36px, `--r`; hover opacity .86, active `scale(.985)`, shortcut hint at 55% opacity.
- **Text button**: `--muted`, hover `--text`; Clear all hovers to `--danger`.
- **Search**: 32px `--subtle` field; on focus it turns white with a 1px `--text` inset ring.
- **Menus**: native `<select>` sized to its value (`field-sizing: content`), `--muted`, hover `--subtle`.
- **Row**: 44px, no borders, `--hover` on hover or focus; open and remove actions fade in.
- **Dialog**: 300px, left-aligned title and message, Cancel (`--subtle`) and the action (`--text`, or `--danger` when destructive) on the right.
- **Layout budget**: Chrome caps popups at 600px; the list scrolls at 240px.
