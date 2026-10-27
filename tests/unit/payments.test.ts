import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { validSignature } from "../../lib/payments";
import { paymentDecision } from "../../lib/payment-state";
const now = new Date("2026-11-01T10:00:00Z");
describe("payment state", () => {
  it("confirms an approved active hold", () =>
    expect(
      paymentDecision(
        {
          status: "PENDING",
          pendingExpiresAt: new Date(+now + 10000),
          paymentStatus: "PENDING",
        },
        "approved",
        now,
      ).confirm,
    ).toBe(true));
  for (const status of ["CANCELLED", "EXPIRED", "COMPLETED"])
    it(`never reactivates ${status}`, () => {
      const d = paymentDecision(
        { status, pendingExpiresAt: null, paymentStatus: "PENDING" },
        "approved",
        now,
      );
      expect(d.confirm).toBe(false);
      expect(d.review).toBe(true);
      expect(d.paymentStatus).toBe("PAID");
    });
  it("flags late approval without reclaiming a slot", () => {
    const d = paymentDecision(
      {
        status: "PENDING",
        pendingExpiresAt: new Date(+now - 1),
        paymentStatus: "PENDING",
      },
      "approved",
      now,
    );
    expect(d.confirm).toBe(false);
    expect(d.review).toBe(true);
  });
  it("does not flag repeated approval for confirmed paid booking", () =>
    expect(
      paymentDecision(
        { status: "CONFIRMED", pendingExpiresAt: null, paymentStatus: "PAID" },
        "approved",
        now,
      ).review,
    ).toBe(false));
  it("only marks refunds based on processor state", () => {
    expect(
      paymentDecision(
        { status: "CANCELLED", pendingExpiresAt: null, paymentStatus: "PAID" },
        "pending",
        now,
      ).paymentStatus,
    ).not.toBe("REFUNDED");
    expect(
      paymentDecision(
        { status: "CANCELLED", pendingExpiresAt: null, paymentStatus: "PAID" },
        "refunded",
        now,
      ).paymentStatus,
    ).toBe("REFUNDED");
  });
});
describe("webhook signatures", () => {
  const id = "1234",
    rid = "request-1",
    ts = String(+now),
    secret = "test-secret";
  const signature = createHmac("sha256", secret)
    .update(`id:${id};request-id:${rid};ts:${ts};`)
    .digest("hex");
  it("accepts a verified signature", () =>
    expect(
      validSignature(id, rid, `ts=${ts},v1=${signature}`, secret, +now),
    ).toBe(true));
  it("rejects tampering", () =>
    expect(
      validSignature("9999", rid, `ts=${ts},v1=${signature}`, secret, +now),
    ).toBe(false));
  it("rejects stale deliveries", () =>
    expect(
      validSignature(
        id,
        rid,
        `ts=${ts},v1=${signature}`,
        secret,
        +now + 3600000,
      ),
    ).toBe(false));
  it("rejects malformed headers", () =>
    expect(validSignature(id, rid, "ts=abc,v1=hello", secret, +now)).toBe(
      false,
    ));
});
