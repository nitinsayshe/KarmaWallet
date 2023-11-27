export enum MarqetaCardFulfillmentStatus {
  'ISSUED' = 'ISSUED',
  'ORDERED' = 'ORDERED',
  'REORDERED' = 'REORDERED',
  'REJECTED' = 'REJECTED',
  'SHIPPED' = 'SHIPPED',
  'DELIVERED' = 'DELIVERED',
  'DIGITALLY_PRESENTED' = 'DIGITALLY_PRESENTED',
}

export enum MarqetaCardState {
  'ACTIVE' = 'ACTIVE',
  'SUSPENDED' = 'SUSPENDED',
  'TERMINATED' = 'TERMINATED',
  'UNSUPPORTED' = 'UNSUPPORTED',
  'UNACTIVATED' = 'UNACTIVATED',
  'LIMITED' = 'LIMITED'
}

export enum MarqetaCardWebhookType {
  'DELIVERED' = 'fulfillment.delivered',
  'DIGITALLY_PRESENTED' = 'fulfillment.digitally_presented',
  'ISSUED' = 'fulfillment.issued',
  'ORDERED' = 'fulfillment.ordered',
  'REJECTED' = 'fulfillment.rejected',
  'ACTIVATED' = 'state.activated',
  'LIMITED' = 'state.limited',
  'SUSPENDED' = 'state.suspended',
  'TERMINATED' = 'state.terminated',
  'REINSTATED' = 'state.reinstated',
}
