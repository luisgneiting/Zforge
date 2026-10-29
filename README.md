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

### 1. Fixes from the original Forge

Fixes made in [forge-ext/forge](https://github.com/forge-ext/forge) that were not in
jcrussell's fork yet, brought into Zforge:

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
- [#588](https://github.com/forge-ext/forge/issues/588): new windows are left alone until their first frame (GNOME 51).
- Grammar fixes in the Brazilian Portuguese translation, by Pedro Lucas.

### 2. Improvements of jcrussell's fork

[jcrussell/forge](https://github.com/jcrussell/forge) rewrote much of Forge and added:

- **New features:**
  - the shortcut cheatsheet;
  - portable config sync;
  - arrow-key navigation;
  - a floating window rules editor in Preferences;
  - screen edge margins;
  - shortcuts to reload the config, distribute windows evenly and toggle workspace monocle;
  - border radius, tab margins, default layout and wider gap limits;
  - monitors left out of tiling.
- **Bug fixes:**
  - window resize and focus navigation;
  - app-specific problems with Chrome, Brave, Steam, Blender, ddterm and others;
  - stacked and tabbed containers;
  - preview hints and border drawing;
  - moving windows across workspaces;
  - saving preferences and themes.
- **Code quality:**
  - a unit test suite of more than 1,750 tests, plus a Dockerized end-to-end suite;
  - the code split into focused managers (see the [architecture docs](docs/dev/architecture.md));
  - riskier options kept behind experimental toggles.

### 3. Fixes found and made in Zforge

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

**Issues of the original Forge**

- [#196](https://github.com/forge-ext/forge/issues/196): a keyboard resize started with `Alt+F8` no longer snaps back.
- [#213](https://github.com/forge-ext/forge/issues/213): moving a window down past the monitor's edge puts it below the others, as in i3, instead of to the right.
- [#218](https://github.com/forge-ext/forge/issues/218): a split left with one window gives way to it. Closing a floating window keeps the split it was in.
- [#409](https://github.com/forge-ext/forge/issues/409): with auto split on, the next window opens the way you chose with Split, and a dialog opening first does not use the choice up.
- [#462](https://github.com/forge-ext/forge/issues/462): other windows are unmaximized when a new window tiles next to them.
- [#514](https://github.com/forge-ext/forge/issues/514): popups that keep themselves off the taskbar (WPS menus, Zotero notifications) float.

**Mouse and keyboard**

- Dragging a window to tile works with Num Lock or Caps Lock on. With a tile modifier set, Num Lock (which GNOME keeps on across sessions) used to make drag tiling impossible.
- The drop preview is shown by default while dragging, so a drag always shows where the window will go.
- A tiled window can be maximized next to other windows. It floats while maximized and goes back to its place when restored.
- The gap size shortcuts work with or without Shift, and on the keypad.

**Reporting problems**

- An optional log of the last 100 shortcuts, drags, and window opens and closes. Each entry records what came of it: "ok", "no change" with the likely reason, or "BUG? layout" with the tree whenever tiled windows overlap or leave the screen.
- **Preferences → Tiling → Diagnostics** shows the whole report before anything leaves the computer. From there you can copy it or open it as an issue on this repository.
- The log is off by default, and a dialog asks once whether to turn it on.

**Testing**

- A nested-shell test suite (`tests/nested`) runs real windows in a nested GNOME Shell. It covers keyboard and mouse user actions, a fuzzer that also drags, maximizes, minimizes and changes workspaces, and scenarios adapted from [forge-repro](https://github.com/Reliable-Collaboration/forge-repro).

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
