import { Types } from 'mongoose';
import { TransactionModelStateEnum, TransactionModelTypeEnum } from '../../clients/marqeta/types';

export const sectorsToExcludeFromTransactions = [
  // production
  new Types.ObjectId('621b9adb5f87e75f536670b4'), // payment services
  new Types.ObjectId('621b9ada5f87e75f53666f9a'), // commercial banking
  // staging
  new Types.ObjectId('62192ef3f022c9e3fbff0c28'), // payment services
  new Types.ObjectId('62192ef2f022c9e3fbff0b0e'), // commercial banking
];

export const TransactionSubtypeEnum = {
  Cashback: 'cashback',
  Employer: 'employer',
  Refund: 'refund',
} as const;
export type TransactionSubtypeEnumValues = (typeof TransactionSubtypeEnum)[keyof typeof TransactionSubtypeEnum];

export const TransactionCreditSubtypeEnum = {
  Cashback: TransactionSubtypeEnum.Cashback,
  Employer: TransactionSubtypeEnum.Employer,
  Refund: TransactionSubtypeEnum.Refund,
} as const;
export type TransactionCreditSubtypeEnumValues = (typeof TransactionSubtypeEnum)[keyof typeof TransactionSubtypeEnum];

export const TransactionTypeEnum = {
  Adjustment: 'adjustment',
  Credit: 'credit',
  Debit: 'debit',
  Deposit: 'deposit',
} as const;
export type TransactionTypeEnumValues = (typeof TransactionTypeEnum)[keyof typeof TransactionTypeEnum];

export const transactionTypesToExcludeFromImpactReports = [
  TransactionTypeEnum.Credit,
  TransactionTypeEnum.Adjustment,
  TransactionTypeEnum.Deposit,
];

export const transactionStatusesToExcludeFromImpactReports = [
  TransactionModelStateEnum.Declined,
  TransactionModelStateEnum.Error,
];

export const TriggerDeclinedTransactionTypeEnum = {
  AuthorizationClearingChargebackReversal: TransactionModelTypeEnum.AuthorizationClearingChargebackReversal,
  AuthorizationReversal: TransactionModelTypeEnum.AuthorizationReversal,
  DirectdepositCreditPendingReversal: TransactionModelTypeEnum.DirectdepositCreditPendingReversal,
  DirectdepositCreditReject: TransactionModelTypeEnum.DirectdepositCreditReject,
  DirectdepositDebitPendingReversal: TransactionModelTypeEnum.DirectdepositDebitPendingReversal,
  DirectdepositDebitReject: TransactionModelTypeEnum.DirectdepositDebitReject,
  FeeChargeReversal: TransactionModelTypeEnum.FeeChargeReversal,
  GpaCreditAuthorizationReversal: TransactionModelTypeEnum.GpaCreditAuthorizationReversal,
  GpaCreditNetworkloadReversal: TransactionModelTypeEnum.GpaCreditNetworkloadReversal,
  GpaCreditPendingReversal: TransactionModelTypeEnum.GpaCreditPendingReversal,
  GpaDebitPendingReversal: TransactionModelTypeEnum.GpaCreditPendingReversal,
  GpaCreditReversal: TransactionModelTypeEnum.GpaCreditReversal,
  GpaDebitReversal: TransactionModelTypeEnum.GpaDebitReversal,
  OriginalCreditAuthPlusCaptureReversal: TransactionModelTypeEnum.OriginalCreditAuthPlusCaptureReversal,
  OriginalCreditAuthorizationReversal: TransactionModelTypeEnum.OriginalCreditAuthorizationReversal,
  PindebitAuthorizationReversal: TransactionModelTypeEnum.PindebitAuthorizationReversal,
  PindebitAuthorizationReversalIssuerexpiration: TransactionModelTypeEnum.PindebitAuthorizationReversalIssuerexpiration,
  PindebitChargebackReversal: TransactionModelTypeEnum.PindebitChargebackReversal,
  PindebitRefundReversal: TransactionModelTypeEnum.PindebitRefundReversal,
  PindebitReversal: TransactionModelTypeEnum.PindebitReversal,
  PushtocardReversal: TransactionModelTypeEnum.PushtocardReversal,
  RefundAuthorizationReversal: TransactionModelTypeEnum.RefundAuthorizationReversal,
} as const;
export type TriggerDeclinedTransactionTypeEnumValues =
  (typeof TriggerDeclinedTransactionTypeEnum)[keyof typeof TriggerDeclinedTransactionTypeEnum];

export const TriggerPendingTransactionTypeEnum = {
  DirectdepositCreditPending: TransactionModelTypeEnum.DirectdepositCreditPending,
  DirectdepositDebitPending: TransactionModelTypeEnum.DirectdepositDebitPending,
  FeeChargePending: TransactionModelTypeEnum.FeeChargePending,
  GpaCreditPending: TransactionModelTypeEnum.GpaCreditPending,
  GpaDebitPending: TransactionModelTypeEnum.GpaDebitPending,
} as const;
export type TriggerPendingTransactionTypeEnumValues =
  (typeof TriggerPendingTransactionTypeEnum)[keyof typeof TriggerPendingTransactionTypeEnum];

