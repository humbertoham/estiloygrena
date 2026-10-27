import { beforeEach, describe, it, expect, vi } from "vitest";
import { SignJWT } from "jose";
const state = vi.hoisted(() => ({ value: "", set: vi.fn(), delete: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (state.value ? { value: state.value } : undefined),
    set: state.set,
    delete: state.delete,
  }),
}));
import { isAdmin, createSession, clearSession } from "../../lib/auth";
describe("admin sessions", () => {
  beforeEach(() => {
    state.value = "";
    state.set.mockClear();
    process.env.ADMIN_SESSION_SECRET =
      "isolated-test-session-secret-at-least-32-characters";
  });
  it("rejects missing and forged sessions", async () => {
    expect(await isAdmin()).toBe(false);
    state.value = "forged";
    expect(await isAdmin()).toBe(false);
  });
  it("uses a signed HttpOnly cookie and verifies its role", async () => {
    await createSession();
    const [name, token, options] = state.set.mock.calls[0];
    expect(name).toBe("eg_admin");
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 28800,
    });
    state.value = token;
    expect(await isAdmin()).toBe(true);
  });
  it("rejects expired sessions", async () => {
    state.value = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("estilo-y-grena")
      .setAudience("admin")
      .setExpirationTime(1)
      .sign(new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET));
    expect(await isAdmin()).toBe(false);
  });
  it("clears sessions on logout", async () => {
    await clearSession();
    expect(state.delete).toHaveBeenCalledWith("eg_admin");
  });
});
