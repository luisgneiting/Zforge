import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NODE_TYPES } from "../../lib/extension/tree.js";
import {
  createMockWindow,
  createWindowManagerFixture,
  getWorkspaceAndMonitor,
} from "../mocks/helpers/index.js";

/**
 * forge-ext/forge#486: with "move the pointer with the focus" on and several
 * monitors, a workspace switch could leave the focus (and so the pointer) on a
 * window of another monitor, whose workspace didn't change. After the switch,
 * the focus goes back to the topmost tiled window on the pointer's monitor.
 */
describe("forge-ext/forge#486: focus stays on the pointer's monitor after a workspace switch", () => {
  let ctx;
  let onMonitor0;
  let onMonitor1;

  beforeEach(() => {
    ctx = createWindowManagerFixture();
    const ws = ctx.workspaces[0];
    const { monitor } = getWorkspaceAndMonitor(ctx);
    onMonitor0 = [
      createMockWindow({ workspace: ws, monitor: 0 }),
      createMockWindow({ workspace: ws, monitor: 0 }),
    ];
    onMonitor1 = createMockWindow({ workspace: ws, monitor: 1 });
    for (const w of [...onMonitor0, onMonitor1]) {
      ctx.tree.createNode(monitor.nodeValue, NODE_TYPES.WINDOW, w);
    }
    vi.spyOn(ctx.windowManager, "movePointerWith").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ctx.cleanup();
  });

  it("focuses the topmost window on the pointer's monitor when focus landed elsewhere", () => {
    ctx.display.get_focus_window.mockReturnValue(onMonitor1);
    const focus = vi.spyOn(onMonitor0[1], "focus");

    ctx.windowManager._refocusPointerMonitor(0);

    expect(focus).toHaveBeenCalled();
    const target = ctx.windowManager.movePointerWith.mock.calls[0][0];
    expect(target.nodeValue).toBe(onMonitor0[1]); // the stacking mock keeps order: last is top
    expect(ctx.windowManager.movePointerWith.mock.calls[0][1]).toEqual({ force: true });
  });

  it("leaves the focus alone when it is already on the pointer's monitor", () => {
    ctx.display.get_focus_window.mockReturnValue(onMonitor0[0]);
    ctx.windowManager._refocusPointerMonitor(0);
    expect(ctx.windowManager.movePointerWith).not.toHaveBeenCalled();
  });

  it("does nothing when the pointer's monitor has no tiled window", () => {
    ctx.display.get_focus_window.mockReturnValue(onMonitor0[0]);
    ctx.windowManager._refocusPointerMonitor(2);
    expect(ctx.windowManager.movePointerWith).not.toHaveBeenCalled();
  });
});
