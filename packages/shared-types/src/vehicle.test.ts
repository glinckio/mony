import {
  FUEL_TYPES,
  MIN_VEHICLE_YEAR,
  createVehicleInputSchema,
  maxVehicleYear,
  updateMileageInputSchema,
  updateVehicleInputSchema,
} from "./vehicle";

describe("createVehicleInputSchema", () => {
  const base = {
    make: "Jeep",
    model: "Renegade",
    manufactureYear: 2021,
    modelYear: 2022,
    currentMileage: 35000,
  };

  it("accepts the required fields alone", () => {
    expect(createVehicleInputSchema.safeParse(base).success).toBe(true);
  });

  it("has legacy's 8 fuel types", () => {
    expect(FUEL_TYPES).toHaveLength(8);
    expect(createVehicleInputSchema.safeParse({ ...base, fuelType: "FLEX" }).success).toBe(true);
    expect(createVehicleInputSchema.safeParse({ ...base, fuelType: "flex" }).success).toBe(false);
  });

  it("bounds years to 1901..next year", () => {
    expect(
      createVehicleInputSchema.safeParse({ ...base, manufactureYear: MIN_VEHICLE_YEAR - 1 })
        .success,
    ).toBe(false);
    const next = maxVehicleYear();
    expect(
      createVehicleInputSchema.safeParse({ ...base, manufactureYear: next, modelYear: next })
        .success,
    ).toBe(true);
    expect(
      createVehicleInputSchema.safeParse({ ...base, manufactureYear: next, modelYear: next + 1 })
        .success,
    ).toBe(false);
  });

  it("rejects a model year before the manufacture year, on modelYear", () => {
    const result = createVehicleInputSchema.safeParse({ ...base, modelYear: 2020 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["modelYear"]);
      expect(result.error.issues[0]?.message).toBe(
        "O ano do modelo não pode ser anterior ao ano de fabricação",
      );
    }
  });

  it("treats a whitespace-only make/model as missing, in pt-BR", () => {
    const result = createVehicleInputSchema.safeParse({ ...base, make: "   ", model: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual([
        "Marca é obrigatória",
        "Modelo é obrigatório",
      ]);
    }
  });

  it("requires a non-negative integer mileage", () => {
    expect(createVehicleInputSchema.safeParse({ ...base, currentMileage: -1 }).success).toBe(false);
    expect(createVehicleInputSchema.safeParse({ ...base, currentMileage: 10.5 }).success).toBe(
      false,
    );
    expect(createVehicleInputSchema.safeParse({ ...base, currentMileage: 0 }).success).toBe(true);
  });

  it("keeps legacy column widths", () => {
    expect(createVehicleInputSchema.safeParse({ ...base, licensePlate: "ABC1D234" }).success).toBe(
      true,
    );
    expect(
      createVehicleInputSchema.safeParse({ ...base, licensePlate: "x".repeat(11) }).success,
    ).toBe(false);
    expect(createVehicleInputSchema.safeParse({ ...base, make: "x".repeat(101) }).success).toBe(
      false,
    );
    expect(createVehicleInputSchema.safeParse({ ...base, color: "x".repeat(51) }).success).toBe(
      false,
    );
  });

  it("validates the acquisition date on the calendar", () => {
    expect(
      createVehicleInputSchema.safeParse({ ...base, acquisitionDate: "2022-02-30" }).success,
    ).toBe(false);
    expect(
      createVehicleInputSchema.safeParse({ ...base, acquisitionDate: "2022-02-28" }).success,
    ).toBe(true);
  });
});

describe("updateVehicleInputSchema", () => {
  it("accepts partial updates and null to clear optional fields", () => {
    expect(updateVehicleInputSchema.safeParse({}).success).toBe(true);
    expect(
      updateVehicleInputSchema.safeParse({
        licensePlate: null,
        acquisitionDate: null,
        color: null,
        fuelType: null,
      }).success,
    ).toBe(true);
  });

  it("checks year order only when both years are sent (the API checks the merged values)", () => {
    const result = updateVehicleInputSchema.safeParse({ manufactureYear: 2022, modelYear: 2021 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["modelYear"]);
    }
    expect(updateVehicleInputSchema.safeParse({ modelYear: 2021 }).success).toBe(true);
    expect(updateVehicleInputSchema.safeParse({ manufactureYear: 2022 }).success).toBe(true);
  });

  it("still validates fields that are sent", () => {
    expect(updateVehicleInputSchema.safeParse({ currentMileage: -1 }).success).toBe(false);
    expect(updateVehicleInputSchema.safeParse({ make: " " }).success).toBe(false);
    expect(updateVehicleInputSchema.safeParse({ fuelType: "gasolina" }).success).toBe(false);
    expect(updateVehicleInputSchema.safeParse({ modelYear: maxVehicleYear() + 1 }).success).toBe(
      false,
    );
  });
});

describe("updateMileageInputSchema", () => {
  it("rejects a value lower than the current one, with it in the message", () => {
    const schema = updateMileageInputSchema(35000);
    expect(schema.safeParse({ currentMileage: 35000 }).success).toBe(true);
    expect(schema.safeParse({ currentMileage: 36000 }).success).toBe(true);
    const result = schema.safeParse({ currentMileage: 34999 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/35\.000 km/);
    }
  });
});
