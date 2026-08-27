import { describe, expect, it } from "vitest";
import { adjustPanelWidth, clampPanelWidth, defaultPanelWidth } from "../src/panels";

describe("panel width policy", () => {
  it("clamps each panel to its documented bounds", () => {
    expect(clampPanelWidth("processes", 100)).toBe(224);
    expect(clampPanelWidth("processes", 900)).toBe(480);
    expect(clampPanelWidth("details", 100)).toBe(288);
    expect(clampPanelWidth("details", 900)).toBe(560);
  });

  it("moves the left separator with arrow keys", () => {
    expect(adjustPanelWidth("processes", 288, "ArrowLeft", false)).toBe(280);
    expect(adjustPanelWidth("processes", 288, "ArrowRight", true)).toBe(320);
  });

  it("inverts separator movement for the right-hand panel", () => {
    expect(adjustPanelWidth("details", 368, "ArrowLeft", false)).toBe(376);
    expect(adjustPanelWidth("details", 368, "ArrowRight", true)).toBe(336);
  });

  it("restores sensible defaults with Home", () => {
    expect(adjustPanelWidth("processes", 400, "Home", false)).toBe(defaultPanelWidth("processes"));
    expect(adjustPanelWidth("details", 500, "Home", false)).toBe(defaultPanelWidth("details"));
  });
});
