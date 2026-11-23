# Screenshots

Taken with `node scripts/shots.mjs` (headless Chrome via CDP, `file://` URLs).
Every shot was read back and checked: zero horizontal overflow at both widths
(`scrollWidth == clientWidth` in the script output).

| File | What it shows |
| --- | --- |
| `desktop-launcher.png` | Launcher at 1280px — headline, launch rail, prompt box, examples |
| `desktop-result.png` | Offline launch of "a meal-planning app for hostel students" at 1280px — rail all done, Mealwise result in the Split template |
| `desktop-published-mealwise.png` | Published page `#/p/mealwise` at 1280px — Poster template, waitlist form, "0 on the waitlist" (real count) |
| `desktop-library.png` | Library at 1280px — cached launches plus the offline demo launch |
| `mobile-launcher.png` | Launcher at 390px — rail stacks above the prompt box |
| `mobile-published-mealwise.png` | Published Mealwise page at 390px — single column, no overflow |

Notes from the review pass:
- The first screenshot run caught a real bug: the SVG logo drew initials text on top of the geometric mark, overlapping it. Fixed by making the logo a mark-only SVG (the name is the wordmark next to it).
- The same run caught awkward offline taglines ("meal planning hostel"); the generator now uses the first two keywords for the topic phrase.
- One early run captured a sibling project's Chrome tab (shared VM, same debug port). The script now uses its own debug port (9241) and picks only the target whose URL contains `one-prompt-startup-launcher`.
