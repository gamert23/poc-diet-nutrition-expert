import { describe, expect, it } from "vitest";
import { evaluateMealWarnings } from "./safety";

describe("evaluateMealWarnings", () => {
  it("flags sodium above 600 mg for hypertension", () => {
    expect(evaluateMealWarnings({ sodium_mg: 601, sugar_g: 0 }, ["hypertension"])).toEqual(["HIGH_SODIUM_WARNING"]);
  });

  it("does not flag sodium at exactly 600 mg", () => {
    expect(evaluateMealWarnings({ sodium_mg: 600, sugar_g: 0 }, ["hypertension"])).toEqual([]);
  });

  it("flags sugar above 10 g for diabetes", () => {
    expect(evaluateMealWarnings({ sodium_mg: 0, sugar_g: 10.5 }, ["diabetes"])).toEqual(["HIGH_SUGAR_WARNING"]);
  });

  it("does not flag users without the matching condition", () => {
    expect(evaluateMealWarnings({ sodium_mg: 2000, sugar_g: 50 }, [])).toEqual([]);
    expect(evaluateMealWarnings({ sodium_mg: 2000, sugar_g: 0 }, ["diabetes"])).toEqual([]);
  });

  it("returns both flags when both conditions are exceeded", () => {
    expect(evaluateMealWarnings({ sodium_mg: 900, sugar_g: 25 }, ["hypertension", "diabetes"])).toEqual([
      "HIGH_SODIUM_WARNING",
      "HIGH_SUGAR_WARNING",
    ]);
  });
});
