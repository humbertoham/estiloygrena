import { describe, it, expect, vi } from "vitest";
vi.mock("../../lib/auth", () => ({
  requireAdmin: vi.fn(async () => {
    throw new Error("Unauthorized");
  }),
  createSession: vi.fn(),
  clearSession: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import * as actions from "../../app/admin/actions";
describe("server action authorization", () => {
  for (const name of [
    "saveService",
    "saveHours",
    "saveException",
    "removeException",
    "saveBlock",
    "removeBlock",
    "updateAppointment",
    "rescheduleAppointment",
    "saveSettings",
    "uploadGallery",
    "updateGallery",
    "removeGallery",
  ] as const)
    it(`rejects unauthenticated ${name}`, async () => {
      await expect(actions[name](new FormData())).rejects.toThrow(
        "Unauthorized",
      );
    });
});
