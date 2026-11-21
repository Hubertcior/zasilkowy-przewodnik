import { describe, expect, it } from "vitest";
import defaults from "@/config/params.default.json";
import { round2 } from "@/engine/math";
import { maxBaseNonEmployee, minBase, ParamsSchema } from "@/engine/params";

describe("params.default.json", () => {
  it("passes schema validation", () => {
    const result = ParamsSchema.safeParse(defaults);
    expect(result.error?.issues).toBeUndefined();
    expect(result.success).toBe(true);
  });

  it("minBase = minWage × (1 − contributionRate) = 4147.10", () => {
    expect(minBase(ParamsSchema.parse(defaults))).toBe(4147.1);
  });

  it("maxBaseNonEmployee = 20321.30", () => {
    expect(maxBaseNonEmployee(ParamsSchema.parse(defaults))).toBe(20321.3);
  });

  it("rejects out-of-range rate", () => {
    const bad = structuredClone(defaults);
    bad.rates.parental = 1.7;
    expect(ParamsSchema.safeParse(bad).success).toBe(false);
  });
});

describe("round2", () => {
  it("rounds half up despite float noise", () => {
    expect(round2(20321.295)).toBe(20321.3);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(4147.0974)).toBe(4147.1);
    expect(round2(-2.345)).toBe(-2.35);
  });
});
