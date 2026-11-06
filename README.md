# Jaric Wang — Portfolio

A personal portfolio built like an old CRT TV. Opening the link powers the set on
(static → "please stand by" loader → picture), the landing page is **CH 00**, and
**Select channel** opens the channel guide.

Plain HTML / CSS / JS: no build step and no dependencies.

## Run it locally

Any static server works. In VS Code the easiest is the **Live Server** extension
(right-click `index.html` → *Open with Live Server*). Or from a terminal:

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173.

## What's where

| File | What it is |
| --- | --- |
| `index.html` | CH 00, the landing page, plus the boot sequence |
| `menu.html` | Channel guide (the "Select channel" page) |
| `achievements.html`, `projects.html`, `experience.html`, `story.html` | CH 01–04, empty placeholders |
| `css/tv.css` | Shared TV shell: bezel, screen, scanlines, glare, OSD, colours and fonts |
| `css/boot.css` | Power-on / static / colour-bars intro |
| `css/landing.css` | Landing layout, the "portfolio" lockup, poppy-field background |
| `css/channel.css` | Menu + channel page styles |
| `js/tv.js` | Static noise, channel switching, OSD, number-key "remote" |
| `js/boot.js` | Boot sequence timing |
| `js/field.js` | The animated poppy field behind the landing page |

## Editing

- **Your details:** the small text in the corners of `index.html` (email, subtitle).
  Search for `TODO`.
- **Channels:** the lineup lives in `CHANNELS` at the top of `js/tv.js`. Add a page,
  add it there and to the list in `menu.html`.
- **Colours / fonts:** CSS variables at the top of `css/tv.css`.
- **Boot timing:** the `at(...)` calls at the bottom of `js/boot.js`.

## How the TV behaves

- The full boot plays on a fresh visit or reload. Changing channel inside the site
  only flashes a short burst of static.
- Click, tap or press any key to skip the intro.
- Keys `0`–`4` change channel, `m` opens the guide.
- With *reduce motion* turned on in the OS, the static and flicker are switched off.
