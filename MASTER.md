# Later design system

Single source of truth for the popup's visual layer. Every colour, size, radius and duration in `popup/popup.css` comes from this file.

## Theses

**Visual.** A light, neutral-white popup (white, not paper) with the logo's pine green as the one primary colour: the Save & close button, confirm actions and the focus ring. Amber appears only as the brand dot and the search-match highlight. One system sans throughout, because the extension loads nothing remote. Dense rows, 6px corners, surfaces separated by tone and single hairlines; the only shadow belongs to the confirm dialog.

**Interaction.** Fast and dry: 120 to 220ms on `cubic-bezier(.2, .8, .2, 1)`. Rows tint on hover and their actions brighten; buttons press to `scale(.98)`; feedback and the confirm dialog fade in 4px. Search filters as you type, `/` focuses it and Escape clears it. No bounce, glow, gradient, blur or looping animation. `prefers-reduced-motion` turns every transition and entry off.

**Allowed patterns:** hairline rules under the header, around the current-tab panel and above the footer; a keyboard-shortcut chip; amber `<mark>` on search matches; sticky site headers when sorted by site; the pine logo tile kept from the original brand.

## Colour

Light only (`color-scheme: light`). Contrast is computed against `--bg` unless stated.

| Token | Value | Use | Contrast |
| --- | --- | --- | --- |
| `--bg` | `#ffffff` | Popup ground, dialog | |
| `--surface-1` | `#f6f6f4` | Current-tab panel, search field, segmented track | |
| `--surface-2` | `#efefec` | Row hover, text-button hover | |
| `--surface-3` | `#e6e6e2` | Monograms, pressed | |
| `--line` | `#ececea` | Hairlines, chip and panel borders | |
| `--line-strong` | `#d4d4cf` | Secondary button border, field focus border | |
| `--text` | `#18191a` | Titles, body | 17.6:1 |
| `--text-2` | `#55575b` | Hosts, secondary copy | 7.2:1 |
| `--text-3` | `#6b6d71` | Timestamps, hints, notes | 5.2:1, 4.5:1 on `--surface-2` |
| `--primary` | `#20372b` | Primary fill, focus ring | 12.8:1 |
| `--primary-hover` | `#2c4a3a` | Primary hover | |
| `--primary-press` | `#182a21` | Primary active | |
| `--on-primary` | `#ffffff` | Text on primary | 12.8:1 on `--primary` |
| `--primary-soft` | `#20372b0f` | Success feedback ground | |
| `--amber` | `#c9842b` | Brand dot only | |
| `--mark` | `#f8e3bd` | Search-match highlight ground | `--text` on it 14.0:1 |
| `--danger` | `#b42318` | Destructive text and fill | 6.6:1 |
| `--danger-hover` | `#9a1d13` | Destructive fill hover | |
| `--danger-soft` | `#fdeceb` | Error feedback ground, remove hover | `--danger` on it 5.8:1 |
| `--on-danger` | `#ffffff` | Text on danger fill | |
| `--brand-pine` | `#20372b` | Logo tile (unchanged brand asset) | |
| `--scrim` | `#18191a52` | Dialog backdrop | |
| `--shadow-pop` | `0 1px 2px #18191a0f, 0 8px 24px #18191a14` | Dialog only | |

## Type

System stack: `-apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, sans-serif`. No remote or bundled fonts.

| Token | Size / line | Weight | Use |
| --- | --- | --- | --- |
| `--fs-xs` | 11px / 16px | 400-500 | Meta, hints, notes, footer, segments |
| `--fs-sm` | 12px / 18px | 400-600 | Buttons, search, secondary copy |
| `--fs-md` | 13px / 18px | 500-600 | Titles, section heading |
| `--fs-lg` | 15px / 20px | 600 | Wordmark, empty and dialog headings |

Counts and times use `font-variant-numeric: tabular-nums`. Letter-spacing `-0.01em` on 13px and up.

## Space, radius, elevation

- Spacing on a 4px grid: `--s1` 4, `--s2` 8, `--s3` 12, `--s4` 16, `--s5` 20, `--s6` 24.
- Radius: `--r` 6px for buttons, panels, rows, fields and the dialog; `--r-sm` 4px for monograms, chips and segments.
- Elevation: none, except `--shadow-pop` on the dialog.

## Motion

| Token | Value | Use |
| --- | --- | --- |
| `--dur-fast` | 120ms | Hover tints, colour changes |
| `--dur` | 180ms | Press scale, action reveal |
| `--dur-slow` | 220ms | Feedback and dialog entry |
| `--ease` | `cubic-bezier(.2, .8, .2, 1)` | Everything |

Only `opacity`, `transform`, `color`, `border-color` and `background-color` animate.

## Components

- **Primary button**: pine fill, white text, 40px tall, `--r`. Hover `--primary-hover`, active `--primary-press` + `scale(.98)`, focus 2px `--primary` outline offset 2px, disabled 40% opacity.
- **Text button**: transparent, `--text-2`, 28px tall. Hover `--surface-2` + `--text`. Destructive variant hovers to `--danger-soft` + `--danger`.
- **Secondary button**: `--bg`, `--line-strong` border, `--text`.
- **Search field**: 32px, `--surface-1`, transparent border that turns `--line-strong` on focus-within; `/` chip at the end.
- **Segmented control**: `--surface-1` track, `--bg` active segment with `--text`, inactive `--text-2`; `aria-pressed` drives the state.
- **Sort select**: native `<select>`, `--text-2`, transparent ground, hover `--surface-2`.
- **Row**: 48px minimum, no borders, `--r` hover tint. Actions sit at 55% opacity and reach 100% on row hover or focus-within. Search matches wrap in `<mark>`.
- **Site header** (site sort only): sticky, `--bg`, `--fs-xs` `--text-3` host plus count.
- **Monogram**: 24px (row) or 32px (current tab), `--r-sm`, `--text-2` initial.
