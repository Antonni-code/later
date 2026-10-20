# Later design system

Single source of truth for the popup's visual layer. Every colour, size, radius and duration in `popup/popup.css` comes from this file.

## Theses

**Visual.** A dark-first graphite popup with amber as the only accent: amber marks the one primary action (Save & close), the brand dot, the focus ring and nothing else. One system sans throughout, because the extension loads nothing remote. Dense rows, sharp 6px corners, flat surfaces separated by tone rather than shadows or boxed borders.

**Interaction.** Fast and dry: 120 to 220ms on `cubic-bezier(.2, .8, .2, 1)`. Rows tint on hover and their actions brighten; buttons press to `scale(.98)`; feedback and the confirm dialog fade in 4px. No bounce, glow, gradient, blur or looping animation. `prefers-reduced-motion` turns every transition and entry off.

**Allowed patterns:** hairline rules under the header and above the footer only, a keyboard-shortcut chip, the pine logo tile kept from the original brand.

## Colour

Dark only (`color-scheme: dark`). Contrast is computed against `--bg` unless stated.

| Token | Value | Use | Contrast |
| --- | --- | --- | --- |
| `--bg` | `#121314` | Popup ground | |
| `--surface-1` | `#1a1b1d` | Current-tab panel, dialog, feedback | |
| `--surface-2` | `#222326` | Row hover, text-button hover | |
| `--surface-3` | `#2b2c30` | Monograms, kbd chip, pressed | |
| `--line` | `#2a2b2f` | Header and footer rules | |
| `--line-strong` | `#3a3b40` | Secondary button border | |
| `--text` | `#ecebe6` | Titles, body | 15.6:1 |
| `--text-2` | `#a3a29b` | Hosts, secondary copy | 7.3:1 |
| `--text-3` | `#908f88` | Timestamps, hints, notes | 5.8:1, 4.9:1 on `--surface-2` |
| `--amber` | `#e3a54a` | Primary fill, brand dot, focus ring | 8.6:1 |
| `--amber-hover` | `#ecb563` | Primary hover | |
| `--amber-press` | `#d4963c` | Primary active | |
| `--on-amber` | `#1a1205` | Text on amber | 8.6:1 on `--amber` |
| `--amber-soft` | `#e3a54a1f` | Success feedback ground | |
| `--danger` | `#ef7a66` | Destructive text and fill | 6.8:1 |
| `--danger-soft` | `#ef7a661f` | Error feedback ground, remove hover | |
| `--on-danger` | `#1d0b07` | Text on danger fill | 6.9:1 on `--danger` |
| `--brand-pine` | `#20372b` | Logo tile only (unchanged brand asset) | |
| `--scrim` | `#000000a3` | Dialog backdrop | |

## Type

System stack: `-apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, sans-serif`. No remote or bundled fonts.

| Token | Size / line | Weight | Use |
| --- | --- | --- | --- |
| `--fs-xs` | 11px / 16px | 400-500 | Meta, hints, notes, footer |
| `--fs-sm` | 12px / 18px | 400-600 | Buttons, secondary copy |
| `--fs-md` | 13px / 18px | 500-600 | Titles, section heading |
| `--fs-lg` | 15px / 20px | 600 | Wordmark, empty and dialog headings |

Counts and times use `font-variant-numeric: tabular-nums`. Letter-spacing `-0.01em` on 13px and up.

## Space, radius, elevation

- Spacing on a 4px grid: `--s1` 4, `--s2` 8, `--s3` 12, `--s4` 16, `--s5` 20, `--s6` 24.
- Radius: `--r` 6px for buttons, panels, rows and the dialog; `--r-sm` 4px for monograms and chips.
- Elevation: none. Panels separate by tone. The dialog sits on a dark backdrop with a `--line-strong` border.

## Motion

| Token | Value | Use |
| --- | --- | --- |
| `--dur-fast` | 120ms | Hover tints, colour changes |
| `--dur` | 180ms | Press scale, action reveal |
| `--dur-slow` | 220ms | Feedback and dialog entry |
| `--ease` | `cubic-bezier(.2, .8, .2, 1)` | Everything |

Only `opacity`, `transform`, `color` and `background-color` animate.

## Components

- **Primary button**: amber fill, `--on-amber` text, 40px tall, `--r`. Hover `--amber-hover`, active `--amber-press` + `scale(.98)`, focus 2px `--amber` outline offset 2px, disabled 40% opacity.
- **Text button**: transparent, `--text-2`, 28px tall. Hover `--surface-2` + `--text`. Destructive variant hovers to `--danger-soft` + `--danger`.
- **Secondary button**: `--surface-2`, `--line-strong` border, `--text`.
- **Row**: 48px minimum, no borders, `--r` hover tint. Actions sit at 55% opacity and reach 100% on row hover or focus-within.
- **Monogram**: 24px (row) or 32px (current tab), `--surface-3`, `--r-sm`, `--text-2` initial.
