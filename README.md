# Zforge

Tiling window management for GNOME Shell, in the style of i3 and sway.

Zforge is a maintained fork of [Forge](https://github.com/forge-ext/forge), the
extension created by [@jmmaranan](https://github.com/jmmaranan). It builds on
[@jcrussell's fork](https://github.com/jcrussell/forge), which carried Forge
forward while the original project looks for a new maintainer, and adds the
fixes listed [below](#what-zforge-fixes). It is maintained by
[@luisgneiting](https://github.com/luisgneiting).

## Features

- Works on GNOME 45 to 50, on X11 and Wayland
- Tree-based tiling with vertical and horizontal split containers, like i3 and sway
- Vim-like and arrow-key shortcuts to focus, swap and move windows
- Drag and drop tiling, with a preview of where the window will land
- Floating windows, with rules per app managed in Preferences
- Stacked and tabbed layouts, and workspace monocle
- Auto split, or quarter tiling
- Smart gaps, screen edge margins, focus hint and a customizable color scheme
- Window resize with the keyboard
- Tiling per workspace, some multi-display support, and monitors left out of tiling
- A keyboard shortcut cheatsheet (`Super+Shift+/`)
- Settings and shortcuts exported to files, for backup or another computer
- An optional log of the last 100 actions, to report a problem with what led up to it

## Installation

### From extensions.gnome.org

_Zforge is waiting for review on extensions.gnome.org._ Once it is listed, install it
from the [GNOME Extensions](https://extensions.gnome.org) website or the
**Extension Manager** app by searching for "Zforge".

### From source

```bash
git clone https://github.com/luisgneiting/Zforge.git
cd Zforge
npm install   # Node.js 20+ and gettext are needed
make dev      # builds and installs to ~/.local/share/gnome-shell/extensions/
```

Log out and back in (on X11, `Alt+F2` then `r` is enough), then turn Zforge on in
the **Extensions** app or with:

```bash
gnome-extensions enable zforge@luisgneiting.github.io
```

To update later: `git pull`, `make dev`, and log out and back in.

### Coming from Forge

Turn Forge off before turning Zforge on, since both tile the same windows:

```bash
gnome-extensions disable forge@jmmaranan.com
```

The first time Zforge runs, it takes over what you had set in Forge: every changed
setting and shortcut, your window rules and your stylesheet (`~/.config/forge` is
copied to `~/.config/zforge`). Leave Forge installed until then, because its
settings are read through its schema. Afterwards you can remove it.

## What Zforge fixes

Issue numbers refer to the [original Forge](https://github.com/forge-ext/forge/issues).
Zforge is built in three layers, and each one brought its own fixes.

### 1. Fixes from the original Forge

Fixes written for Forge itself (some still waiting as pull requests there), brought into Zforge:

- [#544](https://github.com/forge-ext/forge/issues/544): a window is moved and resized in one request, so apps no longer slide instead of resizing.
- [#117](https://github.com/forge-ext/forge/issues/117), [#546](https://github.com/forge-ext/forge/issues/546): window minimum sizes are read through `get_min_size`.
- [#548](https://github.com/forge-ext/forge/issues/548): tab bars of containers that are no longer tabbed are removed.
- [#549](https://github.com/forge-ext/forge/issues/549): a window leaves its container before it crosses to another monitor.
- [#563](https://github.com/forge-ext/forge/issues/563): tabbed and stacked groups go back to the split direction they had.
- [#524](https://github.com/forge-ext/forge/issues/524): only windows Mutter still manages are raised, focused or activated.
- [#483](https://github.com/forge-ext/forge/issues/483), [#454](https://github.com/forge-ext/forge/issues/454): focus on hover leaves shell dialogs and open menus alone.
- [#176](https://github.com/forge-ext/forge/issues/176): the focus border stays below the focused window's menus.
- [#338](https://github.com/forge-ext/forge/issues/338): key names are accepted in any case, and spaces are allowed in shortcut lists.
- [#565](https://github.com/forge-ext/forge/issues/565): windows are not drawn over each other while apps redraw (from [#570](https://github.com/forge-ext/forge/pull/570)).
- [#588](https://github.com/forge-ext/forge/pull/588): new windows are left alone until their first frame (GNOME 51).
- Grammar fixes in the Brazilian Portuguese translation, by Pedro Lucas.

### 2. Fixes from jcrussell's fork

[jcrussell/forge](https://github.com/jcrussell/forge), the base of Zforge, fixed:

- **Resizing:**
  - the resize pair is anchored where the grab started ([#305](https://github.com/forge-ext/forge/issues/305));
  - a held resize key keeps the grab open ([#532](https://github.com/forge-ext/forge/issues/532));
  - tabbed and stacked containers resize against their neighbour ([#497](https://github.com/forge-ext/forge/issues/497));
  - windows with large minimum sizes stay inside the work area ([#117](https://github.com/forge-ext/forge/issues/117)).
- **Focus and navigation:**
  - focus moves to the right window after one closes ([#258](https://github.com/forge-ext/forge/issues/258)), and minimized windows are skipped ([#40](https://github.com/forge-ext/forge/issues/40));
  - the focus border follows workspace changes ([#268](https://github.com/forge-ext/forge/issues/268)), matches the buffer scale on HiDPI Wayland ([#164](https://github.com/forge-ext/forge/issues/164)), and the split hint shows again ([#407](https://github.com/forge-ext/forge/issues/407));
  - focus falls back correctly on stacked monitors ([#379](https://github.com/forge-ext/forge/issues/379)), and returns to the right window of a stack ([#230](https://github.com/forge-ext/forge/issues/230));
  - GNOME's `Super+L` lock no longer blocks focus right ([#249](https://github.com/forge-ext/forge/issues/249)).
- **Floating windows:**
  - toggling float affects only that window ([#172](https://github.com/forge-ext/forge/issues/172), [#492](https://github.com/forge-ext/forge/issues/492)), and a window floated by its app class can be tiled again ([#387](https://github.com/forge-ext/forge/issues/387));
  - windows set "Always on Top" by the user float ([#469](https://github.com/forge-ext/forge/issues/469), [#426](https://github.com/forge-ext/forge/issues/426), [#319](https://github.com/forge-ext/forge/issues/319));
  - window rules match the app class exactly ([#472](https://github.com/forge-ext/forge/issues/472)), and apps whose class arrives late are tiled again ([#482](https://github.com/forge-ext/forge/issues/482));
  - Steam, Blender and picture-in-picture are handled by rules ([#260](https://github.com/forge-ext/forge/issues/260), [#271](https://github.com/forge-ext/forge/issues/271)), and ddterm no longer blinks ([#322](https://github.com/forge-ext/forge/issues/322)).
- **Layout:**
  - closing windows no longer upsets other workspaces ([#470](https://github.com/forge-ext/forge/issues/470));
  - an emptied monitor goes back to its own orientation ([#311](https://github.com/forge-ext/forge/issues/311));
  - a fullscreen window stays full size next to a tiled one ([#509](https://github.com/forge-ext/forge/issues/509));
  - a minimized maximized window no longer hides tab bars ([#303](https://github.com/forge-ext/forge/issues/303));
  - monitor changes are handled in one place ([#78](https://github.com/forge-ext/forge/issues/78)).
- **Drag and drop:**
  - the preview no longer gets stuck ([#175](https://github.com/forge-ext/forge/issues/175), [#433](https://github.com/forge-ext/forge/issues/433));
  - touch and stylus drags use the dragged window's position ([#151](https://github.com/forge-ext/forge/issues/151));
  - the window-open animation is kept ([#530](https://github.com/forge-ext/forge/issues/530)).
- **Settings and themes:**
  - empty or broken `windows.json` and stylesheets no longer break Forge ([#515](https://github.com/forge-ext/forge/issues/515), [#448](https://github.com/forge-ext/forge/issues/448));
  - colors are saved even with a read-only stylesheet ([#312](https://github.com/forge-ext/forge/issues/312)), and the theme backup no longer goes to `~/undefined.bak` ([#266](https://github.com/forge-ext/forge/issues/266));
  - shortcut changes are saved when applied ([#316](https://github.com/forge-ext/forge/issues/316)).

### 3. Fixes made in Zforge

Most of them come with a regression test.

**Placement and layout**

- Turning Zforge off and on, or turning tiling back on, puts the layout back as it was instead of tiling every window from scratch.
- On Wayland, windows no longer get stuck in the wrong place when an app draws a different size than the one asked for (its minimum size, or 1 px more as Chrome does).
- A window coming back to a workspace gets its own share instead of overlapping the windows already there.
- The shares of a split always add up to the whole, so windows neither leave gaps nor overlap. Minimum heights count the title bars of stacked and tabbed groups.
- Neighbours are laid out during a resize and kept above their minimum size.
- Resizing with the keyboard and no neighbour no longer grows the window by the gaps on each press.
- A maximized window is restored before a keyboard resize, instead of growing from its full-screen frame.
- Layout Toggle on a tabbed or stacked group makes it a split again.
- [#196](https://github.com/forge-ext/forge/issues/196): a keyboard resize started with `Alt+F8` no longer snaps back.
- [#213](https://github.com/forge-ext/forge/issues/213): moving a window down past the monitor's edge puts it below the others, as in i3, instead of to the right.
- [#409](https://github.com/forge-ext/forge/issues/409): with auto split on, the next window opens the way you chose with Split, and a dialog opening first does not use the choice up.
- [#462](https://github.com/forge-ext/forge/issues/462): other windows are unmaximized when a new window tiles next to them. Before, this ran before a Wayland window had a title.
- [#514](https://github.com/forge-ext/forge/issues/514): popups that keep themselves off the taskbar (WPS menus, Zotero notifications) float.
- Closing a floating window keeps the split it was in.

**Mouse and keyboard**

- Dragging a window to tile works with Num Lock or Caps Lock on. With a tile modifier set, Num Lock (which GNOME keeps on across sessions) used to make drag tiling impossible.
- A tiled window can be maximized next to other windows. It floats while maximized and goes back to its place when restored.
- The gap size shortcuts work with or without Shift, and on the keypad.

## Improvements users asked for

Requests opened as issues on the original Forge that Zforge now has.

**Added in jcrussell's fork:**

| Request | What Zforge has |
|---|---|
| [#321](https://github.com/forge-ext/forge/issues/321) | a shortcut cheatsheet (`Super+Shift+/`) |
| [#350](https://github.com/forge-ext/forge/issues/350), [#263](https://github.com/forge-ext/forge/issues/263) | settings and shortcuts kept in files, to back up or move to another computer |
| [#301](https://github.com/forge-ext/forge/issues/301), [#132](https://github.com/forge-ext/forge/issues/132) | a floating window rules editor in Preferences |
| [#272](https://github.com/forge-ext/forge/issues/272), [#45](https://github.com/forge-ext/forge/issues/45) | screen edge margins, so auto-hide panels and docks are not covered |
| [#295](https://github.com/forge-ext/forge/issues/295), [#419](https://github.com/forge-ext/forge/issues/419) | monitors left out of tiling |
| [#287](https://github.com/forge-ext/forge/issues/287) | workspace monocle: every window of a workspace in one tabbed group |
| [#398](https://github.com/forge-ext/forge/issues/398) | a default layout for new windows: tiled, tabbed or stacked |
| [#364](https://github.com/forge-ext/forge/issues/364) | tab bar at the top or bottom |
| [#158](https://github.com/forge-ext/forge/issues/158), [#365](https://github.com/forge-ext/forge/issues/365) | tab bar height and the space between tabs |
| [#361](https://github.com/forge-ext/forge/issues/361) | border radius, including square corners |
| [#262](https://github.com/forge-ext/forge/issues/262) | the focus border hidden when a window is alone |
| [#315](https://github.com/forge-ext/forge/issues/315) | a lone window maximized |
| [#382](https://github.com/forge-ext/forge/issues/382) | a shortcut to share the space evenly |
| [#348](https://github.com/forge-ext/forge/issues/348) | shortcuts to expand and shrink a window |
| [#334](https://github.com/forge-ext/forge/issues/334) | a golden ratio resize |
| [#414](https://github.com/forge-ext/forge/issues/414) | a shortcut to move the pointer to the focused window |
| [#458](https://github.com/forge-ext/forge/issues/458) | focus on hover only while tiling is on |
| [#396](https://github.com/forge-ext/forge/issues/396) | notifications are not focused on hover |
| [#297](https://github.com/forge-ext/forge/issues/297), [#286](https://github.com/forge-ext/forge/issues/286) | no focus hint while tiling is off, and the panel icon can be hidden |
| [#308](https://github.com/forge-ext/forge/issues/308) | a shortcut to reload the config |
| [#165](https://github.com/forge-ext/forge/issues/165) | buttons to clear every shortcut or restore the defaults |
| [#435](https://github.com/forge-ext/forge/issues/435) | a higher limit for the gap size |
| [#227](https://github.com/forge-ext/forge/issues/227) | a new window tiles next to the last focused window |
| [#261](https://github.com/forge-ext/forge/issues/261) | GNOME's edge tiling can be turned off |
| [#460](https://github.com/forge-ext/forge/issues/460) | windows set "Always on Top" stay below a fullscreen app |
| [#378](https://github.com/forge-ext/forge/issues/378) | wide windows with a large minimum size are fitted by sharing the space differently |
| [#462](https://github.com/forge-ext/forge/issues/462) | other windows are unmaximized when a new one tiles next to them |

**Added in Zforge:**

| Request | What Zforge has |
|---|---|
| [#218](https://github.com/forge-ext/forge/issues/218) | a split left with one window gives way to it, instead of nesting it for nothing |
| [#439](https://github.com/forge-ext/forge/issues/439) | the drop preview is shown by default while dragging, so a drag always shows where the window will go |
| (Zforge) | an optional log of the last 100 actions, with a **Report a problem** button (see below) |
| (Zforge) | the layout comes back as it was when Zforge or tiling is turned off and on again |

**Testing**

Zforge adds a nested-shell test suite (`tests/nested`), which runs real windows in a nested GNOME Shell. It covers keyboard and mouse user actions, a fuzzer that also drags, maximizes, minimizes and changes workspaces, and scenarios adapted from [forge-repro](https://github.com/Reliable-Collaboration/forge-repro).

## Reporting a problem

1. Turn on the diagnostic log in **Preferences → Tiling → Diagnostics**, or accept the dialog that asks the first time.
2. When something goes wrong, open the same page right away, so the log still has the actions that led to it.
3. Use **Report a problem** to open an [issue](https://github.com/luisgneiting/Zforge/issues) with the report. Add a sentence saying what you did and what you expected.

## Known limitations

- Dynamic workspaces are not supported.
- Vertical monitor setups are not supported.

## Documentation

Full docs live in [`docs/`](docs/):

- **User guide** ([`docs/user/`](docs/user/)):
  - [layouts and tiling](docs/user/layouts.md)
  - [keybindings](docs/user/keybindings.md)
  - [theming](docs/user/theming.md)
  - [window rules](docs/user/rules.md)
  - [portable config](docs/user/config.md)
  - [multi-monitor](docs/user/monitors.md)
  - [troubleshooting](docs/user/troubleshooting.md)
- **Developer reference** ([`docs/dev/`](docs/dev/)): architecture, the rendering pipeline and Mutter compatibility.
- Press **`Super+Shift+/`** in a session for the shortcut cheatsheet.

### File locations

- Window rules: `~/.config/zforge/config/windows.json` (see [window rules](docs/user/rules.md) and [portable config](docs/user/config.md))
- Stylesheet: `~/.config/zforge/stylesheet/forge/stylesheet.css` (see [theming](docs/user/theming.md))
- Diagnostic log: `~/.local/state/zforge/diagnostic.log`

### GNOME defaults

GNOME Shell already manages workspaces well, so Zforge leaves them alone. You may want to bind:

- switching and moving windows to other workspaces;
- switching to a numbered, previous or next workspace.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, build and test commands, and code
style. Run `make help` for the full list of targets.

## Credits

Thank you to:

- [@jmmaranan](https://github.com/jmmaranan) and all [contributors](https://github.com/forge-ext/forge/graphs/contributors) of the original Forge, who created this extension
- [@jcrussell](https://github.com/jcrussell) and the contributors of [jcrussell/forge](https://github.com/jcrussell/forge), which Zforge is built on
- Michael Stapelberg and the contributors of i3
- System76 and the contributors of pop-shell
- ReworkCSS and its contributors for css-parse and css-stringify

## License

GPL-3.0-or-later, like Forge. See [LICENSE](LICENSE).
