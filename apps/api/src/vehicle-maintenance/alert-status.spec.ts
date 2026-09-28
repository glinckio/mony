import { compareByUrgency, computeAlertStatus, type AlertStatusInput } from "./alert-status";

const TODAY = "2026-09-26";

// An oil change every 10,000 km / 12 months, last done at 40,000 km.
function input(overrides: Partial<AlertStatusInput> = {}): AlertStatusInput {
  return {
    currentMileage: 42_000,
    mileageAlert: 50_000,
    kmInterval: 10_000,
    monthsInterval: null,
    lastService: { date: "2026-06-01", mileage: 40_000 },
    ...overrides,
  };
}

describe("computeAlertStatus", () => {
  describe("km signal", () => {
    it("is OVERDUE at 100% when the type was never serviced, whatever the km", () => {
      const result = computeAlertStatus(
        input({ lastService: null, currentMileage: 0, mileageAlert: 10_000 }),
        TODAY,
      );
      expect(result).toEqual({
        status: "OVERDUE",
        percent: 100,
        kmRemaining: 10_000,
        nextDate: null,
        daysRemaining: null,
      });
    });

    it("is OVERDUE once the due mileage is reached or passed", () => {
      expect(computeAlertStatus(input({ currentMileage: 50_000 }), TODAY)).toMatchObject({
        status: "OVERDUE",
        percent: 100,
        kmRemaining: 0,
      });
      expect(computeAlertStatus(input({ currentMileage: 50_300 }), TODAY)).toMatchObject({
        status: "OVERDUE",
        kmRemaining: -300,
      });
    });

    it("is URGENT at 90% within 10% of the interval", () => {
      expect(computeAlertStatus(input({ currentMileage: 49_000 }), TODAY)).toMatchObject({
        status: "URGENT",
        percent: 90,
        kmRemaining: 1_000,
      });
      expect(computeAlertStatus(input({ currentMileage: 49_999 }), TODAY).status).toBe("URGENT");
    });

    it("is WARNING at 80% within 20% of the interval", () => {
      expect(computeAlertStatus(input({ currentMileage: 48_000 }), TODAY)).toMatchObject({
        status: "WARNING",
        percent: 80,
      });
      expect(computeAlertStatus(input({ currentMileage: 48_999 }), TODAY).status).toBe("WARNING");
    });

    it("is ON_TRACK with the wear since the last service, rounded down", () => {
      expect(computeAlertStatus(input({ currentMileage: 42_345 }), TODAY)).toMatchObject({
        status: "ON_TRACK",
        percent: 23,
      });
    });

    it("caps ON_TRACK wear at 70%", () => {
      expect(computeAlertStatus(input({ currentMileage: 47_999 }), TODAY)).toMatchObject({
        status: "ON_TRACK",
        percent: 70,
      });
    });

    it("never reports negative wear (odometer below the last service)", () => {
      expect(computeAlertStatus(input({ currentMileage: 39_000 }), TODAY)).toMatchObject({
        status: "ON_TRACK",
        percent: 0,
      });
    });
  });

  describe("time signal", () => {
    // Serviced 2025-10-01 + 12 months = due 2026-10-01, 5 days after TODAY.
    const timed = (overrides: Partial<AlertStatusInput> = {}) =>
      input({
        monthsInterval: 12,
        lastService: { date: "2025-10-01", mileage: 40_000 },
        ...overrides,
      });

    it("reports the next date and the days left", () => {
      expect(computeAlertStatus(timed(), TODAY)).toMatchObject({
        nextDate: "2026-10-01",
        daysRemaining: 5,
      });
    });

    it("escalates an ON_TRACK km signal to URGENT within 15 days", () => {
      expect(computeAlertStatus(timed(), TODAY)).toMatchObject({ status: "URGENT", percent: 90 });
    });

    it("escalates to WARNING within 30 days", () => {
      expect(computeAlertStatus(timed(), "2026-09-01")).toMatchObject({
        status: "WARNING",
        percent: 80,
        daysRemaining: 30,
      });
    });

    it("leaves the km signal alone with more than 30 days left", () => {
      expect(computeAlertStatus(timed(), "2026-08-31")).toMatchObject({
        status: "ON_TRACK",
        percent: 20,
        daysRemaining: 31,
      });
    });

    it("is OVERDUE on the due date and after it", () => {
      expect(computeAlertStatus(timed(), "2026-10-01")).toMatchObject({
        status: "OVERDUE",
        percent: 100,
        daysRemaining: 0,
      });
      expect(computeAlertStatus(timed(), "2026-10-11")).toMatchObject({
        status: "OVERDUE",
        daysRemaining: -10,
      });
    });

    it("never lowers a more urgent km signal (legacy bug: it overwrote the status)", () => {
      const result = computeAlertStatus(timed({ currentMileage: 51_000 }), "2026-09-10");
      expect(result).toMatchObject({ status: "OVERDUE", percent: 100, daysRemaining: 21 });
    });

    it("keeps the higher percent when the time signal wins the status", () => {
      // km: WARNING 80; time: URGENT 90.
      expect(computeAlertStatus(timed({ currentMileage: 48_500 }), TODAY)).toMatchObject({
        status: "URGENT",
        percent: 90,
      });
    });

    it("is ignored without a months interval or without a previous service", () => {
      expect(computeAlertStatus(timed({ monthsInterval: null }), TODAY)).toMatchObject({
        status: "ON_TRACK",
        nextDate: null,
        daysRemaining: null,
      });
      expect(computeAlertStatus(timed({ lastService: null }), TODAY)).toMatchObject({
        status: "OVERDUE",
        nextDate: null,
        daysRemaining: null,
      });
    });

    it("rolls month overflow over like the rest of the API (Jan 31 + 1 month)", () => {
      const result = computeAlertStatus(
        timed({ monthsInterval: 1, lastService: { date: "2026-01-31", mileage: 40_000 } }),
        "2026-02-20",
      );
      expect(result.nextDate).toBe("2026-03-03");
    });
  });
});

describe("compareByUrgency", () => {
  it("puts the highest percent first, then the fewest km left", () => {
    const items = [
      { id: "a", percent: 20, kmRemaining: 8_000 },
      { id: "b", percent: 100, kmRemaining: -500 },
      { id: "c", percent: 100, kmRemaining: -2_000 },
      { id: "d", percent: 90, kmRemaining: 400 },
    ];
    expect(items.sort(compareByUrgency).map((item) => item.id)).toEqual(["c", "b", "d", "a"]);
  });
});
