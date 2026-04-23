import * as bcrypt from "bcrypt";

describe("UsersService password hashing", () => {
  it("uses bcrypt with sufficient rounds", async () => {
    const hash = await bcrypt.hash("test-password-123", 12);
    const ok = await bcrypt.compare("test-password-123", hash);
    expect(ok).toBe(true);
  });
});
