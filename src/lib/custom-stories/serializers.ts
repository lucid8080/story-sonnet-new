export function serializeCustomStoryOrder(order: {
  storyId: bigint | null;
  createdAt: Date;
  updatedAt: Date;
  paidAt: Date | null;
  nfcFulfilledAt: Date | null;
  [key: string]: unknown;
}) {
  return {
    ...order,
    storyId: order.storyId ? order.storyId.toString() : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    nfcFulfilledAt: order.nfcFulfilledAt?.toISOString() ?? null,
  };
}
