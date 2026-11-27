import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import GLib from "gi://GLib";
import { NODE_TYPES, LAYOUT_TYPES, Tree } from "../../lib/extension/tree.js";
import { WindowManager } from "../../lib/extension/window.js";
import {
  createTreeFixture,
  createWindowManagerFixture,
  getWorkspaceAndMonitor,
} from "../mocks/helpers/index.js";
import { createMockWindow } from "../mocks/helpers/mockWindow.js";
import { Rectangle } from "../mocks/gnome/Meta.js";
import { Bin } from "../mocks/gnome/St.js";

/**
 * Turning Forge off and on again rebuilt every layout as one flat split: the
 * tree is destroyed on disable and the windows were tracked again side by side.
 * snapshotFullLayout() (taken on disable) and restoreFullLayout() (on enable)
 * put back the containers, their layouts and each window's share.
 */
describe("the layout survives turning Forge off and on", () => {
  let ctx;

  beforeEach(() => {
    ctx = createTreeFixture();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  const makeWindow = (i) =>
    createMockWindow({
      id: 9100 + i,
      rect: new Rectangle({ x: 0, y: 0, width: 1920, height: 1080 }),
    });

  // HSPLIT[a 0.6, VSPLIT[b 0.5, TABBED[c, d] 0.5] 0.4]
  function buildLayout() {
    const { monitor } = getWorkspaceAndMonitor(ctx);
    monitor.layout = LAYOUT_TYPES.HSPLIT;
    const [a, b, c, d] = [0, 1, 2, 3].map(makeWindow);
    const aNode = ctx.tree.createNode(monitor.nodeValue, NODE_TYPES.WINDOW, a);
    const right = ctx.tree.createNode(monitor.nodeValue, NODE_TYPES.CON, new Bin());
    right.layout = LAYOUT_TYPES.VSPLIT;
    const bNode = ctx.tree.createNode(right.nodeValue, NODE_TYPES.WINDOW, b);
    const tabs = ctx.tree.createNode(right.nodeValue, NODE_TYPES.CON, new Bin());
    tabs.layout = LAYOUT_TYPES.TABBED;
    tabs.lastTabFocus = d;
    ctx.tree.createNode(tabs.nodeValue, NODE_TYPES.WINDOW, c);
    ctx.tree.createNode(tabs.nodeValue, NODE_TYPES.WINDOW, d);
    aNode.percent = 0.6;
    right.percent = 0.4;
    bNode.percent = 0.5;
    tabs.percent = 0.5;
    return { monitor, windows: [a, b, c, d] };
  }

  // What enable() builds before the restore: every window flat under the monitor
  function trackFlat(monitor, windows) {
    [...monitor.childNodes].forEach((child) => monitor.removeChild(child));
    return windows.map((w) => ctx.tree.createNode(monitor.nodeValue, NODE_TYPES.WINDOW, w));
  }

  const fmt = (n) =>
    n.nodeType === NODE_TYPES.WINDOW
      ? `${n.nodeValue.get_id()}@${n.percent}`
      : `${n.layout}@${n.percent ?? 0}[${n.childNodes.map(fmt).join(",")}]`;

  it("puts back the containers, layouts and shares", () => {
    const { monitor, windows } = buildLayout();
    const before = monitor.childNodes.map(fmt).join(",");
    const snapshot = ctx.tree.snapshotFullLayout();

    trackFlat(monitor, windows);
    ctx.tree.restoreFullLayout(snapshot);

    expect(monitor.layout).toBe(LAYOUT_TYPES.HSPLIT);
    expect(monitor.childNodes.map(fmt).join(",")).toBe(before);
    const tabs = ctx.tree.getNodeByLayout(LAYOUT_TYPES.TABBED)[0];
    expect(tabs.lastTabFocus).toBe(windows[3]);
  });

  it("adds a window that wasn't there before after the others, keeping their proportions", () => {
    const { monitor, windows } = buildLayout();
    const snapshot = ctx.tree.snapshotFullLayout();

    const newcomer = makeWindow(9);
    trackFlat(monitor, [...windows, newcomer]);
    ctx.tree.restoreFullLayout(snapshot);

    const kids = monitor.childNodes;
    expect(kids).toHaveLength(3);
    expect(kids[2].nodeValue).toBe(newcomer);
    expect(kids[0].percent / kids[1].percent).toBeCloseTo(0.6 / 0.4, 5);
    expect(kids.reduce((sum, n) => sum + n.percent, 0)).toBeCloseTo(1, 5);
  });

  it("collapses a container whose other windows are gone", () => {
    const { monitor, windows } = buildLayout();
    const snapshot = ctx.tree.snapshotFullLayout();

    // c and d were closed while Forge was off
    trackFlat(monitor, windows.slice(0, 2));
    ctx.tree.restoreFullLayout(snapshot);

    expect(monitor.childNodes.map(fmt).join(",")).toBe("9100@0.6,9101@0.4");
    expect(ctx.tree.getNodeByLayout(LAYOUT_TYPES.TABBED)).toHaveLength(0);
  });
});

/**
 * GNOME turns off the extensions after one it disables and back on, once for
 * each, so Forge was disabled again before its enable had rebuilt the tree
 * (several times in a row when the screen locked). That empty tree was saved
 * over the layout, and after unlocking every window was side by side.
 */
describe("the layout survives being turned off again before it was rebuilt", () => {
  let ctx;

  beforeEach(() => {
    ctx = createWindowManagerFixture();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ctx.cleanup();
  });

  it("keeps the layout saved by the disable before", () => {
    const saved = { mo0ws0: { layout: LAYOUT_TYPES.HSPLIT, children: [] } };
    const snapshot = vi.spyOn(Tree.prototype, "snapshotFullLayout");
    snapshot.mockReturnValueOnce(saved);
    const restore = vi.spyOn(Tree.prototype, "restoreFullLayout").mockImplementation(() => {});
    // The mock settings and display have no signals to bind
    vi.spyOn(WindowManager.prototype, "_bindSignals").mockImplementation(() => {});

    // Rebuilt, then turned off: the layout is saved
    const first = ctx.windowManager;
    first.enable();
    first.disable();

    // Turned on and off again before the tree was rebuilt
    const idle = vi.spyOn(GLib, "idle_add").mockReturnValue(1);
    const second = new WindowManager(ctx.extension);
    second.enable();
    second.disable();
    idle.mockRestore();

    // Turned on for good: the layout from the first disable is put back
    const third = new WindowManager(ctx.extension);
    third.enable();
    expect(restore).toHaveBeenLastCalledWith(saved);
    third.disable();
  });
});
