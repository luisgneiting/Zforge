#!/usr/bin/env python3
"""A window that opens on a workspace that isn't shown is tiled when that workspace is.

At login GNOME 51 puts each restored window back on its workspace, so most of them open on a
workspace that isn't shown. Forge leaves a new window alone until its first frame (GNOME 51 aborts
on a window resized before it is ready), but a window on a hidden workspace never gets that
signal: it kept the size the app asked for, a small window in a corner, while its focus border
covered the whole workspace.

  30.1  a window opened on an empty hidden workspace fills it once the workspace is shown
  30.2  the same with a second window, next to one already there

Run on a fresh sandbox:  sandbox/launch.sh && scenarios/30_hidden_workspace_window.py
"""
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
import harness as h  # noqa: E402

TOL = 4


def show(index):
    h.js(f"global.workspace_manager.get_workspace_by_index({index}).activate(global.get_current_time())")
    time.sleep(0.5)


def open_on(index, title):
    """Open the test app while another workspace is shown, and put its window on workspace `index`
    as soon as it exists, as GNOME does with a restored window."""
    h.js(f"""(() => {{ const id = global.display.connect("window-created", (_d, w) => {{
        global.display.disconnect(id); w.change_workspace_by_index({index}, false); }});
        return "ok"; }})()""")
    argv = [os.path.join(h.ROOT, "sandbox", "run-in-sandbox.sh"), sys.executable,
            os.path.join(h.LIB, "slowapp.py"), "--delay-ms", "0", "--title", title]
    subprocess.Popen(argv, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    for _ in range(80):
        time.sleep(0.25)
        if h.js(f"""global.display.list_all_windows().some(w => w.get_title() === "{title}")"""):
            time.sleep(1.0)
            return
    raise RuntimeError(f"{title} did not open")


def frame(title):
    return h.js(f"""(() => {{ const w = global.display.list_all_windows().find(w => w.get_title() === "{title}");
        const f = w.get_frame_rect(); return [f.x, f.y, f.width, f.height]; }})()""")


def check(name, what, titles):
    """The windows `titles` share the work area of the shown workspace side by side."""
    x, _y, width, _h = h.work_area()
    frames = [frame(t) for t in titles]
    covered = sum(f[2] for f in frames) + h.gap() * (len(frames) + 1)
    ok = abs(covered - width) <= TOL * len(frames) and min(f[0] for f in frames) <= x + h.gap() + TOL
    print(f"  {'PASS' if ok else 'FAIL'}  {name} {what}: frames {frames} (work area {h.work_area()})")
    return ok


def main():
    if h.windows():
        raise SystemExit("sandbox must be fresh (no windows); run sandbox/launch.sh first")
    r = []
    show(0)
    open_on(2, "Hidden A")
    show(2)
    time.sleep(1.5)
    r.append(check("30.1", "a window opened on an empty hidden workspace, then shown", ["Hidden A"]))

    show(0)
    open_on(2, "Hidden B")
    show(2)
    time.sleep(1.5)
    r.append(check("30.2", "a second window opened there while hidden, then shown", ["Hidden A", "Hidden B"]))

    h.close_windows()
    show(0)
    return h.summary(r)


if __name__ == "__main__":
    sys.exit(main())
