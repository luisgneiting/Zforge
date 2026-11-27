import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NODE_TYPES, LAYOUT_TYPES } from "../../lib/extension/tree.js";
import {
  createMockWindow,
  createWindowManagerFixture,
  getWorkspaceAndMonitor,
} from "../mocks/helpers/index.js";

/**
 * forge-d5mm: the metaWindow "focus" handler queued a "focus-update" callback
 * that called this.updateStackedFocus() and this.updateTabbedFocus() with NO
 * argument. Both early-return on a falsy node, so they were permanent no-ops on
 * the pointer/alt-tab/hover focus path — a STACKED container was never re-stacked
 * and a TABBED window never raised on plain focus (only Super+hjkl, which passes
 * the node, worked). Fix: resolve and pass the focused node.
 */
describe("forge-d5mm: focus handler re-stacks the focused window", () => {
  let ctx;

  beforeEach(() => {
    ctx = createWindowManagerFixture();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ctx.cleanup();
  });

  const wm = () => ctx.windowManager;

  // Capture the queued "focus-update" callback fired by the metaWindow "focus"
  // signal (GLib timeouts don't run in tests, so we invoke it directly).
  function fireFocusAndGetUpdate(metaWindow) {
    const captured = [];
    vi.spyOn(wm(), "queueEvent").mockImplementation((eventObj) => captured.push(eventObj));
    ctx.display.get_focus_window.mockReturnValue(metaWindow);
    metaWindow.emit("focus", metaWindow);
    const update = captured.find((e) => e.name === "focus-update");
    expect(update).toBeDefined();
    return update.callback;
  }

  it("passes the focused node to updateStackedFocus/updateTabbedFocus (not undefined)", () => {
    const metaWindow = createMockWindow({ wm_class: "App", workspace: ctx.workspaces[0] });
    wm().trackWindow(null, metaWindow);
    const node = wm().tree.findNode(metaWindow);
    expect(node).toBeTruthy();

    const stackedSpy = vi.spyOn(wm(), "updateStackedFocus");
    const tabbedSpy = vi.spyOn(wm(), "updateTabbedFocus");

    fireFocusAndGetUpdate(metaWindow)();

    expect(stackedSpy).toHaveBeenCalledWith(node);
    expect(tabbedSpy).toHaveBeenCalledWith(node);
  });

  // forge-ext/forge#568: a stack with a title list keeps its order (its rows
  // show every window) and only raises the focused one; without title bars the
  // old cascade moves the focused window to the end
  it.each([
    [true, "keeps the stack's order and raises the focused window"],
    [false, "re-appends the focused window to the end of its STACKED container"],
  ])("title bars %s: %s", (showTabs) => {
    const winA = createMockWindow({ wm_class: "A", workspace: ctx.workspaces[0] });
    const winB = createMockWindow({ wm_class: "B", workspace: ctx.workspaces[0] });
    const winC = createMockWindow({ wm_class: "C", workspace: ctx.workspaces[0] });
    wm().trackWindow(null, winA);
    wm().trackWindow(null, winB);
    wm().trackWindow(null, winC);
    vi.spyOn(wm().tree, "hasTitleList").mockReturnValue(showTabs);

    const { monitor } = getWorkspaceAndMonitor(ctx, 0, 0);
    monitor.layout = LAYOUT_TYPES.STACKED;
    const nodeA = wm().tree.findNode(winA);
    expect(nodeA.parentNode).toBe(monitor);
    const before = [...monitor.childNodes];
    expect(monitor.lastChild).not.toBe(nodeA); // A starts above the stack
    const raise = vi.spyOn(winA, "raise");

    // Focus A (the bottom-most, index 0)
    fireFocusAndGetUpdate(winA)();

    if (showTabs) {
      expect(monitor.childNodes).toEqual(before);
    } else {
      expect(monitor.lastChild).toBe(nodeA);
    }
    expect(raise).toHaveBeenCalled();
  });
});
