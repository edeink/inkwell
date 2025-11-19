import { describe, it, expect } from "vitest";

import { clamp } from "../math";

describe("数值约束", () => {
  it("在区间内", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("小于最小值", () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });
  it("大于最大值", () => {
    expect(clamp(11, 0, 10)).toBe(10);
  });
});