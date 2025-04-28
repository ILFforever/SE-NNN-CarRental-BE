const { calculateRentalDuration, combineDateTime } = require("../helper/duration_time");

describe("Calculate Rental Duration Check", () => {
    test("Check it's same date", () => {
        const startDateTime = "2023-10-01T10:00:00";
        const returnDateTime = "2023-10-01T12:00:00";
        expect(calculateRentalDuration(startDateTime, returnDateTime)).toBe(1);
    });

    test("Check it's different date - Time > 24 hours", () => {
        const startDateTime = "2023-10-01T10:00:00";
        const returnDateTime = "2023-10-02T12:00:00";
        expect(calculateRentalDuration(startDateTime, returnDateTime)).toBe(2);
    });

    test("Check it's different date - Time <= 24 hours", () => {
        const startDateTime = "2023-10-01T10:00:00";
        const returnDateTime = "2023-10-02T09:00:00";
        expect(calculateRentalDuration(startDateTime, returnDateTime)).toBe(1);
    });

    test("Check it's different date - Time equals with 24 hours", () => {
        const startDateTime = "2023-10-01T10:00:00";
        const returnDateTime = "2023-10-02T10:00:00";
        expect(calculateRentalDuration(startDateTime, returnDateTime)).toBe(1);
    });
});

describe("Combine Date/Time", () => {
    test("Check without timeStr", () => {
        expect(combineDateTime("2023-10-01", null)).toEqual(new Date("2023-10-01T07:00:00"));
    });

    test("Check it's string", () => {
        expect(combineDateTime("2023-10-01", "10:00")).toEqual(new Date("2023-10-01T10:00:00"));
    });
})