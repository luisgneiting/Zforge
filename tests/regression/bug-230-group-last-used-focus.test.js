import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Node, NODE_TYPES, LAYOUT_TYPES } from "../../lib/extension/tree.js";
import { WINDOW_MODES, WindowManager } from "../../lib/extension/window.js";
import {
  createMockWindow,
  createTreeFixture,
  getWorkspaceAndMonitor,
} from "../mocks/helpers/index.js";
import { MotionDirection } from "../mocks/gnome/Meta.js";
import { Bin } from "../mocks/gnome/St.js";

/**
 * forge-ext/forge#230 (ported from forge-ext/forge#569): focus moving into a
 * tabbed or stacked group from outside it went to its first or last window,
 * not to the one last used there. Groups now remember their last-used tiled
 * window (WindowManager._rememberInGroups, on every focus change) and focus
 * coming in returns to it while it is still a visible tile in the group.
 */
describe("forge-ext/forge#230: focus returns to a group's last-used window", () => {
  let ctx;
  let monitorNode;
  let nodeA;

  beforeEach(() => {
    ctx = createTreeFixture({ fullExtWm: true });
    const { monitor } = getWorkspaceAndMonitor(ctx);
    monitorNode = monitor;
    monitorNode.layout = LAYOUT_TYPES.HSPLIT;
    monitorNode.rect = { x: 0, y: 0, width: 1920, height: 1080 };
    ctx.extWm.currentMonWsNode = monitorNode;
    nodeA = ctx.tree.createNode(monitorNode.nodeValue, NODE_TYPES.WINDOW, createMockWindow());
    nodeA.mode = WINDOW_MODES.TILE;
  });

  afterEach(() => ctx.cleanup());

  function windowNode() {
    const node = new Node(NODE_TYPES.WINDOW, createMockWindow());
    node.mode = WINDOW_MODES.TILE;
    return node;
  }

  function group(layout, children) {
    const container = new Node(NODE_TYPES.CON, new Bin());
    container.layout = layout;
    monitorNode.appendChild(container);
    children.forEach((child) => container.appendChild(child));
    return container;
  }

  it.each([LAYOUT_TYPES.STACKED, LAYOUT_TYPES.TABBED])(
    "%s: focus from outside goes to the last-used window",
    (layout) => {
      const [b, c, d] = [windowNode(), windowNode(), windowNode()];
      const con = group(layout, [b, c, d]);
      con.lastTabFocus = c.nodeValue;

      expect(ctx.tree._selectFocusWindow(con, false)).toBe(c);
      expect(ctx.tree.focus(nodeA, MotionDirection.RIGHT)).toBe(c);
    }
  );

  it("falls back when the last-used window was minimized or floated", () => {
    const [b, c, d] = [windowNode(), windowNode(), windowNode()];
    const con = group(LAYOUT_TYPES.STACKED, [b, c, d]);
    con.lastTabFocus = c.nodeValue;
    c.nodeValue.minimized = true;
    expect(ctx.tree._selectFocusWindow(con, false)).toBe(d);
    c.nodeValue.minimized = false;
    c.mode = WINDOW_MODES.FLOAT;
    expect(ctx.tree._selectFocusWindow(con, false)).toBe(d);
  });

  it("a split holding a tab group enters that group at its last-used window", () => {
    const [b, c] = [windowNode(), windowNode()];
    const tabs = new Node(NODE_TYPES.CON, new Bin());
    tabs.layout = LAYOUT_TYPES.TABBED;
    tabs.appendChild(b);
    tabs.appendChild(c);
    const split = group(LAYOUT_TYPES.VSPLIT, [tabs]);
    tabs.lastTabFocus = c.nodeValue;

    expect(ctx.tree._selectFocusWindow(split, false)).toBe(c);
  });

  it("a split's tab activates the window last used in the split", () => {
    const [b, c] = [windowNode(), windowNode()];
    const split = new Node(NODE_TYPES.CON, new Bin());
    split.layout = LAYOUT_TYPES.HSPLIT;
    split.appendChild(b);
    split.appendChild(c);
    expect(split.memberWindow()).toBe(b);
    split.lastTabFocus = c.nodeValue;
    expect(split.memberWindow()).toBe(c);
    c.nodeValue.minimized = true;
    expect(split.memberWindow()).toBe(b);
  });

  it("the focus handler remembers a tiled window in every group it is in", () => {
    const [b, c] = [windowNode(), windowNode()];
    const inner = new Node(NODE_TYPES.CON, new Bin());
    inner.layout = LAYOUT_TYPES.VSPLIT;
    inner.appendChild(b);
    inner.appendChild(c);
    const outer = group(LAYOUT_TYPES.TABBED, [inner]);
    const remember = WindowManager.prototype._rememberInGroups;
    remember.call(ctx.extWm, c);
    expect(outer.lastTabFocus).toBe(c.nodeValue);
    expect(inner.lastTabFocus).toBe(c.nodeValue);

    c.mode = WINDOW_MODES.FLOAT;
    remember.call(ctx.extWm, b);
    b.mode = WINDOW_MODES.FLOAT;
    remember.call(ctx.extWm, c);
    expect(outer.lastTabFocus).toBe(b.nodeValue);
  });
});
