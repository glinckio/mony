import {
  confirmResetInputSchema,
  loginInputSchema,
  registerInputSchema,
  requestResetInputSchema,
} from "./auth";

const base = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "correcthorsebattery",
  passwordConfirmation: "correcthorsebattery",
};

describe("registerInputSchema", () => {
  it("accepts a valid payload without a phone", () => {
    const result = registerInputSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("treats an empty-string phone the same as an omitted one", () => {
    const result = registerInputSchema.safeParse({ ...base, phone: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
    }
  });

  it("accepts a valid 11-digit phone", () => {
    const result = registerInputSchema.safeParse({ ...base, phone: "11987654321" });
    expect(result.success).toBe(true);
  });

  it("rejects a non-numeric phone", () => {
    const result = registerInputSchema.safeParse({ ...base, phone: "not-a-phone" });
    expect(result.success).toBe(false);
  });

  it("rejects a mismatched password confirmation with a pt-BR message", () => {
    const result = registerInputSchema.safeParse({ ...base, passwordConfirmation: "different" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("As senhas não coincidem");
    }
  });
});

describe("loginInputSchema", () => {
  it("accepts a valid email and non-empty password", () => {
    const result = loginInputSchema.safeParse({ email: "ada@example.com", password: "x" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginInputSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginInputSchema.safeParse({ email: "ada@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("requestResetInputSchema", () => {
  it("accepts a valid email", () => {
    const result = requestResetInputSchema.safeParse({ email: "ada@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = requestResetInputSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

describe("confirmResetInputSchema", () => {
  const base = {
    email: "ada@example.com",
    code: "123456",
    newPassword: "correcthorsebattery",
    newPasswordConfirmation: "correcthorsebattery",
  };

  it("accepts a valid payload", () => {
    const result = confirmResetInputSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("rejects a code that isn't 6 digits", () => {
    const result = confirmResetInputSchema.safeParse({ ...base, code: "123" });
    expect(result.success).toBe(false);
  });

  it("rejects a mismatched password confirmation with a pt-BR message", () => {
    const result = confirmResetInputSchema.safeParse({
      ...base,
      newPasswordConfirmation: "different",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("As senhas não coincidem");
    }
  });

  it("rejects a new password shorter than 8 characters", () => {
    const result = confirmResetInputSchema.safeParse({
      ...base,
      newPassword: "short",
      newPasswordConfirmation: "short",
    });
    expect(result.success).toBe(false);
  });
});
