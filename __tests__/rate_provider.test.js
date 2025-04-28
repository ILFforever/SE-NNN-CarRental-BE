const { validateRateProvider } = require("../helper/rate_provider");

describe("Provider Rate Validate", () => {
    test("Boundary Check", () => {
        const rateProvider = [0, 1, 2, 3, 4, 5, 6];
        const expected = [false, true, true, true, true, true, false];

        rateProvider.forEach((rate, index) => {
            expect(validateRateProvider(rate)).toBe(expected[index]);
        });
    });

    test("Check unexpected rate", () => {
        expect(validateRateProvider("Hello, World")).toBe(false);
        expect(validateRateProvider(null)).toBe(false);
    })
})
