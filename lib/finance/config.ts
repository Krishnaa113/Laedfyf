export function isUnpaidDeliveryBlocked() {
  const raw = process.env.BLOCK_DELIVERY_IF_UNPAID;
  if (raw === "false" || raw === "0") {
    return false;
  }
  return true;
}
