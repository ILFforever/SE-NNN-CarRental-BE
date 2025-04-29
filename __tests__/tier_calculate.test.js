// const { tierCalculateDiscount, TIER_LEVEL } = require('../helper/tier_calc');

// beforeEach(() => {
//   jest.clearAllMocks();
// });

// describe("Calculate Ranks from tier", () => {
//   const tier = [-1, 0, TIER_LEVEL.length - 2, TIER_LEVEL.length - 1]; // -1 0 3 4
//   test("Boundary Tier", () => {
//     const price = [];
//     const servicePrice = [];
//     const discountAmount = null;
//     const expectedDiscount = [];

//     tier.forEach((t) => {
//       expect(tierCalculateDiscount(t, price, servicePrice, discountAmount)).toBe(expectedDiscount);
//     });
//   });

//   test("Check it's from discountAmount", () => {
//     expect(tierCalculateDiscount(1, 0, 0, 190)).toBe(190);
//   });
// })




const { tierCalculateDiscount, TIER_LEVEL } = require('../helper/tier_calc');

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Calculate Discount from Tier", () => {  //from 1200
  test("Boundary Tier Cases", () => {
    // Test invalid tier (negative)
    expect(tierCalculateDiscount(-1, 1000, 200, null)).toBe(0);
    
    // Test tier 0 (Bronze - 0% discount)
    expect(tierCalculateDiscount(0, 1000, 200, null)).toBe(0);
    
    // Test tier 1 (Silver - 5% discount) from 1200
    expect(tierCalculateDiscount(1, 1000, 200, null)).toBe(60); 
    
    // Test tier 2 (Gold - 10% discount) from 1200
    expect(tierCalculateDiscount(2, 1000, 200, null)).toBe(120);
    
    // Test tier 3 (Platinum - 15% discount) from 1200
    expect(tierCalculateDiscount(3, 1000, 200, null)).toBe(180);
    
    // Test tier 4 (Diamond - 20% discount) from 1200
    expect(tierCalculateDiscount(4, 1000, 200, null)).toBe(240);
    
    // Test invalid tier (too high)
    expect(tierCalculateDiscount(5, 1000, 200, null)).toBe(0);
  });

  test("Discount with different prices and service prices", () => {
    // Test with zero price
    expect(tierCalculateDiscount(2, 0, 100, null)).toBe(10);
    
    // Test with zero service price
    expect(tierCalculateDiscount(2, 100, 0, null)).toBe(10);
    
    // Test with both zero
    expect(tierCalculateDiscount(2, 0, 0, null)).toBe(0);
    
    // Test with high values
    expect(tierCalculateDiscount(3, 5000, 1000, null)).toBe(900);
  });

  test("When explicit discountAmount is provided", () => {
    // When discountAmount is provided, it should override tier-based calculation
    expect(tierCalculateDiscount(1, 1000, 200, 190)).toBe(190);
    
    // Even with tier 0, the explicit discount should be used
    expect(tierCalculateDiscount(0, 1000, 200, 150)).toBe(150);
    
    // With high tier but explicit discount is zero
    expect(tierCalculateDiscount(4, 1000, 200, 0)).toBe(0);
  });
});

//change tier chang price const discount