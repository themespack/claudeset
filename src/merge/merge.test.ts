import { describe, it, expect } from "vitest";
import { deepMergeFillMissing } from "./index.js";
import { render } from "../template/index.js";

describe("deepMergeFillMissing", () => {
  it("fills missing keys without overwriting existing ones", () => {
    const target = { a: 1, nested: { keep: true } };
    const source = { a: 99, b: 2, nested: { keep: false, add: 3 } };
    const { result, changed } = deepMergeFillMissing(target, source);
    expect(changed).toBe(true);
    expect(result.a).toBe(1); // not overwritten
    expect(result.b).toBe(2); // added
    expect((result.nested as Record<string, unknown>).keep).toBe(true);
    expect((result.nested as Record<string, unknown>).add).toBe(3);
  });

  it("reports no change when target already has everything", () => {
    const target = { a: 1, b: { c: 2 } };
    const source = { a: 9, b: { c: 9 } };
    const { changed } = deepMergeFillMissing(target, source);
    expect(changed).toBe(false);
  });
});

describe("render", () => {
  it("substitutes known vars and leaves unknown intact", () => {
    expect(render("Hi {{name}} on {{missing}}", { name: "Bob" })).toBe(
      "Hi Bob on {{missing}}",
    );
  });
});