export const TriggerClearedTransactionTypeEnum = {
  AuthorizationClearing: TransactionModelTypeEnum.AuthorizationClearing,
  AuthorizationClearingAtmWithdrawal: TransactionModelTypeEnum.AuthorizationClearingAtmWithdrawal,
  AuthorizationClearingCashback: TransactionModelTypeEnum.AuthorizationClearingCashback,
  AuthorizationClearingChargebackCompleted: TransactionModelTypeEnum.AuthorizationClearingChargebackCompleted,
  AuthorizationClearingQuasiCash: TransactionModelTypeEnum.AuthorizationClearingQuasiCash,
  PindebitAuthorizationClearing: TransactionModelTypeEnum.PindebitAuthorizationClearing,
  RefundAuthorizationClearing: TransactionModelTypeEnum.RefundAuthorizationClearing,
  PindebitChargebackCompleted: TransactionModelTypeEnum.PindebitChargebackCompleted,
} as const;
export type TriggerClearingTransactionTypeEnumValues =
  (typeof TriggerClearedTransactionTypeEnum)[keyof typeof TriggerClearedTransactionTypeEnum];

export const AdjustmentTransactionTypeEnum = {
  AuthorizaitonClearingChargebackProvisionalDebit: TransactionModelTypeEnum.AuthorizationClearingChargebackProvisionalDebit,
  AuthorizaitonClearingChargebackWriteoff: TransactionModelTypeEnum.AuthorizationClearingChargebackWriteoff,
  AuthorizationClearingChargeback: TransactionModelTypeEnum.AuthorizationClearingChargeback,
  AuthorizationClearingChargebackCompleted: TransactionModelTypeEnum.AuthorizationClearingChargebackCompleted,
  AuthorizationClearingChargebackProvisionalCredit: TransactionModelTypeEnum.AuthorizationClearingChargebackProvisionalCredit,
  AuthorizationClearingChargebackReversal: TransactionModelTypeEnum.AuthorizationClearingChargebackReversal,
  AuthorizationClearingRepresentment: TransactionModelTypeEnum.AuthorizationClearingRepresentment,
  PindebitChargeback: TransactionModelTypeEnum.PindebitChargeback,
  PindebitChargebackCompleted: TransactionModelTypeEnum.PindebitChargebackCompleted,
  PindebitChargebackProvisionalCredit: TransactionModelTypeEnum.PindebitChargebackProvisionalCredit,
  PindebitChargebackProvisionalDebit: TransactionModelTypeEnum.PindebitChargebackProvisionalDebit,
  PindebitChargebackReversal: TransactionModelTypeEnum.PindebitChargebackReversal,
  PindebitChargebackWriteoff: TransactionModelTypeEnum.PindebitChargebackWriteoff,
};
export type AdjustmentTransactionTypeEnumValues = (typeof AdjustmentTransactionTypeEnum)[keyof typeof AdjustmentTransactionTypeEnum];

export const CreditTransactionTypeEnum = {
  GpaCreditAuthorization: TransactionModelTypeEnum.GpaCreditAuthorization,
  GpaCreditAuthorizationReversal: TransactionModelTypeEnum.GpaCreditAuthorizationReversal,
  GpaCreditIssueroperator: TransactionModelTypeEnum.GpaCreditIssueroperator,
  GpaCreditNetworkload: TransactionModelTypeEnum.GpaCreditNetworkload,
  GpaCreditNetworkloadReversal: TransactionModelTypeEnum.GpaCreditNetworkloadReversal,
  GpaCreditPending: TransactionModelTypeEnum.GpaCreditPending,
  GpaCreditPendingReversal: TransactionModelTypeEnum.GpaCreditPendingReversal,
  GpaCreditReversal: TransactionModelTypeEnum.GpaCreditReversal,
  GpaCredit: TransactionModelTypeEnum.GpaCredit,
  Refund: TransactionModelTypeEnum.Refund,
  RefundAuthorization: TransactionModelTypeEnum.RefundAuthorization,
  RefundAuthorizationClearing: TransactionModelTypeEnum.RefundAuthorizationClearing,
  RefundAuthorizationReversal: TransactionModelTypeEnum.RefundAuthorizationReversal,
  PindebitRefund: TransactionModelTypeEnum.PindebitRefund,
  PindebitCashback: TransactionModelTypeEnum.PindebitCashback,
} as const;
export type CreditTransactionTypeEnumValues = (typeof CreditTransactionTypeEnum)[keyof typeof CreditTransactionTypeEnum];

