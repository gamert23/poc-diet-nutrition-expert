import { describe, expect, it } from "vitest";
import { conditionLabel, recognizeConditions } from "./conditions";

describe("recognizeConditions", () => {
  it("recognises Thai and English names of the two rule-backed conditions", () => {
    expect(recognizeConditions(["ความดันโลหิตสูง"])).toEqual(["hypertension"]);
    expect(recognizeConditions(["ความดันสูง", "เบาหวานชนิดที่ 2"])).toEqual(["hypertension", "diabetes"]);
    expect(recognizeConditions(["High Blood Pressure", "Diabetic"])).toEqual(["hypertension", "diabetes"]);
  });

  it("keeps saved enum ids working", () => {
    expect(recognizeConditions(["hypertension", "diabetes"])).toEqual(["hypertension", "diabetes"]);
  });

  it("does not treat low blood pressure as hypertension", () => {
    expect(recognizeConditions(["ความดันต่ำ"])).toEqual([]);
  });

  it("ignores conditions the safety rules do not cover", () => {
    expect(recognizeConditions(["โรคไต", "ไขมันในเลือดสูง"])).toEqual([]);
    expect(recognizeConditions([])).toEqual([]);
  });
});

describe("conditionLabel", () => {
  it("shows Thai labels for saved enum ids and leaves free text alone", () => {
    expect(conditionLabel("hypertension")).toBe("ความดันโลหิตสูง");
    expect(conditionLabel("โรคไต")).toBe("โรคไต");
  });
});
