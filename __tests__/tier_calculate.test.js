const { tierCalculateDiscount, TIER_LEVEL } = require('../helper/tier_calc');

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Calculate Ranks from tier", () => {
  const tier = [-1, 0, TIER_LEVEL.length - 2, TIER_LEVEL.length - 1];
  test("Boundary Tier", () => {
    const price = [];
    const servicePrice = [];
    const discountAmount = null;
    const expectedDiscount = [];

    tier.forEach((t) => {
      expect(tierCalculateDiscount(t, price, servicePrice, discountAmount)).toBe(expectedDiscount);
    });
  });

  test("Check it's from discountAmount", () => {
    expect(tierCalculateDiscount(1, 0, 0, 190)).toBe(190);
  });
})