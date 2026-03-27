import { addCents, formatCents } from "@budget/shared/money/cents";

describe("money helpers", () => {
  it("adds cents as integers", () => {
    expect(addCents(105, 95)).toBe(200);
  });

  it("formats cents safely", () => {
    expect(formatCents(12345)).toBe("123.45");
  });
});
