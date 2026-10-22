# Later design system

Single source of truth for the popup's visual layer. Every colour, size, radius and duration in `popup/popup.css` comes from this file.

## Theses

**Visual.** A light utility on a soft grey-green canvas. The tab that is open now sits in one deep green hero card with a white Save button, the strongest element on screen. Saved pages are soft white cards with coloured site tiles and a time pill, grouped by day (or by site), so a long shelf scans by colour and date. Filters show their counts. One system font (SF on Apple devices, Segoe UI on Windows). Light only, no libraries.

**Interaction.** Quick and quiet: 140ms colour, shadow and opacity changes; cards lift a little on hover; buttons press to 98.5%; feedback and the dialog rise 6px. Search filters as you type (`/` focuses it, Escape clears it). Arrow keys move through saved pages, Enter reopens, Delete or Backspace removes. No bouncing, glowing or looping. `prefers-reduced-motion` turns all of it off.

**Allowed patterns:** the deep green hero card; white cards with soft shadows; six site tints keyed to the site name; counts inside filter chips; uppercase day and site headers; time pills; keyboard hints in the bottom bar; a soft yellow `<mark>` on search matches; the pine logo tile kept from the original brand.

## Tokens

All values live in the `:root` block of `popup/popup.css`. Key pairs (contrast): text `#111412` on white 18.4:1; muted `#626864` on white 5.7:1 and on the canvas `#f4f6f5` 5.3:1; white on hero `#1f4a37` 10.0:1; soft hero text `#b9d8c6` on it 6.6:1; white on accent `#2d6a4f` 6.4:1; danger `#c8261b` on white 5.9:1. Site tints are pale backgrounds with dark glyphs, each at 4.5:1 or more.

Radius 10px (cards, buttons, search), 7px (tiles, small buttons), 14px (hero, dialog), pills for chips and time. Motion 140ms (220ms for entries) on `cubic-bezier(.2, 0, 0, 1)`.

## Components

- **Hero card**: deep green, "NOW OPEN" label, white-ringed site tile, 15px title, white Save button with the shortcut chip, one-line hint.
- **Search**: 38px white field with a hairline ring that becomes a 2px green ring on focus; `/` chip until focused.
- **Filter chips**: All, Today, 7 days, Older, each with its live count; the active chip is solid green with white text.
- **Sort menu**: native `<select>` beside the Shelf heading.
- **Saved page card**: 50px white card, site tile, title over site, time pill on the right; hover lifts it and swaps the pill for a remove button; keyboard focus draws a green ring.
- **Group headers**: uppercase day (Today, Yesterday, This week, Earlier) or site name with a count, sticky while scrolling. Title sort stays flat.
- **Bottom bar**: ↑↓ and ↵ hints, Clear all, and a tinted green Open all that turns solid on hover.
- **Dialog**: 300px, left-aligned, Cancel and the action (green, or red when destructive).
- **Layout budget**: Chrome caps popups at 600px; the list scrolls at 196px.
