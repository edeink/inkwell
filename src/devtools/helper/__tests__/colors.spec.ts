import { describe, it, expect } from "vitest";

import { isColor } from "../colors";

describe("颜色识别", () => {
  it("识别 hex", () => {
    expect(isColor("#fff")).toBe(true);
    expect(isColor("#ffffff")).toBe(true);
    expect(isColor("#ffffffff")).toBe(true);
  });
  it("识别 rgb/hsl", () => {
    expect(isColor("rgb(0,0,0)")).toBe(true);
    expect(isColor("rgba(0,0,0,0.5)")).toBe(true);
    expect(isColor("hsl(120, 100%, 50%)")).toBe(true);
  });
  it("非颜色", () => {
    expect(isColor("hello")).toBe(false);
    expect(isColor(123)).toBe(false);
    expect(isColor(null)).toBe(false);
  });
});