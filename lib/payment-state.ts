export function paymentDecision(
  a: { status: string; pendingExpiresAt: Date | null; paymentStatus: string },
  status: string,
  now = new Date(),
) {
  const liveHold =
    a.status === "PENDING" &&
    a.pendingExpiresAt !== null &&
    +a.pendingExpiresAt > +now;
  const approved = status === "approved";
  return {
    confirm: approved && liveHold,
    review:
      approved &&
      !liveHold &&
      !(a.status === "CONFIRMED" && a.paymentStatus === "PAID"),
    paymentStatus:
      status === "refunded"
        ? ("REFUNDED" as const)
        : approved
          ? ("PAID" as const)
          : ["rejected", "cancelled", "charged_back"].includes(status)
            ? ("FAILED" as const)
            : ("PENDING" as const),
  };
}