export const RefundTransactionTypeEnum = {
  Refund: TransactionModelTypeEnum.Refund,
  RefundAuthorization: TransactionModelTypeEnum.RefundAuthorization,
  RefundAuthorizationClearing: TransactionModelTypeEnum.RefundAuthorizationClearing,
  RefundAuthorizationReversal: TransactionModelTypeEnum.RefundAuthorizationReversal,
  PindebitRefund: TransactionModelTypeEnum.PindebitRefund,
} as const;
export type RefundTransactionTypeEnumValues = (typeof RefundTransactionTypeEnum)[keyof typeof RefundTransactionTypeEnum];

export const DebitTransactionTypeEnum = {
  Authorization: TransactionModelTypeEnum.Authorization,
  AuthorizationClearingCashback: TransactionModelTypeEnum.AuthorizationClearingCashback,
  AuthorizationATMWithdrawal: TransactionModelTypeEnum.AuthorizationAtmWithdrawal,
  AuthorizationAdvice: TransactionModelTypeEnum.AuthorizationAdvice,
  AuthorizationCashback: TransactionModelTypeEnum.AuthorizationCashback,
  AuthorizationClearing: TransactionModelTypeEnum.AuthorizationClearing,
  AuthorizationClearingATMWithdrawal: TransactionModelTypeEnum.AuthorizationClearingAtmWithdrawal,
  AuthorizationClearingQuasiCash: TransactionModelTypeEnum.AuthorizationClearingQuasiCash,
  AuthorizationIncremental: TransactionModelTypeEnum.AuthorizationIncremental,
  AuthorizationQuasiCash: TransactionModelTypeEnum.AuthorizationQuasiCash,
  AuthorizationReversal: TransactionModelTypeEnum.AuthorizationReversal,
  AuthorizationReversalIssuerexpiration: TransactionModelTypeEnum.AuthorizationReversalIssuerexpiration,
  AuthorizationStandin: TransactionModelTypeEnum.AuthorizationStandin,
  GpaDebit: TransactionModelTypeEnum.GpaDebit,
  GpaDebitIssueroperator: TransactionModelTypeEnum.GpaDebitIssueroperator,
  GpaDebitNetworkload: TransactionModelTypeEnum.GpaDebitNetworkload,
  GpaDebitPending: TransactionModelTypeEnum.GpaDebitPending,
  GpaDebitPendingReversal: TransactionModelTypeEnum.GpaDebitPendingReversal,
  GpaDebitReversal: TransactionModelTypeEnum.GpaDebitReversal,
  Pindebit: TransactionModelTypeEnum.Pindebit,
  PindebitAtmWithdrawal: TransactionModelTypeEnum.PindebitAtmWithdrawal,
  PindebitAuthorization: TransactionModelTypeEnum.PindebitAuthorization,
  PindebitQuasicash: TransactionModelTypeEnum.PindebitQuasicash,
  PindebitRefundReversal: TransactionModelTypeEnum.PindebitRefundReversal,
  PindebitAuthorizationClearing: TransactionModelTypeEnum.PindebitAuthorizationClearing,
  PindebitAuthorizationReversal: TransactionModelTypeEnum.PindebitAuthorizationReversal,
  PindebitAuthorizationReversalIssuerexpiration: TransactionModelTypeEnum.PindebitAuthorizationReversalIssuerexpiration,
} as const;
export type DebitTransactionTypeEnumValues = (typeof DebitTransactionTypeEnum)[keyof typeof DebitTransactionTypeEnum];

export const DepositTransactionTypeEnum = {
  AchCancel: TransactionModelTypeEnum.AchCancel,
  AchPull: TransactionModelTypeEnum.AchPull,
  AchPullPending: TransactionModelTypeEnum.AchPullPending,
  AchPullReturned: TransactionModelTypeEnum.AchPullReturned,
  AchPush: TransactionModelTypeEnum.AchPush,
  AchPushPending: TransactionModelTypeEnum.AchPushPending,
  AchPushReturned: TransactionModelTypeEnum.AchPushReturned,
  DirectdepositCredit: TransactionModelTypeEnum.DirectdepositCredit,
  DirectdepositCreditPending: TransactionModelTypeEnum.DirectdepositCreditPending,
  DirectdepositCreditReject: TransactionModelTypeEnum.DirectdepositCreditReject,
  DirectdepositCreditReversal: TransactionModelTypeEnum.DirectdepositCreditReversal,
  DirectdepositDebit: TransactionModelTypeEnum.DirectdepositDebit,
  DirectdepositDebitPending: TransactionModelTypeEnum.DirectdepositDebitPending,
  DirectdepositDebitReject: TransactionModelTypeEnum.DirectdepositDebitReject,
  DirectdepositDebitReversal: TransactionModelTypeEnum.DirectdepositDebitReversal,
} as const;
export type DepositTransactionTypeEnumValues = (typeof DepositTransactionTypeEnum)[keyof typeof DepositTransactionTypeEnum];
