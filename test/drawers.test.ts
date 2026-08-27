import { describe, expect, it } from "vitest";
import { nextDrawer, wrappedFocusIndex } from "../src/drawers";

describe("responsive drawer state", () => {
  it("opens the requested drawer and keeps only one open", () => {
    expect(nextDrawer(undefined, "processes")).toBe("processes");
    expect(nextDrawer("processes", "details")).toBe("details");
  });

  it("closes a drawer when its own toggle is used", () => {
    expect(nextDrawer("details", "details")).toBeUndefined();
  });

  it("wraps focus in either direction", () => {
    expect(wrappedFocusIndex(3, 2, 1)).toBe(0);
    expect(wrappedFocusIndex(3, 0, -1)).toBe(2);
  });
});
