import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import St from "gi://St";
import { Node, NODE_TYPES, LAYOUT_TYPES } from "../../lib/extension/tree.js";
import { createTreeFixture } from "../mocks/helpers/index.js";

/**
 * forge-5qp1: a stacked container when the tab decoration is disabled.
 *
 * With `showtab-decoration-enabled` OFF a stack has no title list, so every
 * child used to get the full container rect and the windows behind the focused
 * one could not be seen at all. Like Forge before the title list, and like
 * forge-ext/forge#568, it now keeps the cascade: each window one header lower
 * than the one before, so the top of each window shows. The decoration host
 * stays hidden.
 */
describe("forge-5qp1: stacked cascade when tab decoration disabled", () => {
  let ctx;

  beforeEach(() => {
    ctx = createTreeFixture({ fullExtWm: true });
    ctx.extWm.calculateGaps = () => 0;
    vi.spyOn(ctx.tree, "hasTitleList").mockReturnValue(false);
    vi.spyOn(ctx.tree, "stackedBarHeight").mockReturnValue(35);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ctx.cleanup();
  });

  function stack(n) {
    const container = new Node(NODE_TYPES.CON, new St.Bin());
    container.layout = LAYOUT_TYPES.STACKED;
    container.rect = { x: 0, y: 0, width: 1000, height: 800 };
    container.childNodes = Array.from({ length: n }, () => new Node(NODE_TYPES.CON, new St.Bin()));
    const params = { stackedHeight: 0, tiledChildren: container.childNodes };
    container.childNodes.forEach((child, i) =>
      ctx.tree.processStacked(container, child, params, i)
    );
    return container;
  }

  it("places each child one header lower than the one before", () => {
    const container = stack(3);
    container.childNodes.forEach((child, i) => {
      expect(child.rect.x).toBe(0);
      expect(child.rect.y).toBe(35 * i);
      expect(child.rect.width).toBe(1000);
      expect(child.rect.height).toBe(800 - 35 * i);
    });
  });

  it("gives a lone child the full container rect", () => {
    const [child] = stack(1).childNodes;
    expect(child.rect).toEqual({ x: 0, y: 0, width: 1000, height: 800 });
  });

  it("hides the decoration host", () => {
    const container = stack(2);
    expect(container.decoration?.visible ?? false).toBe(false);
  });
});
