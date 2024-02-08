export enum MarqetaKYCCode {
  AddressIssue = 'AddressIssue',
  DateOfBirthIssue = 'DateOfBirthIssue',
  EmailIssue = 'EmailIssue',
  NameIssue = 'NameIssue',
  NoRecordFound = 'NoRecordFound',
  OFAC = 'OFAC',
  PhoneIssue = 'PhoneIssue',
  RiskIssue = 'RiskIssue',
  SSNIssue = 'SSNIssue',
  SSNFail = 'SSNFail',
  Approved = 'Approved',
}

export enum MarqetaKYCStatus {
  FAILURE = 'FAILURE',
  SUCCESS = 'SUCCESS',
  PENDING = 'PENDING',
}

export interface IMarqetaKYCResult {
  status: string;
  codes: MarqetaKYCCode;
}

export interface IMarqetaListKYCData {
  create_time: string;
  last_modified_time: string;
  token: string;
  user_token: string;
  result: IMarqetaKYCResult[];
  manual_override: boolean;
  referenceid: string;
}

export interface IMarqetaListKYCResponse {
  count: number;
  start_index: number;
  end_index: number;
  is_more: boolean;
  data: IMarqetaListKYCData[] | [];
}

export const AccountFundingTransactionTypeEnum = {
  AccountToAccount: 'ACCOUNT_TO_ACCOUNT',
  PersonToPerson: 'PERSON_TO_PERSON',
  WalletTransfer: 'WALLET_TRANSFER',
  MoneyTransferByBank: 'MONEY_TRANSFER_BY_BANK',
  BusinessToBusiness: 'BUSINESS_TO_BUSINESS',
  Disbursement: 'DISBURSEMENT',
  GovernmentDisbursement: 'GOVERNMENT_DISBURSEMENT',
  GamblingPayout: 'GAMBLING_PAYOUT',
  Loyalty: 'LOYALTY',
  MerchantDisbursement: 'MERCHANT_DISBURSEMENT',
  OnlineGamblingPayout: 'ONLINE_GAMBLING_PAYOUT',
  PensionDisbursement: 'PENSION_DISBURSEMENT',
  PrepaidLoads: 'PREPAID_LOADS',
  CardBillPayment: 'CARD_BILL_PAYMENT',
  BillPayment: 'BILL_PAYMENT',
  CashClaim: 'CASH_CLAIM',
  CashIn: 'CASH_IN',
  CashOut: 'CASH_OUT',
  MobileAirTimePayment: 'MOBILE_AIR_TIME_PAYMENT',
  MoneyTransferByMerchant: 'MONEY_TRANSFER_BY_MERCHANT',
  FaceToFaceMerchantPayment: 'FACE_TO_FACE_MERCHANT_PAYMENT',
  GovernmentPayment: 'GOVERNMENT_PAYMENT',
  PaymentsGoodsServices: 'PAYMENTS_GOODS_SERVICES',
  FundsTransfer: 'FUNDS_TRANSFER',
  GeneralBusinessToBusinessTransfer: 'GENERAL_BUSINESS_TO_BUSINESS_TRANSFER',
  BusinessToBusinessTransfer: 'BUSINESS_TO_BUSINESS_TRANSFER',
  CashDeposit: 'CASH_DEPOSIT',
  PurchaseRepayment: 'PURCHASE_REPAYMENT',
} as const;
export type AccountFundingTransactionTypeEnumValues = typeof AccountFundingTransactionTypeEnum[keyof typeof AccountFundingTransactionTypeEnum];

export const AccountFundingFundingSourceEnum = {
  Credit: 'CREDIT',
  Debit: 'DEBIT',
  Prepaid: 'PREPAID',
  DepositAccount: 'DEPOSIT_ACCOUNT',
  Cash: 'CASH',
  MobileMoneyAccount: 'MOBILE_MONEY_ACCOUNT',
  NonVisaCredit: 'NON_VISA_CREDIT',
  Check: 'CHECK',
  Ach: 'ACH',
} as const;
export type AccountFundingFundingSourceEnumValues = typeof AccountFundingFundingSourceEnum[keyof typeof AccountFundingFundingSourceEnum];

export const AccountFundingReceiverAccountTypeEnum = {
  Other: 'OTHER',
  RtnBankAccount: 'RTN_BANK_ACCOUNT',
  Iban: 'IBAN',
  CardAccount: 'CARD_ACCOUNT',
  Email: 'EMAIL',
  PhoneNumber: 'PHONE_NUMBER',
  BankAccountNumberAndBankIdentificationCode: 'BANK_ACCOUNT_NUMBER_AND_BANK_IDENTIFICATION_CODE',
  WalletId: 'WALLET_ID',
  SocialNetworkId: 'SOCIAL_NETWORK_ID',
} as const;
export type AccountFundingReceiverAccountTypeEnumValues = typeof AccountFundingReceiverAccountTypeEnum[keyof typeof AccountFundingReceiverAccountTypeEnum];

export const OriginalCreditTransactionTypeEnum = {
  AccountToAccount: 'account_to_account',
  PersonToPerson: 'person_to_person',
  WalletTransfer: 'wallet_transfer',
  MoneyTransferByBank: 'money_transfer_by_bank',
  BusinessToBusiness: 'business_to_business',
  Disbursement: 'disbursement',
  GovernmentDisbursement: 'government_disbursement',
  GamblingPayout: 'gambling_payout',
  Loyalty: 'loyalty',
  MerchantDisbursement: 'merchant_disbursement',
  OnlineGamblingPayout: 'online_gambling_payout',
  PensionDisbursement: 'pension_disbursement',
  PrepaidLoads: 'prepaid_loads',
  CardBillPayment: 'card_bill_payment',
  BillPayment: 'bill_payment',
  CashClaim: 'cash_claim',
  CashIn: 'cash_in',
  CashOut: 'cash_out',
  MobileAirTimePayment: 'mobile_air_time_payment',
  MoneyTransferByMerchant: 'money_transfer_by_merchant',
  FaceToFaceMerchantPayment: 'face_to_face_merchant_payment',
  GovernmentPayment: 'government_payment',
  PaymentsGoodsServices: 'payments_goods_services',
  FundsTransfer: 'funds_transfer',
  GeneralBusinessToBusinessTransfer: 'general_business_to_business_transfer',
  BusinessToBusinessTransfer: 'business_to_business_transfer',
  CashDeposit: 'cash_deposit',
  PurchaseRepayment: 'purchase_repayment',
} as const;
export type OriginalCreditTransactionTypeEnumValues = typeof OriginalCreditTransactionTypeEnum[keyof typeof OriginalCreditTransactionTypeEnum];

export const OriginalCreditFundingSourceEnum = {
  Credit: 'CREDIT',
  Debit: 'DEBIT',
  Prepaid: 'PREPAID',
  DepositAccount: 'DEPOSIT_ACCOUNT',
  Cash: 'CASH',
  MobileMoneyAccount: 'MOBILE_MONEY_ACCOUNT',
  NonVisaCredit: 'NON_VISA_CREDIT',
  Check: 'CHECK',
  Ach: 'ACH',
} as const;
export type OriginalCreditFundingSourceEnumValues = typeof OriginalCreditFundingSourceEnum[keyof typeof OriginalCreditFundingSourceEnum];

export const OriginalCreditSenderAccountTypeEnum = {
  Other: 'OTHER',
  RtnBankAccount: 'RTN_BANK_ACCOUNT',
  Iban: 'IBAN',
  CardAccount: 'CARD_ACCOUNT',
  Email: 'EMAIL',
  PhoneNumber: 'PHONE_NUMBER',
  BankAccountNumberAndBankIdentificationCode: 'BANK_ACCOUNT_NUMBER_AND_BANK_IDENTIFICATION_CODE',
  WalletId: 'WALLET_ID',
  SocialNetworkId: 'SOCIAL_NETWORK_ID',
} as const;
export type OriginalCreditSenderAccountTypeEnumValues = typeof OriginalCreditSenderAccountTypeEnum[keyof typeof OriginalCreditSenderAccountTypeEnum];

export const OriginalCreditDeferredHoldByEnum = {
  Absent: 'absent',
  Visa: 'visa',
  Originator: 'originator',
} as const;
export type OriginalCreditDeferredHoldByEnumValues = typeof OriginalCreditDeferredHoldByEnum[keyof typeof OriginalCreditDeferredHoldByEnum];

export const TransitTransactionTypeEnum = {
  PreFunded: 'PRE_FUNDED',
  RealTimeAuthorized: 'REAL_TIME_AUTHORIZED',
  PostAuthorizedAggregated: 'POST_AUTHORIZED_AGGREGATED',
  AuthorizedAggregatedSplitClearing: 'AUTHORIZED_AGGREGATED_SPLIT_CLEARING',
  Other: 'OTHER',
  DebitRecovery: 'DEBIT_RECOVERY',
} as const;
export type TransitTransactionTypeEnumValues = typeof TransitTransactionTypeEnum[keyof typeof TransitTransactionTypeEnum];

export const TransitTransportationModeEnum = {
  Bus: 'BUS',
  Train: 'TRAIN',
  WaterBorneVehicle: 'WATER_BORNE_VEHICLE',
  Toll: 'TOLL',
  Parking: 'PARKING',
  Taxi: 'TAXI',
  ParaTransit: 'PARA_TRANSIT',
  SelfDriveVehicle: 'SELF_DRIVE_VEHICLE',
  Coach: 'COACH',
  Locomotive: 'LOCOMOTIVE',
  PoweredMotorVehicle: 'POWERED_MOTOR_VEHICLE',
  Trailer: 'TRAILER',
  InterCity: 'INTER_CITY',
  CableCar: 'CABLE_CAR',
} as const;
export type TransitTransportationModeEnumValues = typeof TransitTransportationModeEnum[keyof typeof TransitTransportationModeEnum];

export const TransactionMetadataTransactionCategoryEnum = {
  RetailSale: 'RETAIL_SALE',
  BillPay: 'BILL_PAY',
  Hotel: 'HOTEL',
  HealthCare: 'HEALTH_CARE',
  Restaurant: 'RESTAURANT',
  AutoRental: 'AUTO_RENTAL',
  Airline: 'AIRLINE',
  Payment: 'PAYMENT',
  HospitalizationCollege: 'HOSPITALIZATION_COLLEGE',
  PhoneMailEcommerce: 'PHONE_MAIL_ECOMMERCE',
  Atm: 'ATM',
  Transit: 'TRANSIT',
} as const;
export type TransactionMetadataTransactionCategoryEnumValues = typeof TransactionMetadataTransactionCategoryEnum[keyof typeof TransactionMetadataTransactionCategoryEnum];

export const TransactionMetadataPaymentChannelEnum = {
  Other: 'OTHER',
  Atm: 'ATM',
  Ecommerce: 'ECOMMERCE',
  Mail: 'MAIL',
  Phone: 'PHONE',
  Moto: 'MOTO',
} as const;
export type TransactionMetadataPaymentChannelEnumValues = typeof TransactionMetadataPaymentChannelEnum[keyof typeof TransactionMetadataPaymentChannelEnum];

export const TransactionMetadataMotoIndicatorEnum = {
  Unknown: 'UNKNOWN',
  Manual: 'MANUAL',
  Recurring: 'RECURRING',
  Installment: 'INSTALLMENT',
  Others: 'OTHERS',
} as const;
export type TransactionMetadataMotoIndicatorEnumValues = typeof TransactionMetadataMotoIndicatorEnum[keyof typeof TransactionMetadataMotoIndicatorEnum];

export const CardSecurityCodeVerificationTypeEnum = {
  Cvv1: 'CVV1',
  Cvv2: 'CVV2',
  Icvv: 'ICVV',
  Dcvv: 'DCVV',
} as const;
export type CardSecurityCodeVerificationTypeEnumValues = typeof CardSecurityCodeVerificationTypeEnum[keyof typeof CardSecurityCodeVerificationTypeEnum];

export const PosPanEntryModeEnum = {
  Unknown: 'UNKNOWN',
  Manual: 'MANUAL',
  MagStripe: 'MAG_STRIPE',
  MagStripeContactless: 'MAG_STRIPE_CONTACTLESS',
  BarCode: 'BAR_CODE',
  Ocr: 'OCR',
  Micr: 'MICR',
  Chip: 'CHIP',
  ChipContactless: 'CHIP_CONTACTLESS',
  CardOnFile: 'CARD_ON_FILE',
  ChipFallback: 'CHIP_FALLBACK',
  Other: 'OTHER',
} as const;
export type PosPanEntryModeEnumValues = typeof PosPanEntryModeEnum[keyof typeof PosPanEntryModeEnum];

export const PosPinEntryModeEnum = {
  Unknown: 'UNKNOWN',
  True: 'TRUE',
  False: 'FALSE',
  Defective: 'DEFECTIVE',
} as const;
export type PosPinEntryModeEnumValues = typeof PosPinEntryModeEnum[keyof typeof PosPinEntryModeEnum];

export const PosTerminalAttendanceEnum = {
  Unspecified: 'UNSPECIFIED',
  Attended: 'ATTENDED',
  Unattended: 'UNATTENDED',
  NoTerminal: 'NO_TERMINAL',
} as const;
export type PosTerminalAttendanceEnumValues = typeof PosTerminalAttendanceEnum[keyof typeof PosTerminalAttendanceEnum];

export const PosTerminalLocationEnum = {
  OnPremise: 'ON_PREMISE',
  OffPremiseMerchant: 'OFF_PREMISE_MERCHANT',
  OffPremiseCardholder: 'OFF_PREMISE_CARDHOLDER',
  NoTerminal: 'NO_TERMINAL',
} as const;
export type PosTerminalLocationEnumValues = typeof PosTerminalLocationEnum[keyof typeof PosTerminalLocationEnum];

export const PosCardholderAuthenticationMethodEnum = {
  Unspecified: 'UNSPECIFIED',
  NonAuthenticated: 'NON_AUTHENTICATED',
  Signature: 'SIGNATURE',
  Pin: 'PIN',
  IdVerified: 'ID_VERIFIED',
} as const;
export type PosCardholderAuthenticationMethodEnumValues = typeof PosCardholderAuthenticationMethodEnum[keyof typeof PosCardholderAuthenticationMethodEnum];

export const PosTerminalTypeEnum = {
  AutoDispenserWithPin: 'AUTO_DISPENSER_WITH_PIN',
  SelfService: 'SELF_SERVICE',
  LimitedAmount: 'LIMITED_AMOUNT',
  InFlight: 'IN_FLIGHT',
  Ecommerce: 'ECOMMERCE',
  Transponder: 'TRANSPONDER',
} as const;
export type PosTerminalTypeEnumValues = typeof PosTerminalTypeEnum[keyof typeof PosTerminalTypeEnum];

export const PosCardDataInputCapabilityEnum = {
  Unknown: 'UNKNOWN',
  NoTerminal: 'NO_TERMINAL',
  MagStripe: 'MAG_STRIPE',
  MagStripeContactless: 'MAG_STRIPE_CONTACTLESS',
  MagStripeKeyEntry: 'MAG_STRIPE_KEY_ENTRY',
  Chip: 'CHIP',
  ChipContactless: 'CHIP_CONTACTLESS',
  ChipMagStripe: 'CHIP_MAG_STRIPE',
  ChipMagStripeKeyEntry: 'CHIP_MAG_STRIPE_KEY_ENTRY',
  KeyEntry: 'KEY_ENTRY',
  Ocr: 'OCR',
  Micr: 'MICR',
  BarCode: 'BAR_CODE',
} as const;
export type PosCardDataInputCapabilityEnumValues = typeof PosCardDataInputCapabilityEnum[keyof typeof PosCardDataInputCapabilityEnum];

export const PosSpecialConditionIndicatorEnum = {
  Unspecified: 'UNSPECIFIED',
  CryptocurrencyPurchase: 'CRYPTOCURRENCY_PURCHASE',
  QuasiCash: 'QUASI_CASH',
  DebtPayment: 'DEBT_PAYMENT',
} as const;
export type PosSpecialConditionIndicatorEnumValues = typeof PosSpecialConditionIndicatorEnum[keyof typeof PosSpecialConditionIndicatorEnum];

export const IdentificationResponseModelTypeEnum = {
  Ssn: 'SSN',
  Tin: 'TIN',
  Sin: 'SIN',
  Nin: 'NIN',
  PassportNumber: 'PASSPORT_NUMBER',
  DriversLicense: 'DRIVERS_LICENSE',
  BusinessNumber: 'BUSINESS_NUMBER',
  BusinessTaxId: 'BUSINESS_TAX_ID',
  TaxpayerReference: 'TAXPAYER_REFERENCE',
} as const;
export type IdentificationResponseModelTypeEnumValues = typeof IdentificationResponseModelTypeEnum[keyof typeof IdentificationResponseModelTypeEnum];

export const UserCardHolderResponseStatusEnum = {
  Unverified: 'UNVERIFIED',
  Limited: 'LIMITED',
  Active: 'ACTIVE',
  Suspended: 'SUSPENDED',
  Closed: 'CLOSED',
} as const;
export type UserCardHolderResponseStatusEnumValues = typeof UserCardHolderResponseStatusEnum[keyof typeof UserCardHolderResponseStatusEnum];

export const UserCardHolderResponseGenderEnum = {
  F: 'F',
  M: 'M',
} as const;
export type UserCardHolderResponseGenderEnumValues = typeof UserCardHolderResponseGenderEnum[keyof typeof UserCardHolderResponseGenderEnum];

export const AuthenticationLastPasswordUpdateChannelEnum = {
  Change: 'USER_CHANGE',
  Reset: 'USER_RESET',
} as const;
export type AuthenticationLastPasswordUpdateChannelEnumValues = typeof AuthenticationLastPasswordUpdateChannelEnum[keyof typeof AuthenticationLastPasswordUpdateChannelEnum];

export const NetworkFeeModelTypeEnum = {
  IssuerFee: 'ISSUER_FEE',
  SwitchFee: 'SWITCH_FEE',
  PindebitAssocFee: 'PINDEBIT_ASSOC_FEE',
  AcquirerFee: 'ACQUIRER_FEE',
  InterchangeFee: 'INTERCHANGE_FEE',
  CurConvCardholderFee: 'CUR_CONV_CARDHOLDER_FEE',
  CurConvIssuerFee: 'CUR_CONV_ISSUER_FEE',
  CrossBorderIssuerFee: 'CROSS_BORDER_ISSUER_FEE',
} as const;
export type NetworkFeeModelTypeEnumValues = typeof NetworkFeeModelTypeEnum[keyof typeof NetworkFeeModelTypeEnum];

export const NetworkFeeModelCreditDebitEnum = {
  C: 'C',
  D: 'D',
} as const;
export type NetworkFeeModelCreditDebitEnumValues = typeof NetworkFeeModelCreditDebitEnum[keyof typeof NetworkFeeModelCreditDebitEnum];

export const ChargebackResponseStateEnum = {
  Initiated: 'INITIATED',
  Representment: 'REPRESENTMENT',
  Prearbitration: 'PREARBITRATION',
  Arbitration: 'ARBITRATION',
  CaseWon: 'CASE_WON',
  CaseLost: 'CASE_LOST',
  NetworkRejected: 'NETWORK_REJECTED',
  Withdrawn: 'WITHDRAWN',
} as const;
export type ChargebackResponseStateEnumValues = typeof ChargebackResponseStateEnum[keyof typeof ChargebackResponseStateEnum];

export const ChargebackResponseChannelEnum = {
  Gateway: 'GATEWAY',
  GatewayAutomated: 'GATEWAY_AUTOMATED',
  Issuer: 'ISSUER',
  IssuerAutomated: 'ISSUER_AUTOMATED',
} as const;
export type ChargebackResponseChannelEnumValues = typeof ChargebackResponseChannelEnum[keyof typeof ChargebackResponseChannelEnum];

export const ChargebackResponseNetworkEnum = {
  Marqeta: 'MARQETA',
  Discover: 'DISCOVER',
  Mastercard: 'MASTERCARD',
  Pulse: 'PULSE',
  Visa: 'VISA',
} as const;
export type ChargebackResponseNetworkEnumValues = typeof ChargebackResponseNetworkEnum[keyof typeof ChargebackResponseNetworkEnum];

export const ChargebackResponseReasonDescriptionEnum = {
  ServiceNotProvidedMerchandiseNotReceived: 'SERVICE_NOT_PROVIDED_MERCHANDISE_NOT_RECEIVED',
  CancelledRecurringTransaction: 'CANCELLED_RECURRING_TRANSACTION',
  NotAsDescribedOrDefectiveMerchandise: 'NOT_AS_DESCRIBED_OR_DEFECTIVE_MERCHANDISE',
  FraudMultipleTransactions: 'FRAUD_MULTIPLE_TRANSACTIONS',
  FraudTransaction: 'FRAUD_TRANSACTION',
  NoAuthorization: 'NO_AUTHORIZATION',
  LatePresentment: 'LATE_PRESENTMENT',
  TransactionNotRecognized: 'TRANSACTION_NOT_RECOGNIZED',
  IncorrectCurrencyOrTransactionCode: 'INCORRECT_CURRENCY_OR_TRANSACTION_CODE',
  IncorrectTransactionAmountOrAccountNumber: 'INCORRECT_TRANSACTION_AMOUNT_OR_ACCOUNT_NUMBER',
  NotAuthorizedCardPresent: 'NOT_AUTHORIZED_CARD_PRESENT',
  NotAuthorizedCardAbsent: 'NOT_AUTHORIZED_CARD_ABSENT',
  CreditNotProcessed: 'CREDIT_NOT_PROCESSED',
  NonReceiptOfCashOrLoadTransactionValueAtAtm: 'NON_RECEIPT_OF_CASH_OR_LOAD_TRANSACTION_VALUE_AT_ATM',
} as const;
export type ChargebackResponseReasonDescriptionEnumValues = typeof ChargebackResponseReasonDescriptionEnum[keyof typeof ChargebackResponseReasonDescriptionEnum];

export const CardFulfillmentResponseCardFulfillmentReasonEnum = {
  New: 'NEW',
  LostStolen: 'LOST_STOLEN',
  Expired: 'EXPIRED',
} as const;
export type CardFulfillmentResponseCardFulfillmentReasonEnumValues = typeof CardFulfillmentResponseCardFulfillmentReasonEnum[keyof typeof CardFulfillmentResponseCardFulfillmentReasonEnum];

export const TerminalModelSpecialConditionIndicatorEnum = {
  Unspecified: 'UNSPECIFIED',
  CryptocurrencyPurchase: 'CRYPTOCURRENCY_PURCHASE',
  QuasiCash: 'QUASI_CASH',
  DebtPayment: 'DEBT_PAYMENT',
} as const;
export type TerminalModelSpecialConditionIndicatorEnumValues = typeof TerminalModelSpecialConditionIndicatorEnum[keyof typeof TerminalModelSpecialConditionIndicatorEnum];

export const CardPersonalizationPersoTypeEnum = {
  Emboss: 'EMBOSS',
  Laser: 'LASER',
  Flat: 'FLAT',
} as const;
export type CardPersonalizationPersoTypeEnumValues = typeof CardPersonalizationPersoTypeEnum[keyof typeof CardPersonalizationPersoTypeEnum];

export const TransactionModelTypeEnum = {
  AccountCredit: 'account.credit',
  AccountDebit: 'account.debit',
  AccountFundingAuthorization: 'account.funding.authorization',
  AccountFundingAuthorizationClearing: 'account.funding.authorization.clearing',
  AccountFundingAuthorizationReversal: 'account.funding.authorization.reversal',
  AccountFundingAuthPlusCapture: 'account.funding.auth_plus_capture',
  AccountFundingAuthPlusCaptureReversal: 'account.funding.auth_plus_capture.reversal',
  AchCancel: 'ach.cancel',
  AchPull: 'ach.pull',
  AchPullPending: 'ach.pull.pending',
  AchPullReturned: 'ach.pull.returned',
  AchPush: 'ach.push',
  AchPushPending: 'ach.push.pending',
  AchPushReturned: 'ach.push.returned',
  Authorization: 'authorization',
  AuthorizationAdvice: 'authorization.advice',
  AuthorizationAtmWithdrawal: 'authorization.atm.withdrawal',
  AuthorizationCashback: 'authorization.cashback',
  AuthorizationClearing: 'authorization.clearing',
  AuthorizationClearingAtmWithdrawal: 'authorization.clearing.atm.withdrawal',
  AuthorizationClearingCashback: 'authorization.clearing.cashback',
  AuthorizationClearingChargeback: 'authorization.clearing.chargeback',
  AuthorizationClearingChargebackCompleted: 'authorization.clearing.chargeback.completed',
  AuthorizationClearingChargebackProvisionalCredit: 'authorization.clearing.chargeback.provisional.credit',
  AuthorizationClearingChargebackProvisionalDebit: 'authorization.clearing.chargeback.provisional.debit',
  AuthorizationClearingChargebackRepresentment: 'authorization.clearing.chargeback.representment',
  AuthorizationClearingChargebackReversal: 'authorization.clearing.chargeback.reversal',
  AuthorizationClearingChargebackWriteoff: 'authorization.clearing.chargeback.writeoff',
  AuthorizationClearingQuasiCash: 'authorization.clearing.quasi.cash',
  AuthorizationClearingRepresentment: 'authorization.clearing.representment',
  AuthorizationIncremental: 'authorization.incremental',
  AuthorizationQuasiCash: 'authorization.quasi.cash',
  AuthorizationReversal: 'authorization.reversal',
  AuthorizationReversalIssuerexpiration: 'authorization.reversal.issuerexpiration',
  AuthorizationStandin: 'authorization.standin',
  Balanceinquiry: 'balanceinquiry',
  CreditAdjustment: 'credit.adjustment',
  DebitAdjustment: 'debit.adjustment',
  DirectdepositCredit: 'directdeposit.credit',
  DirectdepositCreditPending: 'directdeposit.credit.pending',
  DirectdepositCreditPendingReversal: 'directdeposit.credit.pending.reversal',
  DirectdepositCreditReject: 'directdeposit.credit.reject',
  DirectdepositCreditReversal: 'directdeposit.credit.reversal',
  DirectdepositDebit: 'directdeposit.debit',
  DirectdepositDebitPending: 'directdeposit.debit.pending',
  DirectdepositDebitPendingReversal: 'directdeposit.debit.pending.reversal',
  DirectdepositDebitReject: 'directdeposit.debit.reject',
  DirectdepositDebitReversal: 'directdeposit.debit.reversal',
  DisputeCredit: 'dispute.credit',
  DisputeDebit: 'dispute.debit',
  FeeCharge: 'fee.charge',
  FeeChargePending: 'fee.charge.pending',
  FeeChargeRefund: 'fee.charge.refund',
  FeeChargeReversal: 'fee.charge.reversal',
  FundsExpire: 'funds.expire',
  GpaCredit: 'gpa.credit',
  GpaCreditAuthorization: 'gpa.credit.authorization',
  GpaCreditAuthorizationBillpayment: 'gpa.credit.authorization.billpayment',
  GpaCreditAuthorizationBillpaymentReversal: 'gpa.credit.authorization.billpayment.reversal',
  GpaCreditAuthorizationReversal: 'gpa.credit.authorization.reversal',
  GpaCreditBillpayment: 'gpa.credit.billpayment',
  GpaCreditChargeback: 'gpa.credit.chargeback',
  GpaCreditChargebackReversal: 'gpa.credit.chargeback.reversal',
  GpaCreditIssueroperator: 'gpa.credit.issueroperator',
  GpaCreditNetworkload: 'gpa.credit.networkload',
  GpaCreditNetworkloadReversal: 'gpa.credit.networkload.reversal',
  GpaCreditPending: 'gpa.credit.pending',
  GpaCreditPendingReversal: 'gpa.credit.pending.reversal',
  GpaCreditReversal: 'gpa.credit.reversal',
  GpaDebit: 'gpa.debit',
  GpaDebitAuthorization: 'gpa.debit.authorization',
  GpaDebitIssueroperator: 'gpa.debit.issueroperator',
  GpaDebitNetworkload: 'gpa.debit.networkload',
  GpaDebitPending: 'gpa.debit.pending',
  GpaDebitPendingReversal: 'gpa.debit.pending.reversal',
  GpaDebitReversal: 'gpa.debit.reversal',
  GpaGrant: 'gpa.grant',
  MsaCredit: 'msa.credit',
  MsaCreditChargeback: 'msa.credit.chargeback',
  MsaCreditChargebackReversal: 'msa.credit.chargeback.reversal',
  MsaCreditPending: 'msa.credit.pending',
  MsaCreditPendingReversal: 'msa.credit.pending.reversal',
  MsaCreditReversal: 'msa.credit.reversal',
  MsaDebit: 'msa.debit',
  MsaDebitPending: 'msa.debit.pending',
  MsaDebitPendingReversal: 'msa.debit.pending.reversal',
  OriginalCreditAuthorization: 'original.credit.authorization',
  OriginalCreditAuthorizationClearing: 'original.credit.authorization.clearing',
  OriginalCreditAuthorizationReversal: 'original.credit.authorization.reversal',
  OriginalCreditAuthPlusCapture: 'original.credit.auth_plus_capture',
  OriginalCreditAuthPlusCaptureReversal: 'original.credit.auth_plus_capture.reversal',
  Pindebit: 'pindebit',
  PindebitAtmWithdrawal: 'pindebit.atm.withdrawal',
  PindebitAuthorization: 'pindebit.authorization',
  PindebitAuthorizationClearing: 'pindebit.authorization.clearing',
  PindebitAuthorizationReversal: 'pindebit.authorization.reversal',
  PindebitAuthorizationReversalIssuerexpiration: 'pindebit.authorization.reversal.issuerexpiration',
  PindebitBalanceinquiry: 'pindebit.balanceinquiry',
  PindebitCashback: 'pindebit.cashback',
  PindebitChargeback: 'pindebit.chargeback',
  PindebitChargebackCompleted: 'pindebit.chargeback.completed',
  PindebitChargebackProvisionalCredit: 'pindebit.chargeback.provisional.credit',
  PindebitChargebackProvisionalDebit: 'pindebit.chargeback.provisional.debit',
  PindebitChargebackReversal: 'pindebit.chargeback.reversal',
  PindebitChargebackWriteoff: 'pindebit.chargeback.writeoff',
  PindebitCreditAdjustment: 'pindebit.credit.adjustment',
  PindebitQuasiCash: 'pindebit.quasi.cash',
  PindebitQuasicash: 'pindebit.quasicash',
  PindebitRefund: 'pindebit.refund',
  PindebitRefundReversal: 'pindebit.refund.reversal',
  PindebitReversal: 'pindebit.reversal',
  PindebitTransfer: 'pindebit.transfer',
  ProgramreserveCredit: 'programreserve.credit',
  ProgramreserveDebit: 'programreserve.debit',
  PushtocardDebit: 'pushtocard.debit',
  PushtocardReversal: 'pushtocard.reversal',
  Refund: 'refund',
  RefundAuthorization: 'refund.authorization',
  RefundAuthorizationAdvice: 'refund.authorization.advice',
  RefundAuthorizationClearing: 'refund.authorization.clearing',
  RefundAuthorizationReversal: 'refund.authorization.reversal',
  RewardEarn: 'reward.earn',
  TokenActivationRequest: 'token.activation-request',
  TokenAdvice: 'token.advice',
  TransferFee: 'transfer.fee',
  TransferPeer: 'transfer.peer',
  TransferProgram: 'transfer.program',
  Unknown: 'unknown',
} as const;
export type TransactionModelTypeEnumValues = typeof TransactionModelTypeEnum[keyof typeof TransactionModelTypeEnum];

export const TransactionModelStateEnum = {
  Pending: 'PENDING',
  Completion: 'COMPLETION',
  Declined: 'DECLINED',
  Error: 'ERROR',
} as const;
export type TransactionModelStateEnumValues = typeof TransactionModelStateEnum[keyof typeof TransactionModelStateEnum];

export const JitFundingApiMethodEnum = {
  Authorization: 'pgfs.authorization',
  Balanceinquiry: 'pgfs.balanceinquiry',
  AuthorizationIncremental: 'pgfs.authorization.incremental',
  AuthorizationCapture: 'pgfs.authorization.capture',
  AuthorizationReversal: 'pgfs.authorization.reversal',
  AuthPlusCapture: 'pgfs.auth_plus_capture',
  Refund: 'pgfs.refund',
  ForceCapture: 'pgfs.force_capture',
  AuthorizationCaptureChargeback: 'pgfs.authorization.capture.chargeback',
  AuthorizationCaptureChargebackReversal: 'pgfs.authorization.capture.chargeback.reversal',
  PindebitChargeback: 'pgfs.pindebit.chargeback',
  PindebitChargebackReversal: 'pgfs.pindebit.chargeback.reversal',
  DisputeCredit: 'pgfs.dispute.credit',
  DisputeDebit: 'pgfs.dispute.debit',
  DirectdepositCredit: 'pgfs.directdeposit.credit',
  DirectdepositDebit: 'pgfs.directdeposit.debit',
  DirectdepositCreditReversal: 'pgfs.directdeposit.credit.reversal',
  DirectdepositDebitReversal: 'pgfs.directdeposit.debit.reversal',
  AdjustmentCredit: 'pgfs.adjustment.credit',
  AdjustmentDebit: 'pgfs.adjustment.debit',
  AuthPlusCaptureStandin: 'pgfs.auth_plus_capture.standin',
  AuthorizationStandin: 'pgfs.authorization.standin',
  NetworkLoad: 'pgfs.network.load',
  OriginalCreditAuthorization: 'pgfs.original.credit.authorization',
  OriginalCreditAuthPlusCapture: 'pgfs.original.credit.auth_plus_capture',
  RefundAuthorization: 'pgfs.refund.authorization',
  RefundAuthorizationReversal: 'pgfs.refund.authorization.reversal',
  OriginalCreditAuthorizationClearing: 'pgfs.original.credit.authorization.clearing',
  Billpayment: 'pgfs.billpayment',
  BillpaymentCapture: 'pgfs.billpayment.capture',
  BillpaymentReversal: 'pgfs.billpayment.reversal',
  AuthorizationAccountVerification: 'pgfs.authorization.account_verification',
} as const;
export type JitFundingApiMethodEnumValues = typeof JitFundingApiMethodEnum[keyof typeof JitFundingApiMethodEnum];

export const JitFundingApiDeclineReasonEnum = {
  InvalidAmount: 'INVALID_AMOUNT',
  InsufficientFunds: 'INSUFFICIENT_FUNDS',
  TransactionNotPermitted: 'TRANSACTION_NOT_PERMITTED',
  SuspectedFraud: 'SUSPECTED_FRAUD',
  AmountLimitExceeded: 'AMOUNT_LIMIT_EXCEEDED',
  TransactionCountLimitExceeded: 'TRANSACTION_COUNT_LIMIT_EXCEEDED',
  DuplicateTransaction: 'DUPLICATE_TRANSACTION',
  InvalidMerchant: 'INVALID_MERCHANT',
  InvalidCard: 'INVALID_CARD',
  NoCreditAccount: 'NO_CREDIT_ACCOUNT',
  ExpiredCard: 'EXPIRED_CARD',
  NoCheckingAccount: 'NO_CHECKING_ACCOUNT',
  NoSavingsAccount: 'NO_SAVINGS_ACCOUNT',
  StopPayment: 'STOP_PAYMENT',
  RevocationAuthorizationOrder: 'REVOCATION_AUTHORIZATION_ORDER',
  RevocationAllAuthorizationOrder: 'REVOCATION_ALL_AUTHORIZATION_ORDER',
  SoftDeclineAuthenticationRequired: 'SOFT_DECLINE_AUTHENTICATION_REQUIRED',
  ClosedAccount: 'CLOSED_ACCOUNT',
  SoftDeclinePinRequired: 'SOFT_DECLINE_PIN_REQUIRED',
  CardNotActive: 'CARD_NOT_ACTIVE',
  CardholderNotActive: 'CARDHOLDER_NOT_ACTIVE',
} as const;
export type JitFundingApiDeclineReasonEnumValues = typeof JitFundingApiDeclineReasonEnum[keyof typeof JitFundingApiDeclineReasonEnum];

export const TransactionModelPolarityEnum = {
  Credit: 'CREDIT',
  Debit: 'DEBIT',
  PendingCredit: 'PENDING_CREDIT',
  PendingDebit: 'PENDING_DEBIT',
} as const;
export type TransactionModelPolarityEnumValues = typeof TransactionModelPolarityEnum[keyof typeof TransactionModelPolarityEnum];

export const DepositDepositResponseTypeEnum = {
  Credit: 'CREDIT',
  Debit: 'DEBIT',
} as const;
export type DepositDepositResponseTypeEnumValues = typeof DepositDepositResponseTypeEnum[keyof typeof DepositDepositResponseTypeEnum];

export const DepositDepositResponseStateEnum = {
  Pending: 'PENDING',
  Applied: 'APPLIED',
  Reversed: 'REVERSED',
  Rejected: 'REJECTED',
} as const;
export type DepositDepositResponseStateEnumValues = typeof DepositDepositResponseStateEnum[keyof typeof DepositDepositResponseStateEnum];

export const CardResponseStateEnum = {
  Active: 'ACTIVE',
  Suspended: 'SUSPENDED',
  Terminated: 'TERMINATED',
  Unsupported: 'UNSUPPORTED',
  Unactivated: 'UNACTIVATED',
  Limited: 'LIMITED',
} as const;
export type CardResponseStateEnumValues = typeof CardResponseStateEnum[keyof typeof CardResponseStateEnum];

export const CardResponseFulfillmentStatusEnum = {
  Issued: 'ISSUED',
  Ordered: 'ORDERED',
  Reordered: 'REORDERED',
  Rejected: 'REJECTED',
  Shipped: 'SHIPPED',
  Delivered: 'DELIVERED',
  DigitallyPresented: 'DIGITALLY_PRESENTED',
} as const;
export type CardResponseFulfillmentStatusEnumValues = typeof CardResponseFulfillmentStatusEnum[keyof typeof CardResponseFulfillmentStatusEnum];

export const CardResponseInstrumentTypeEnum = {
  PhysicalMsr: 'PHYSICAL_MSR',
  PhysicalIcc: 'PHYSICAL_ICC',
  PhysicalContactless: 'PHYSICAL_CONTACTLESS',
  PhysicalCombo: 'PHYSICAL_COMBO',
  VirtualPan: 'VIRTUAL_PAN',
} as const;
export type CardResponseInstrumentTypeEnumValues = typeof CardResponseInstrumentTypeEnum[keyof typeof CardResponseInstrumentTypeEnum];

export const TransactionModelIsaIndicatorEnum = {
  MultiCurrency: 'MULTI_CURRENCY',
  SingleCurrency: 'SINGLE_CURRENCY',
  RebateCancelled: 'REBATE_CANCELLED',
  MultiCurrencyNonUsCountries: 'MULTI_CURRENCY_NON_US_COUNTRIES',
  SingleCurrencyPaidByIssuer: 'SINGLE_CURRENCY_PAID_BY_ISSUER',
  NoChargeAssessed: 'NO_CHARGE_ASSESSED',
} as const;
export type TransactionModelIsaIndicatorEnumValues = typeof TransactionModelIsaIndicatorEnum[keyof typeof TransactionModelIsaIndicatorEnum];

export const ShippingInformationResponseMethodEnum = {
  LocalMail: 'LOCAL_MAIL',
  LocalMailPackage: 'LOCAL_MAIL_PACKAGE',
  Ground: 'GROUND',
  TwoDay: 'TWO_DAY',
  Overnight: 'OVERNIGHT',
  International: 'INTERNATIONAL',
  InternationalPriority: 'INTERNATIONAL_PRIORITY',
  LocalPriority: 'LOCAL_PRIORITY',
  FedexExpedited: 'FEDEX_EXPEDITED',
  FedexRegular: 'FEDEX_REGULAR',
  UpsExpedited: 'UPS_EXPEDITED',
  UpsRegular: 'UPS_REGULAR',
  UspsExpedited: 'USPS_EXPEDITED',
  UspsRegular: 'USPS_REGULAR',
} as const;
export type ShippingInformationResponseMethodEnumValues = typeof ShippingInformationResponseMethodEnum[keyof typeof ShippingInformationResponseMethodEnum];

/**
 *
 * @export
 * @interface ATCInformationModel
 */
export interface ATCInformationModel {
  /**
     *
     * @type {number}
     * @memberof ATCInformationModel
     */
  'atc_value'?: number;
  /**
     *
     * @type {number}
     * @memberof ATCInformationModel
     */
  'atc_discrepancy_value'?: number;
  /**
     *
     * @type {string}
     * @memberof ATCInformationModel
     */
  'atc_discrepancy_indicator'?: string;
}
/**
 *
 * @export
 * @interface OfferModel
 */
export interface OfferModel {
  /**
     *
     * @type {string}
     * @memberof OfferModel
     */
  'token'?: string;
  /**
     *
     * @type {boolean}
     * @memberof OfferModel
     */
  'active'?: boolean;
  /**
     *
     * @type {string}
     * @memberof OfferModel
     */
  'name': string;
  /**
     *
     * @type {string}
     * @memberof OfferModel
     */
  'start_date'?: string;
  /**
     *
     * @type {string}
     * @memberof OfferModel
     */
  'end_date'?: string;
  /**
     *
     * @type {number}
     * @memberof OfferModel
     */
  'purchase_amount': number;
  /**
     *
     * @type {number}
     * @memberof OfferModel
     */
  'reward_amount': number;
  /**
     *
     * @type {number}
     * @memberof OfferModel
     */
  'reward_trigger_amount'?: number;
  /**
     *
     * @type {string}
     * @memberof OfferModel
     */
  'campaign_token': string;
  /**
     *
     * @type {string}
     * @memberof OfferModel
     */
  'currency_code': string;
}
/**
 *
 * @export
 * @interface OfferOrderAggregatedBalances
 */
export interface OfferOrderAggregatedBalances {
  /**
     *
     * @type {string}
     * @memberof OfferOrderAggregatedBalances
     */
  'currency_code': string;
  /**
     *
     * @type {number}
     * @memberof OfferOrderAggregatedBalances
     */
  'ledger_balance': number;
  /**
     *
     * @type {number}
     * @memberof OfferOrderAggregatedBalances
     */
  'available_balance': number;
  /**
     *
     * @type {number}
     * @memberof OfferOrderAggregatedBalances
     */
  'credit_balance': number;
  /**
     *
     * @type {number}
     * @memberof OfferOrderAggregatedBalances
     */
  'cached_balance': number;
  /**
     *
     * @type {number}
     * @memberof OfferOrderAggregatedBalances
     */
  'pending_credits': number;
  /**
     *
     * @type {number}
     * @memberof OfferOrderAggregatedBalances
     */
  'impacted_amount'?: number;
  /**
     *
     * @type {{ [key: string]: OfferOrderAggregatedBalances; }}
     * @memberof OfferOrderAggregatedBalances
     */
  'balances': { [key: string]: OfferOrderAggregatedBalances; };
  /**
     *
     * @type {string}
     * @memberof OfferOrderAggregatedBalances
     */
  'last_updated_time': string;
}
/**
 *
 * @export
 * @interface OfferOrderBalances
 */
export interface OfferOrderBalances {
  /**
     *
     * @type {string}
     * @memberof OfferOrderBalances
     */
  'currency_code': string;
  /**
     *
     * @type {number}
     * @memberof OfferOrderBalances
     */
  'ledger_balance': number;
  /**
     *
     * @type {number}
     * @memberof OfferOrderBalances
     */
  'available_balance': number;
  /**
     *
     * @type {number}
     * @memberof OfferOrderBalances
     */
  'credit_balance': number;
  /**
     *
     * @type {number}
     * @memberof OfferOrderBalances
     */
  'cached_balance': number;
  /**
     *
     * @type {number}
     * @memberof OfferOrderBalances
     */
  'pending_credits': number;
  /**
     *
     * @type {number}
     * @memberof OfferOrderBalances
     */
  'impacted_amount'?: number;
  /**
     *
     * @type {{ [key: string]: OfferOrderBalances; }}
     * @memberof OfferOrderBalances
     */
  'balances': { [key: string]: OfferOrderBalances; };
  /**
     *
     * @type {string}
     * @memberof OfferOrderBalances
     */
  'last_updated_time': string;
}
/**
 *
 * @export
 * @interface MsaAggregatedBalances
 */
export interface MsaAggregatedBalances {
  /**
     *
     * @type {string}
     * @memberof MsaAggregatedBalances
     */
  'currency_code': string;
  /**
     *
     * @type {number}
     * @memberof MsaAggregatedBalances
     */
  'ledger_balance': number;
  /**
     *
     * @type {number}
     * @memberof MsaAggregatedBalances
     */
  'available_balance': number;
  /**
     *
     * @type {number}
     * @memberof MsaAggregatedBalances
     */
  'credit_balance': number;
  /**
     *
     * @type {number}
     * @memberof MsaAggregatedBalances
     */
  'cached_balance': number;
  /**
     *
     * @type {number}
     * @memberof MsaAggregatedBalances
     */
  'pending_credits': number;
  /**
     *
     * @type {number}
     * @memberof MsaAggregatedBalances
     */
  'impacted_amount'?: number;
  /**
     *
     * @type {{ [key: string]: MsaAggregatedBalances; }}
     * @memberof MsaAggregatedBalances
     */
  'balances': { [key: string]: MsaAggregatedBalances; };
  /**
     *
     * @type {string}
     * @memberof MsaAggregatedBalances
     */
  'last_updated_time': string;
}
/**
 *
 * @export
 * @interface MsaBalances
 */
export interface MsaBalances {
  /**
     *
     * @type {string}
     * @memberof MsaBalances
     */
  'currency_code': string;
  /**
     *
     * @type {number}
     * @memberof MsaBalances
     */
  'ledger_balance': number;
  /**
     *
     * @type {number}
     * @memberof MsaBalances
     */
  'available_balance': number;
  /**
     *
     * @type {number}
     * @memberof MsaBalances
     */
  'credit_balance': number;
  /**
     *
     * @type {number}
     * @memberof MsaBalances
     */
  'cached_balance': number;
  /**
     *
     * @type {number}
     * @memberof MsaBalances
     */
  'pending_credits': number;
  /**
     *
     * @type {number}
     * @memberof MsaBalances
     */
  'impacted_amount'?: number;
  /**
     *
     * @type {{ [key: string]: MsaBalances; }}
     * @memberof MsaBalances
     */
  'balances': { [key: string]: MsaBalances; };
  /**
     *
     * @type {string}
     * @memberof MsaBalances
     */
  'last_updated_time': string;
}

/**
 *
 * @export
 * @interface PeerTransferResponse
 */
export interface PeerTransferResponse {
  /**
     *
     * @type {string}
     * @memberof PeerTransferResponse
     */
  'token': string;
  /**
     *
     * @type {number}
     * @memberof PeerTransferResponse
     */
  'amount': number;
  /**
     *
     * @type {string}
     * @memberof PeerTransferResponse
     */
  'tags'?: string;
  /**
     *
     * @type {string}
     * @memberof PeerTransferResponse
     */
  'memo'?: string;
  /**
     *
     * @type {string}
     * @memberof PeerTransferResponse
     */
  'currency_code': string;
  /**
     *
     * @type {string}
     * @memberof PeerTransferResponse
     */
  'sender_user_token'?: string;
  /**
     *
     * @type {string}
     * @memberof PeerTransferResponse
     */
  'recipient_user_token'?: string;
  /**
     *
     * @type {string}
     * @memberof PeerTransferResponse
     */
  'sender_business_token'?: string;
  /**
     *
     * @type {string}
     * @memberof PeerTransferResponse
     */
  'recipient_business_token'?: string;
  /**
     *
     * @type {string}
     * @memberof PeerTransferResponse
     */
  'created_time': string;
}
/**
 *
 * @export
 * @interface Fee
 */
export interface Fee {
  /**
     * 36 char max
     * @type {string}
     * @memberof Fee
     */
  'token': string;
  /**
     * 50 char max
     * @type {string}
     * @memberof Fee
     */
  'name': string;
  /**
     *
     * @type {number}
     * @memberof Fee
     */
  'amount': number;
  /**
     * 255 char max
     * @type {string}
     * @memberof Fee
     */
  'tags'?: string;
  /**
     * yyyy-MM-ddTHH:mm:ssZ
     * @type {string}
     * @memberof Fee
     */
  'created_time': string;
  /**
     * yyyy-MM-ddTHH:mm:ssZ
     * @type {string}
     * @memberof Fee
     */
  'last_modified_time': string;
  /**
     *
     * @type {string}
     * @memberof Fee
     */
  'currency_code': string;
}
/**
 *
 * @export
 * @interface FeeDetail
 */
export interface FeeDetail {
  /**
     * 36 char max
     * @type {string}
     * @memberof FeeDetail
     */
  'token': string;
  /**
     *
     * @type {string}
     * @memberof FeeDetail
     */
  'memo'?: string;
  /**
     *
     * @type {string}
     * @memberof FeeDetail
     */
  'tags'?: string;
  /**
     *
     * @type {string}
     * @memberof FeeDetail
     */
  'transaction_token': string;
  /**
     *
     * @type {Fee}
     * @memberof FeeDetail
     */
  'fee': Fee;
}

/**
 *
 * @export
 * @interface FeeTransferResponse
 */
export interface FeeTransferResponse {
  /**
     *
     * @type {string}
     * @memberof FeeTransferResponse
     */
  'tags'?: string;
  /**
     *
     * @type {Array<FeeDetail>}
     * @memberof FeeTransferResponse
     */
  'fees': Array<FeeDetail>;
  /**
     * 36 char max
     * @type {string}
     * @memberof FeeTransferResponse
     */
  'token': string;
  /**
     * Required if \'business_token\' is null
     * @type {string}
     * @memberof FeeTransferResponse
     */
  'user_token': string;
  /**
     * Required if \'user_token\' is null
     * @type {string}
     * @memberof FeeTransferResponse
     */
  'business_token': string;
  /**
     * yyyy-MM-ddTHH:mm:ssZ
     * @type {string}
     * @memberof FeeTransferResponse
     */
  'created_time': string;
}
/**
 *
 * @export
 * @interface InstallmentPayment
 */
export interface InstallmentPayment {
  /**
   *
   * @type {string}
   * @memberof InstallmentPayment
   */
  'currency_code'?: string;
  /**
   *
   * @type {string}
   * @memberof InstallmentPayment
   */
  'frequency'?: string;
  /**
   *
   * @type {string}
   * @memberof InstallmentPayment
   */
  'first_installment_date'?: string;
  /**
   *
   * @type {number}
   * @memberof InstallmentPayment
   */
  'total_amount_funded'?: number;
  /**
   *
   * @type {string}
   * @memberof InstallmentPayment
   */
  'payment_type'?: string;
}
/**
 *
 * @export
 * @interface NetworkMetadata
 */
export interface NetworkMetadata {
  /**
   *
   * @type {string}
   * @memberof NetworkMetadata
   */
  'product_id'?: string;
  /**
   *
   * @type {string}
   * @memberof NetworkMetadata
   */
  'program_id'?: string;
  /**
   *
   * @type {string}
   * @memberof NetworkMetadata
   */
  'spend_qualifier'?: string;
  /**
   *
   * @type {string}
   * @memberof NetworkMetadata
   */
  'surcharge_free_atm_network'?: string;
  /**
   *
   * @type {string}
   * @memberof NetworkMetadata
   */
  'account_identification_1'?: string;
  /**
   *
   * @type {InstallmentPayment}
   * @memberof NetworkMetadata
   */
  'installment_payment'?: InstallmentPayment;
  /**
   *
   * @type {string}
   * @memberof NetworkMetadata
   */
  'incoming_response_code'?: string;
}

/**
 *
 * @export
 * @interface AvsInformation
 */
export interface AvsInformation {
  /**
   *
   * @type {string}
   * @memberof AvsInformation
   */
  'street_address'?: string;
  /**
   *
   * @type {string}
   * @memberof AvsInformation
   */
  'zip'?: string;
  /**
   *
   * @type {string}
   * @memberof AvsInformation
   */
  'postal_code'?: string;
}

/**
 *
 * @export
 * @interface AddressVerificationSource
 */
export interface AddressVerificationSource {
  /**
   *
   * @type {AvsInformation}
   * @memberof AddressVerificationSource
   */
  'on_file'?: AvsInformation;
  /**
   *
   * @type {Response}
   * @memberof AddressVerificationSource
   */
  'response'?: Response;
}
/**
 *
 * @export
 * @interface JitAddressVerification
 */
export interface JitAddressVerification {
  /**
   *
   * @type {AvsInformation}
   * @memberof JitAddressVerification
   */
  'request'?: AvsInformation;
  /**
   *
   * @type {AddressVerificationSource}
   * @memberof JitAddressVerification
   */
  'issuer'?: AddressVerificationSource;
  /**
   *
   * @type {AddressVerificationSource}
   * @memberof JitAddressVerification
   */
  'gateway'?: AddressVerificationSource;
}
/**
 *
 * @export
 * @interface CardholderAddressResponse
 */
export interface CardholderAddressResponse {
  /**
   * Required if \'business_token\' is not specified
   * @type {string}
   * @memberof CardholderAddressResponse
   */
  'user_token'?: string;
  /**
   * Required if \'user_token\' is not specified
   * @type {string}
   * @memberof CardholderAddressResponse
   */
  'business_token'?: string;
  /**
   *
   * @type {string}
   * @memberof CardholderAddressResponse
   */
  'token': string;
  /**
   *
   * @type {string}
   * @memberof CardholderAddressResponse
   */
  'first_name': string;
  /**
   *
   * @type {string}
   * @memberof CardholderAddressResponse
   */
  'last_name': string;
  /**
   *
   * @type {string}
   * @memberof CardholderAddressResponse
   */
  'address_1': string;
  /**
   *
   * @type {string}
   * @memberof CardholderAddressResponse
   */
  'address_2'?: string;
  /**
   *
   * @type {string}
   * @memberof CardholderAddressResponse
   */
  'city': string;
  /**
   *
   * @type {string}
   * @memberof CardholderAddressResponse
   */
  'state': string;
  /**
   *
   * @type {string}
   * @memberof CardholderAddressResponse
   */
  'zip': string;
  /**
   *
   * @type {string}
   * @memberof CardholderAddressResponse
   */
  'postal_code': string;
  /**
   *
   * @type {string}
   * @memberof CardholderAddressResponse
   */
  'country': string;
  /**
   *
   * @type {string}
   * @memberof CardholderAddressResponse
   */
  'phone'?: string;
  /**
   *
   * @type {boolean}
   * @memberof CardholderAddressResponse
   */
  'is_default_address'?: boolean;
  /**
   *
   * @type {boolean}
   * @memberof CardholderAddressResponse
   */
  'active'?: boolean;
  /**
   * yyyy-MM-ddTHH:mm:ssZ
   * @type {string}
   * @memberof CardholderAddressResponse
   */
  'created_time': string;
  /**
   * yyyy-MM-ddTHH:mm:ssZ
   * @type {string}
   * @memberof CardholderAddressResponse
   */
  'last_modified_time': string;
}
/**
 *
 * @export
 * @interface FundingSourceModel
 */
export interface FundingSourceModel {
  /**
   *
   * @type {string}
   * @memberof FundingSourceModel
   */
  'token': string;
  /**
   *
   * @type {boolean}
   * @memberof FundingSourceModel
   */
  'active': boolean;
  /**
   *
   * @type {boolean}
   * @memberof FundingSourceModel
   */
  'is_default_account': boolean;
  /**
   * yyyy-MM-ddTHH:mm:ssZ
   * @type {string}
   * @memberof FundingSourceModel
   */
  'created_time': string;
  /**
   * yyyy-MM-ddTHH:mm:ssZ
   * @type {string}
   * @memberof FundingSourceModel
   */
  'last_modified_time': string;
  /**
   *
   * @type {string}
   * @memberof FundingSourceModel
   */
  'type': string;
}

/**
 *
 * @export
 * @interface CardholderBalance
 */
export interface CardholderBalance {
  /**
   *
   * @type {string}
   * @memberof CardholderBalance
   */
  'currency_code': string;
  /**
   *
   * @type {number}
   * @memberof CardholderBalance
   */
  'ledger_balance': number;
  /**
   *
   * @type {number}
   * @memberof CardholderBalance
   */
  'available_balance': number;
  /**
   *
   * @type {number}
   * @memberof CardholderBalance
   */
  'credit_balance': number;
  /**
   *
   * @type {number}
   * @memberof CardholderBalance
   */
  'cached_balance': number;
  /**
   *
   * @type {number}
   * @memberof CardholderBalance
   */
  'pending_credits': number;
  /**
   *
   * @type {number}
   * @memberof CardholderBalance
   */
  'impacted_amount'?: number;
  /**
   *
   * @type {{ [key: string]: CardholderBalance; }}
   * @memberof CardholderBalance
   */
  'balances': { [key: string]: CardholderBalance; };
  /**
   *
   * @type {string}
   * @memberof CardholderBalance
   */
  'last_updated_time': string;
}

/**
 *
 * @export
 * @interface JitFundingApi
 */
export interface JitFundingApi {
  /**
   *
   * @type {string}
   * @memberof JitFundingApi
   */
  'token': string;
  /**
   *
   * @type {string}
   * @memberof JitFundingApi
   */
  'method': JitFundingApiMethodEnumValues;
  /**
   *
   * @type {string}
   * @memberof JitFundingApi
   */
  'user_token': string;
  /**
   *
   * @type {string}
   * @memberof JitFundingApi
   */
  'acting_user_token'?: string;
  /**
   *
   * @type {string}
   * @memberof JitFundingApi
   */
  'business_token'?: string;
  /**
   *
   * @type {number}
   * @memberof JitFundingApi
   */
  'amount': number;
  /**
   *
   * @type {string}
   * @memberof JitFundingApi
   */
  'memo'?: string;
  /**
   *
   * @type {string}
   * @memberof JitFundingApi
   */
  'tags'?: string;
  /**
   *
   * @type {string}
   * @memberof JitFundingApi
   */
  'original_jit_funding_token'?: string;
  /**
   *
   * @type {Array<string>}
   * @memberof JitFundingApi
   */
  'incremental_authorization_jit_funding_tokens'?: Array<string>;
  /**
   *
   * @type {JitAddressVerification}
   * @memberof JitFundingApi
   */
  'address_verification'?: JitAddressVerification;
  /**
   *
   * @type {string}
   * @memberof JitFundingApi
   */
  'decline_reason'?: JitFundingApiDeclineReasonEnumValues;
  /**
   *
   * @type {{ [key: string]: CardholderBalance; }}
   * @memberof JitFundingApi
   */
  'balances'?: { [key: string]: CardholderBalance; };
}
/**
 *
 * @export
 * @interface JitProgramResponse
 */
export interface JitProgramResponse {
  /**
   *
   * @type {JitFundingApi}
   * @memberof JitProgramResponse
   */
  'jit_funding': JitFundingApi;
  /**
   *
   * @type {NetworkMetadata}
   * @memberof JitProgramResponse
   */
  'network_metadata'?: NetworkMetadata;
}

/**
 *
 * @export
 * @interface GatewayResponse
 */
export interface GatewayResponse {
  /**
   *
   * @type {string}
   * @memberof GatewayResponse
   */
  'code': string;
  /**
   *
   * @type {JitProgramResponse}
   * @memberof GatewayResponse
   */
  'data'?: JitProgramResponse;
}
/**
 *
 * @export
 * @interface GatewayLogModel
 */
export interface GatewayLogModel {
  /**
   *
   * @type {string}
   * @memberof GatewayLogModel
   */
  'order_number': string;
  /**
   *
   * @type {string}
   * @memberof GatewayLogModel
   */
  'transaction_id': string;
  /**
   *
   * @type {string}
   * @memberof GatewayLogModel
   */
  'message': string;
  /**
   *
   * @type {number}
   * @memberof GatewayLogModel
   */
  'duration'?: number;
  /**
   *
   * @type {boolean}
   * @memberof GatewayLogModel
   */
  'timed_out'?: boolean;
  /**
   *
   * @type {GatewayResponse}
   * @memberof GatewayLogModel
   */
  'response'?: GatewayResponse;
}
/**
 *
 * @export
 * @interface Funding
 */
export interface Funding {
  /**
   *
   * @type {number}
   * @memberof Funding
   */
  'amount'?: number;
  /**
   *
   * @type {FundingSourceModel}
   * @memberof Funding
   */
  'source': FundingSourceModel;
  /**
   *
   * @type {CardholderAddressResponse}
   * @memberof Funding
   */
  'source_address'?: CardholderAddressResponse;
  /**
   *
   * @type {GatewayLogModel}
   * @memberof Funding
   */
  'gateway_log'?: GatewayLogModel;
}

/**
 *
 * @export
 * @interface GpaResponse
 */
export interface GpaResponse {
  /**
   *
   * @type {string}
   * @memberof GpaResponse
   */
  'token': string;
  /**
   *
   * @type {number}
   * @memberof GpaResponse
   */
  'amount': number;
  /**
   *
   * @type {string}
   * @memberof GpaResponse
   */
  'tags'?: string;
  /**
   *
   * @type {string}
   * @memberof GpaResponse
   */
  'memo'?: string;
  /**
   * yyyy-MM-ddTHH:mm:ssZ
   * @type {string}
   * @memberof GpaResponse
   */
  'created_time': string;
  /**
   * yyyy-MM-ddTHH:mm:ssZ
   * @type {string}
   * @memberof GpaResponse
   */
  'last_modified_time': string;
  /**
   *
   * @type {string}
   * @memberof GpaResponse
   */
  'transaction_token': string;
  /**
   *
   * @type {string}
   * @memberof GpaResponse
   */
  'state': string;
  /**
   *
   * @type {Response}
   * @memberof GpaResponse
   */
  'response': Response;
  /**
   *
   * @type {Funding}
   * @memberof GpaResponse
   */
  'funding': Funding;
  /**
   *
   * @type {string}
   * @memberof GpaResponse
   */
  'funding_source_token': string;
  /**
   *
   * @type {string}
   * @memberof GpaResponse
   */
  'funding_source_address_token'?: string;
  /**
   *
   * @type {JitFundingApi}
   * @memberof GpaResponse
   */
  'jit_funding'?: JitFundingApi;
  /**
   *
   * @type {string}
   * @memberof GpaResponse
   */
  'user_token'?: string;
  /**
   *
   * @type {string}
   * @memberof GpaResponse
   */
  'business_token'?: string;
  /**
   *
   * @type {string}
   * @memberof GpaResponse
   */
  'currency_code': string;
  /**
   *
   * @type {number}
   * @memberof GpaResponse
   */
  'gateway_token'?: number;
  /**
   *
   * @type {string}
   * @memberof GpaResponse
   */
  'gateway_message'?: string;
  /**
   *
   * @type {Array<FeeDetail>}
   * @memberof GpaResponse
   */
  'fees'?: Array<FeeDetail>;
}
/**
 *
 * @export
 * @interface MsaOrderResponse
 */
export interface MsaOrderResponse {
  /**
     *
     * @type {string}
     * @memberof MsaOrderResponse
     */
  'token'?: string;
  /**
     *
     * @type {string}
     * @memberof MsaOrderResponse
     */
  'user_token'?: string;
  /**
     *
     * @type {string}
     * @memberof MsaOrderResponse
     */
  'business_token'?: string;
  /**
     *
     * @type {MsaBalances}
     * @memberof MsaOrderResponse
     */
  'order_balances': MsaBalances;
  /**
     *
     * @type {number}
     * @memberof MsaOrderResponse
     */
  'purchase_amount': number;
  /**
     * yyyy-MM-ddThh:mm:ssZ
     * @type {string}
     * @memberof MsaOrderResponse
     */
  'last_transaction_date': string;
  /**
     * yyyy-MM-ddThh:mm:ssZ
     * @type {string}
     * @memberof MsaOrderResponse
     */
  'start_date'?: string;
  /**
     * yyyy-MM-ddThh:mm:ssZ
     * @type {string}
     * @memberof MsaOrderResponse
     */
  'end_date'?: string;
  /**
     *
     * @type {string}
     * @memberof MsaOrderResponse
     */
  'currency_code': string;
  /**
     *
     * @type {boolean}
     * @memberof MsaOrderResponse
     */
  'active': boolean;
  /**
     *
     * @type {number}
     * @memberof MsaOrderResponse
     */
  'reward_amount': number;
  /**
     *
     * @type {number}
     * @memberof MsaOrderResponse
     */
  'reward_trigger_amount': number;
  /**
     *
     * @type {number}
     * @memberof MsaOrderResponse
     */
  'unloaded_amount'?: number;
  /**
     *
     * @type {string}
     * @memberof MsaOrderResponse
     */
  'campaign_token': string;
  /**
     *
     * @type {Funding}
     * @memberof MsaOrderResponse
     */
  'funding': Funding;
  /**
     * yyyy-MM-ddTHH:mm:ssZ
     * @type {string}
     * @memberof MsaOrderResponse
     */
  'created_time': string;
  /**
     * yyyy-MM-ddTHH:mm:ssZ
     * @type {string}
     * @memberof MsaOrderResponse
     */
  'last_modified_time': string;
  /**
     *
     * @type {MsaAggregatedBalances}
     * @memberof MsaOrderResponse
     */
  'aggregated_balances': MsaAggregatedBalances;
  /**
     *
     * @type {string}
     * @memberof MsaOrderResponse
     */
  'transaction_token': string;
}

/**
 *
 * @export
 * @interface MsaReturns
 */
export interface MsaReturns {
  /**
     *
     * @type {string}
     * @memberof MsaReturns
     */
  'token'?: string;
  /**
     *
     * @type {string}
     * @memberof MsaReturns
     */
  'user_token'?: string;
  /**
     *
     * @type {string}
     * @memberof MsaReturns
     */
  'business_token'?: string;
  /**
     *
     * @type {MsaBalances}
     * @memberof MsaReturns
     */
  'order_balances': MsaBalances;
  /**
     *
     * @type {number}
     * @memberof MsaReturns
     */
  'amount': number;
  /**
     * yyyy-MM-ddThh:mm:ssZ
     * @type {string}
     * @memberof MsaReturns
     */
  'last_transaction_date': string;
  /**
     * yyyy-MM-ddThh:mm:ssZ
     * @type {string}
     * @memberof MsaReturns
     */
  'start_date'?: string;
  /**
     * yyyy-MM-ddThh:mm:ssZ
     * @type {string}
     * @memberof MsaReturns
     */
  'end_date'?: string;
  /**
     *
     * @type {string}
     * @memberof MsaReturns
     */
  'currency_code': string;
  /**
     *
     * @type {boolean}
     * @memberof MsaReturns
     */
  'active': boolean;
  /**
     *
     * @type {number}
     * @memberof MsaReturns
     */
  'reward_amount': number;
  /**
     *
     * @type {number}
     * @memberof MsaReturns
     */
  'reward_trigger_amount': number;
  /**
     *
     * @type {number}
     * @memberof MsaReturns
     */
  'unloaded_amount'?: number;
  /**
     *
     * @type {string}
     * @memberof MsaReturns
     */
  'campaign_token': string;
  /**
     *
     * @type {Funding}
     * @memberof MsaReturns
     */
  'funding': Funding;
  /**
     * yyyy-MM-ddTHH:mm:ssZ
     * @type {string}
     * @memberof MsaReturns
     */
  'created_time': string;
  /**
     * yyyy-MM-ddTHH:mm:ssZ
     * @type {string}
     * @memberof MsaReturns
     */
  'last_modified_time': string;
  /**
     *
     * @type {MsaAggregatedBalances}
     * @memberof MsaReturns
     */
  'aggregated_balances': MsaAggregatedBalances;
  /**
     *
     * @type {string}
     * @memberof MsaReturns
     */
  'original_order_token': string;
  /**
     *
     * @type {string}
     * @memberof MsaReturns
     */
  'transaction_token': string;
}
/**
 *
 * @export
 * @interface OfferOrderResponse
 */
export interface OfferOrderResponse {
  /**
     * yyyy-MM-ddTHH:mm:ssZ
     * @type {string}
     * @memberof OfferOrderResponse
     */
  'created_time': string;
  /**
     * yyyy-MM-ddTHH:mm:ssZ
     * @type {string}
     * @memberof OfferOrderResponse
     */
  'last_modified_time': string;
  /**
     *
     * @type {string}
     * @memberof OfferOrderResponse
     */
  'user_token'?: string;
  /**
     *
     * @type {string}
     * @memberof OfferOrderResponse
     */
  'business_token'?: string;
  /**
     *
     * @type {string}
     * @memberof OfferOrderResponse
     */
  'token': string;
  /**
     *
     * @type {OfferOrderBalances}
     * @memberof OfferOrderResponse
     */
  'order_balances': OfferOrderBalances;
  /**
     *
     * @type {OfferOrderAggregatedBalances}
     * @memberof OfferOrderResponse
     */
  'order_aggregated_balances': OfferOrderAggregatedBalances;
  /**
     *
     * @type {Funding}
     * @memberof OfferOrderResponse
     */
  'funding'?: Funding;
  /**
     *
     * @type {OfferModel}
     * @memberof OfferOrderResponse
     */
  'offer'?: OfferModel;
  /**
     * yyyy-MM-ddThh:mm:ssZ
     * @type {string}
     * @memberof OfferOrderResponse
     */
  'last_transaction_date': string;
}
/**
 *
 * @export
 * @interface GpaReturns
 */
export interface GpaReturns {
  /**
   *
   * @type {string}
   * @memberof GpaReturns
   */
  'token': string;
  /**
   *
   * @type {number}
   * @memberof GpaReturns
   */
  'amount': number;
  /**
   *
   * @type {string}
   * @memberof GpaReturns
   */
  'tags'?: string;
  /**
   *
   * @type {string}
   * @memberof GpaReturns
   */
  'memo'?: string;
  /**
   * yyyy-MM-ddTHH:mm:ssZ
   * @type {string}
   * @memberof GpaReturns
   */
  'created_time': string;
  /**
   * yyyy-MM-ddTHH:mm:ssZ
   * @type {string}
   * @memberof GpaReturns
   */
  'last_modified_time': string;
  /**
   *
   * @type {string}
   * @memberof GpaReturns
   */
  'transaction_token': string;
  /**
   *
   * @type {string}
   * @memberof GpaReturns
   */
  'state': string;
  /**
   *
   * @type {Response}
   * @memberof GpaReturns
   */
  'response': Response;
  /**
   *
   * @type {Funding}
   * @memberof GpaReturns
   */
  'funding': Funding;
  /**
   *
   * @type {string}
   * @memberof GpaReturns
   */
  'funding_source_token': string;
  /**
   *
   * @type {string}
   * @memberof GpaReturns
   */
  'funding_source_address_token'?: string;
  /**
   *
   * @type {JitFundingApi}
   * @memberof GpaReturns
   */
  'jit_funding'?: JitFundingApi;
  /**
   *
   * @type {string}
   * @memberof GpaReturns
   */
  'original_order_token'?: string;
}
/**
 *
 * @export
 * @interface ActivationActions
 */
export interface ActivationActions {
  /**
   *
   * @type {boolean}
   * @memberof ActivationActions
   */
  'terminate_reissued_source_card'?: boolean;
  /**
   *
   * @type {string}
   * @memberof ActivationActions
   */
  'swap_digital_wallet_tokens_from_card_token'?: string;
}
/**
 *
 * @export
 * @interface ImagesCard
 */
export interface ImagesCard {
  /**
   *
   * @type {string}
   * @memberof ImagesCard
   */
  'name'?: string;
  /**
   *
   * @type {string}
   * @memberof ImagesCard
   */
  'thermal_color'?: string;
}
/**
 *
 * @export
 * @interface ImagesCarrier
 */
export interface ImagesCarrier {
  /**
   *
   * @type {string}
   * @memberof ImagesCarrier
   */
  'name'?: string;
  /**
   *
   * @type {string}
   * @memberof ImagesCarrier
   */
  'message_1'?: string;
}
/**
 *
 * @export
 * @interface ImagesCarrierReturnWindow
 */
export interface ImagesCarrierReturnWindow {
  /**
   *
   * @type {string}
   * @memberof ImagesCarrierReturnWindow
   */
  'name'?: string;
}
/**
 *
 * @export
 * @interface ImagesSignature
 */
export interface ImagesSignature {
  /**
   *
   * @type {string}
   * @memberof ImagesSignature
   */
  'name'?: string;
}
/**
 *
 * @export
 * @interface Images
 */
export interface Images {
  /**
   *
   * @type {ImagesCard}
   * @memberof Images
   */
  'card'?: ImagesCard;
  /**
   *
   * @type {ImagesCarrier}
   * @memberof Images
   */
  'carrier'?: ImagesCarrier;
  /**
   *
   * @type {ImagesSignature}
   * @memberof Images
   */
  'signature'?: ImagesSignature;
  /**
   *
   * @type {ImagesCarrierReturnWindow}
   * @memberof Images
   */
  'carrier_return_window'?: ImagesCarrierReturnWindow;
}

/**
 *
 * @export
 * @interface Carrier
 */
export interface Carrier {
  /**
   *
   * @type {string}
   * @memberof Carrier
   */
  'template_id'?: string;
  /**
   *
   * @type {string}
   * @memberof Carrier
   */
  'logo_file'?: string;
  /**
   *
   * @type {string}
   * @memberof Carrier
   */
  'logo_thumbnail_file'?: string;
  /**
   *
   * @type {string}
   * @memberof Carrier
   */
  'message_file'?: string;
  /**
   *
   * @type {string}
   * @memberof Carrier
   */
  'message_line'?: string;
}
/**
 *
 * @export
 * @interface CardPersonalization
 */
export interface CardPersonalization {
  /**
   *
   * @type {Text}
   * @memberof CardPersonalization
   */
  'text': Text;
  /**
   *
   * @type {Images}
   * @memberof CardPersonalization
   */
  'images'?: Images;
  /**
   *
   * @type {Carrier}
   * @memberof CardPersonalization
   */
  'carrier'?: Carrier;
  /**
   *
   * @type {string}
   * @memberof CardPersonalization
   */
  'perso_type'?: CardPersonalizationPersoTypeEnumValues;
}
/**
 *
 * @export
 * @interface FulfillmentAddressResponse
 */
export interface FulfillmentAddressResponse {
  /**
   *
   * @type {string}
   * @memberof FulfillmentAddressResponse
   */
  'first_name'?: string;
  /**
   *
   * @type {string}
   * @memberof FulfillmentAddressResponse
   */
  'middle_name'?: string;
  /**
   *
   * @type {string}
   * @memberof FulfillmentAddressResponse
   */
  'last_name'?: string;
  /**
   *
   * @type {string}
   * @memberof FulfillmentAddressResponse
   */
  'address1'?: string;
  /**
   *
   * @type {string}
   * @memberof FulfillmentAddressResponse
   */
  'address2'?: string;
  /**
   *
   * @type {string}
   * @memberof FulfillmentAddressResponse
   */
  'city'?: string;
  /**
   *
   * @type {string}
   * @memberof FulfillmentAddressResponse
   */
  'state'?: string;
  /**
   *
   * @type {string}
   * @memberof FulfillmentAddressResponse
   */
  'zip'?: string;
  /**
   *
   * @type {string}
   * @memberof FulfillmentAddressResponse
   */
  'postal_code'?: string;
  /**
   *
   * @type {string}
   * @memberof FulfillmentAddressResponse
   */
  'country'?: string;
  /**
   *
   * @type {string}
   * @memberof FulfillmentAddressResponse
   */
  'phone'?: string;
}

/**
 *
 * @export
 * @interface ShippingInformationResponse
 */
export interface ShippingInformationResponse {
  /**
   *
   * @type {string}
   * @memberof ShippingInformationResponse
   */
  'method'?: ShippingInformationResponseMethodEnumValues;
  /**
   *
   * @type {FulfillmentAddressResponse}
   * @memberof ShippingInformationResponse
   */
  'return_address'?: FulfillmentAddressResponse;
  /**
   *
   * @type {FulfillmentAddressResponse}
   * @memberof ShippingInformationResponse
   */
  'recipient_address'?: FulfillmentAddressResponse;
  /**
   * 255 char max
   * @type {string}
   * @memberof ShippingInformationResponse
   */
  'care_of_line'?: string;
}

/**
 *
 * @export
 * @interface CardFulfillmentResponse
 */
export interface CardFulfillmentResponse {
  /**
   *
   * @type {ShippingInformationResponse}
   * @memberof CardFulfillmentResponse
   */
  'shipping'?: ShippingInformationResponse;
  /**
   *
   * @type {CardPersonalization}
   * @memberof CardFulfillmentResponse
   */
  'card_personalization': CardPersonalization;
  /**
   *
   * @type {string}
   * @memberof CardFulfillmentResponse
   */
  'card_fulfillment_reason'?: CardFulfillmentResponseCardFulfillmentReasonEnumValues;
}

/**
 *
 * @export
 * @interface CardResponse
 */
export interface CardResponse {
  /**
   * yyyy-MM-ddTHH:mm:ssZ
   * @type {string}
   * @memberof CardResponse
   */
  'created_time': string;
  /**
   * yyyy-MM-ddTHH:mm:ssZ
   * @type {string}
   * @memberof CardResponse
   */
  'last_modified_time': string;
  /**
   * 36 char max
   * @type {string}
   * @memberof CardResponse
   */
  'token': string;
  /**
   * 36 char max
   * @type {string}
   * @memberof CardResponse
   */
  'user_token': string;
  /**
   * 36 char max
   * @type {string}
   * @memberof CardResponse
   */
  'card_product_token': string;
  /**
   *
   * @type {string}
   * @memberof CardResponse
   */
  'last_four': string;
  /**
   *
   * @type {string}
   * @memberof CardResponse
   */
  'pan': string;
  /**
   *
   * @type {string}
   * @memberof CardResponse
   */
  'expiration': string;
  /**
   * yyyy-MM-ddTHH:mm:ssZ
   * @type {string}
   * @memberof CardResponse
   */
  'expiration_time': string;
  /**
   *
   * @type {string}
   * @memberof CardResponse
   */
  'cvv_number'?: string;
  /**
   *
   * @type {string}
   * @memberof CardResponse
   */
  'chip_cvv_number'?: string;
  /**
   *
   * @type {string}
   * @memberof CardResponse
   */
  'barcode': string;
  /**
   *
   * @type {boolean}
   * @memberof CardResponse
   */
  'pin_is_set': boolean;
  /**
   *
   * @type {string}
   * @memberof CardResponse
   */
  'state': CardResponseStateEnumValues;
  /**
   *
   * @type {string}
   * @memberof CardResponse
   */
  'state_reason': string;
  /**
   *
   * @type {string}
   * @memberof CardResponse
   */
  'fulfillment_status': CardResponseFulfillmentStatusEnumValues;
  /**
   *
   * @type {string}
   * @memberof CardResponse
   */
  'reissue_pan_from_card_token'?: string;
  /**
   *
   * @type {string}
   * @memberof CardResponse
   */
  'new_pan_from_card_token'?: string;
  /**
   *
   * @type {CardFulfillmentResponse}
   * @memberof CardResponse
   */
  'fulfillment'?: CardFulfillmentResponse;
  /**
   *
   * @type {string}
   * @memberof CardResponse
   */
  'bulk_issuance_token'?: string;
  /**
   *
   * @type {string}
   * @memberof CardResponse
   */
  'translate_pin_from_card_token'?: string;
  /**
   *
   * @type {ActivationActions}
   * @memberof CardResponse
   */
  'activation_actions'?: ActivationActions;
  /**
   *
   * @type {string}
   * @memberof CardResponse
   */
  'instrument_type'?: CardResponseInstrumentTypeEnumValues;
  /**
   *
   * @type {boolean}
   * @memberof CardResponse
   */
  'expedite'?: boolean;
  /**
   *
   * @type {{ [key: string]: string; }}
   * @memberof CardResponse
   */
  'metadata'?: { [key: string]: string; };
  /**
   *
   * @type {number}
   * @memberof CardResponse
   */
  'contactless_exemption_counter'?: number;
  /**
   *
   * @type {number}
   * @memberof CardResponse
   */
  'contactless_exemption_total_amount'?: number;
}

/**
 *
 * @export
 * @interface ProgramTransferResponse
 */
export interface ProgramTransferResponse {
  /**
     *
     * @type {string}
     * @memberof ProgramTransferResponse
     */
  'token'?: string;
  /**
     *
     * @type {string}
     * @memberof ProgramTransferResponse
     */
  'type_token': string;
  /**
     *
     * @type {string}
     * @memberof ProgramTransferResponse
     */
  'user_token'?: string;
  /**
     *
     * @type {string}
     * @memberof ProgramTransferResponse
     */
  'business_token'?: string;
  /**
     *
     * @type {string}
     * @memberof ProgramTransferResponse
     */
  'transaction_token': string;
  /**
     *
     * @type {string}
     * @memberof ProgramTransferResponse
     */
  'currency_code': string;
  /**
     *
     * @type {number}
     * @memberof ProgramTransferResponse
     */
  'amount': number;
  /**
     *
     * @type {string}
     * @memberof ProgramTransferResponse
     */
  'memo'?: string;
  /**
     *
     * @type {string}
     * @memberof ProgramTransferResponse
     */
  'tags'?: string;
  /**
     *
     * @type {Array<FeeDetail>}
     * @memberof ProgramTransferResponse
     */
  'fees'?: Array<FeeDetail>;
  /**
     *
     * @type {string}
     * @memberof ProgramTransferResponse
     */
  'created_time'?: string;
  /**
     *
     * @type {JitFundingApi}
     * @memberof ProgramTransferResponse
     */
  'jit_funding'?: JitFundingApi;
}

/**
 *
 * @export
 * @interface TerminalModel
 */
export interface TerminalModel {
  /**
   *
   * @type {string}
   * @memberof TerminalModel
   */
  'tid'?: string;
  /**
   *
   * @type {string}
   * @memberof TerminalModel
   */
  'partial_approval_capable'?: string;
  /**
   *
   * @type {string}
   * @memberof TerminalModel
   */
  'cardholder_presence'?: string;
  /**
   *
   * @type {string}
   * @memberof TerminalModel
   */
  'card_presence'?: string;
  /**
   *
   * @type {string}
   * @memberof TerminalModel
   */
  'channel'?: string;
  /**
   *
   * @type {string}
   * @memberof TerminalModel
   */
  'processing_type'?: string;
  /**
   *
   * @type {string}
   * @memberof TerminalModel
   */
  'pin_present'?: string;
  /**
   *
   * @type {string}
   * @memberof TerminalModel
   */
  'special_condition_indicator'?: TerminalModelSpecialConditionIndicatorEnumValues;
}
/**
 *
 * @export
 * @interface TransactionCardAcceptor
 */
export interface TransactionCardAcceptor {
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'mid'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'mcc'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'network_mid'?: string;
  /**
   *
   * @type {Array<string>}
   * @memberof TransactionCardAcceptor
   */
  'mcc_groups'?: Array<string>;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'special_merchant_id'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'merchant_tax_id'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'name'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'address'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'city'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'state'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'postal_code'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'country_code'?: string;
  /**
   *
   * @type {TerminalModel}
   * @memberof TransactionCardAcceptor
   */
  'poi'?: TerminalModel;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'payment_facilitator_id'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'independent_sales_organization_id'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'sub_merchant_id'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'network_assigned_id'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'country_of_origin'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'transfer_service_provider_name'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'payment_facilitator_name'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'phone'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'url'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionCardAcceptor
   */
  'customer_service_phone'?: string;
}
/**
 *
 * @export
 * @interface StoreResponseModel
 */
export interface StoreResponseModel {
  /**
   *
   * @type {string}
   * @memberof StoreResponseModel
   */
  'name': string;
  /**
   *
   * @type {boolean}
   * @memberof StoreResponseModel
   */
  'active'?: boolean;
  /**
   *
   * @type {string}
   * @memberof StoreResponseModel
   */
  'contact'?: string;
  /**
   *
   * @type {string}
   * @memberof StoreResponseModel
   */
  'contact_email'?: string;
  /**
   *
   * @type {number}
   * @memberof StoreResponseModel
   */
  'longitude'?: number;
  /**
   *
   * @type {number}
   * @memberof StoreResponseModel
   */
  'latitude'?: number;
  /**
   *
   * @type {string}
   * @memberof StoreResponseModel
   */
  'address1': string;
  /**
   *
   * @type {string}
   * @memberof StoreResponseModel
   */
  'address2'?: string;
  /**
   *
   * @type {string}
   * @memberof StoreResponseModel
   */
  'city': string;
  /**
   *
   * @type {string}
   * @memberof StoreResponseModel
   */
  'state': string;
  /**
   *
   * @type {string}
   * @memberof StoreResponseModel
   */
  'province'?: string;
  /**
   *
   * @type {string}
   * @memberof StoreResponseModel
   */
  'zip'?: string;
  /**
   *
   * @type {string}
   * @memberof StoreResponseModel
   */
  'postal_code'?: string;
  /**
   *
   * @type {string}
   * @memberof StoreResponseModel
   */
  'phone'?: string;
  /**
   *
   * @type {string}
   * @memberof StoreResponseModel
   */
  'country'?: string;
  /**
   * The unique identifier of the merchant
   * @type {string}
   * @memberof StoreResponseModel
   */
  'token'?: string;
  /**
   * 1 char max
   * @type {boolean}
   * @memberof StoreResponseModel
   */
  'partial_auth_flag'?: boolean;
  /**
   *
   * @type {string}
   * @memberof StoreResponseModel
   */
  'mid': string;
  /**
   *
   * @type {string}
   * @memberof StoreResponseModel
   */
  'network_mid'?: string;
  /**
   *
   * @type {string}
   * @memberof StoreResponseModel
   */
  'merchant_token': string;
  /**
   *
   * @type {boolean}
   * @memberof StoreResponseModel
   */
  'partial_approval_capable'?: boolean;
  /**
   *
   * @type {boolean}
   * @memberof StoreResponseModel
   */
  'keyed_auth_cvv_enforced'?: boolean;
  /**
   * yyyy-MM-ddTHH:mm:ssZ
   * @type {string}
   * @memberof StoreResponseModel
   */
  'created_time': string;
  /**
   * yyyy-MM-ddTHH:mm:ssZ
   * @type {string}
   * @memberof StoreResponseModel
   */
  'last_modified_time': string;
}
/**
 *
 * @export
 * @interface MerchantResponseModel
 */
export interface MerchantResponseModel {
  /**
   *
   * @type {string}
   * @memberof MerchantResponseModel
   */
  'name': string;
  /**
   *
   * @type {boolean}
   * @memberof MerchantResponseModel
   */
  'active'?: boolean;
  /**
   *
   * @type {string}
   * @memberof MerchantResponseModel
   */
  'contact'?: string;
  /**
   *
   * @type {string}
   * @memberof MerchantResponseModel
   */
  'contact_email'?: string;
  /**
   *
   * @type {number}
   * @memberof MerchantResponseModel
   */
  'longitude'?: number;
  /**
   *
   * @type {number}
   * @memberof MerchantResponseModel
   */
  'latitude'?: number;
  /**
   *
   * @type {string}
   * @memberof MerchantResponseModel
   */
  'address1'?: string;
  /**
   *
   * @type {string}
   * @memberof MerchantResponseModel
   */
  'address2'?: string;
  /**
   *
   * @type {string}
   * @memberof MerchantResponseModel
   */
  'city'?: string;
  /**
   *
   * @type {string}
   * @memberof MerchantResponseModel
   */
  'state'?: string;
  /**
   *
   * @type {string}
   * @memberof MerchantResponseModel
   */
  'province'?: string;
  /**
   *
   * @type {string}
   * @memberof MerchantResponseModel
   */
  'zip'?: string;
  /**
   *
   * @type {string}
   * @memberof MerchantResponseModel
   */
  'phone'?: string;
  /**
   *
   * @type {string}
   * @memberof MerchantResponseModel
   */
  'country'?: string;
  /**
   * The unique identifier of the merchant
   * @type {string}
   * @memberof MerchantResponseModel
   */
  'token'?: string;
  /**
   *
   * @type {boolean}
   * @memberof MerchantResponseModel
   */
  'partial_auth_flag'?: boolean;
  /**
   * yyyy-MM-ddTHH:mm:ssZ
   * @type {string}
   * @memberof MerchantResponseModel
   */
  'created_time': string;
  /**
   * yyyy-MM-ddTHH:mm:ssZ
   * @type {string}
   * @memberof MerchantResponseModel
   */
  'last_modified_time': string;
}
/**
 *
 * @export
 * @interface PrecedingTransaction
 */
export interface PrecedingTransaction {
  /**
   * Amount of the preceding transaction
   * @type {number}
   * @memberof PrecedingTransaction
   */
  'amount'?: number;
  /**
   * Token of the preceding transaction
   * @type {string}
   * @memberof PrecedingTransaction
   */
  'token'?: string;
}
/**
 *
 * @export
 * @interface SettlementData
 */
export interface SettlementData {
  /**
   *
   * @type {number}
   * @memberof SettlementData
   */
  'amount'?: number;
  /**
   *
   * @type {number}
   * @memberof SettlementData
   */
  'conversion_rate'?: number;
  /**
   *
   * @type {string}
   * @memberof SettlementData
   */
  'currency_code'?: string;
}
/**
 *
 * @export
 * @interface Network
 */
export interface Network {
  /**
   *
   * @type {number}
   * @memberof Network
   */
  'original_amount'?: number;
  /**
   *
   * @type {number}
   * @memberof Network
   */
  'conversion_rate'?: number;
  /**
   *
   * @type {string}
   * @memberof Network
   */
  'original_currency_code'?: string;
  /**
   *
   * @type {boolean}
   * @memberof Network
   */
  'dynamic_currency_conversion'?: boolean;
  /**
   *
   * @type {SettlementData}
   * @memberof Network
   */
  'settlement_data'?: SettlementData;
}
/**
 *
 * @export
 * @interface CurrencyConversion
 */
export interface CurrencyConversion {
  /**
   *
   * @type {Network}
   * @memberof CurrencyConversion
   */
  'network'?: Network;
}

/**
 *
 * @export
 * @interface AutoReloadAssociation
 */
export interface AutoReloadAssociation {
  /**
     *
     * @type {string}
     * @memberof AutoReloadAssociation
     */
  'card_product_token'?: string;
  /**
     *
     * @type {string}
     * @memberof AutoReloadAssociation
     */
  'user_token'?: string;
  /**
     *
     * @type {string}
     * @memberof AutoReloadAssociation
     */
  'business_token'?: string;
}

/**
 *
 * @export
 * @interface GPA
 */
export interface GPA {
  /**
     *
     * @type {number}
     * @memberof GPA
     */
  'trigger_amount': number;
  /**
     *
     * @type {number}
     * @memberof GPA
     */
  'reload_amount': number;
}

/**
 *
 * @export
 * @interface MSA
 */
export interface MSA {
  /**
     *
     * @type {string}
     * @memberof MSA
     */
  'campaign_token': string;
  /**
     *
     * @type {number}
     * @memberof MSA
     */
  'trigger_amount': number;
  /**
     *
     * @type {number}
     * @memberof MSA
     */
  'reload_amount': number;
}
/**
 *
 * @export
 * @interface OrderScope
 */
export interface OrderScope {
  /**
     *
     * @type {GPA}
     * @memberof OrderScope
     */
  'gpa'?: GPA;
  /**
     *
     * @type {MSA}
     * @memberof OrderScope
     */
  'msa'?: MSA;
}
/**
 *
 * @export
 * @interface AutoReloadModel
 */
export interface AutoReloadModel {
  /**
     *
     * @type {string}
     * @memberof AutoReloadModel
     */
  'token'?: string;
  /**
     *
     * @type {boolean}
     * @memberof AutoReloadModel
     */
  'active'?: boolean;
  /**
     * Required when order scope is GPA
     * @type {string}
     * @memberof AutoReloadModel
     */
  'funding_source_token'?: string;
  /**
     *
     * @type {string}
     * @memberof AutoReloadModel
     */
  'funding_source_address_token'?: string;
  /**
     *
     * @type {AutoReloadAssociation}
     * @memberof AutoReloadModel
     */
  'association'?: AutoReloadAssociation;
  /**
     *
     * @type {OrderScope}
     * @memberof AutoReloadModel
     */
  'order_scope': OrderScope;
  /**
     *
     * @type {string}
     * @memberof AutoReloadModel
     */
  'currency_code': string;
}

/**
 *
 * @export
 * @interface DepositDepositResponse
 */
export interface DepositDepositResponse {
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'token'?: string;
  /**
     *
     * @type {number}
     * @memberof DepositDepositResponse
     */
  'amount'?: number;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'type'?: DepositDepositResponseTypeEnumValues;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'state'?: DepositDepositResponseStateEnumValues;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'settlement_date'?: string;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'state_reason'?: string;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'state_reason_code'?: string;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'direct_deposit_account_token'?: string;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'user_token'?: string;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'business_token'?: string;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'created_time'?: string;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'last_modified_time'?: string;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'standard_entry_class_code'?: string;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'company_name'?: string;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'company_discretionary_data'?: string;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'company_identification'?: string;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'company_entry_description'?: string;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'individual_identification_number'?: string;
  /**
     *
     * @type {string}
     * @memberof DepositDepositResponse
     */
  'individual_name'?: string;
}

/**
 *
 * @export
 * @interface PullFromCardTransferResponse
 */
export interface PullFromCardTransferResponse {
  /**
     *
     * @type {string}
     * @memberof PullFromCardTransferResponse
     */
  'card_token'?: string;
  /**
     *
     * @type {string}
     * @memberof PullFromCardTransferResponse
     */
  'transfer_token'?: string;
  /**
     *
     * @type {string}
     * @memberof PullFromCardTransferResponse
     */
  'amount'?: string;
  /**
     *
     * @type {string}
     * @memberof PullFromCardTransferResponse
     */
  'currency'?: string;
  /**
     *
     * @type {string}
     * @memberof PullFromCardTransferResponse
     */
  'statement_descriptor'?: string;
  /**
     *
     * @type {string}
     * @memberof PullFromCardTransferResponse
     */
  'status'?: string;
  /**
     *
     * @type {string}
     * @memberof PullFromCardTransferResponse
     */
  'created_time'?: string;
  /**
     *
     * @type {string}
     * @memberof PullFromCardTransferResponse
     */
  'last_modified_time'?: string;
}

/**
 *
 * @export
 * @interface RealTimeFeeGroup
 */
export interface RealTimeFeeGroup {
  /**
     * 36 char max
     * @type {string}
     * @memberof RealTimeFeeGroup
     */
  'token': string;
  /**
     *
     * @type {string}
     * @memberof RealTimeFeeGroup
     */
  'created_time'?: string;
  /**
     *
     * @type {string}
     * @memberof RealTimeFeeGroup
     */
  'last_modified_time'?: string;
  /**
     *
     * @type {boolean}
     * @memberof RealTimeFeeGroup
     */
  'active': boolean;
  /**
     * 50 char max
     * @type {string}
     * @memberof RealTimeFeeGroup
     */
  'name': string;
  /**
     *
     * @type {Set<string>}
     * @memberof RealTimeFeeGroup
     */
  'fee_tokens'?: Set<string>;
}
/**
 *
 * @export
 * @interface ChargebackResponse
 */
export interface ChargebackResponse {
  /**
     *
     * @type {string}
     * @memberof ChargebackResponse
     */
  'token': string;
  /**
     *
     * @type {string}
     * @memberof ChargebackResponse
     */
  'transaction_token': string;
  /**
     *
     * @type {number}
     * @memberof ChargebackResponse
     */
  'amount': number;
  /**
     *
     * @type {string}
     * @memberof ChargebackResponse
     */
  'reason_description'?: ChargebackResponseReasonDescriptionEnumValues;
  /**
     *
     * @type {string}
     * @memberof ChargebackResponse
     */
  'reason_code'?: string;
  /**
     *
     * @type {string}
     * @memberof ChargebackResponse
     */
  'memo'?: string;
  /**
     *
     * @type {string}
     * @memberof ChargebackResponse
     */
  'state': ChargebackResponseStateEnumValues;
  /**
     *
     * @type {string}
     * @memberof ChargebackResponse
     */
  'channel': ChargebackResponseChannelEnumValues;
  /**
     *
     * @type {string}
     * @memberof ChargebackResponse
     */
  'network': ChargebackResponseNetworkEnumValues;
  /**
     *
     * @type {string}
     * @memberof ChargebackResponse
     */
  'network_case_id'?: string;
  /**
     *
     * @type {boolean}
     * @memberof ChargebackResponse
     */
  'credit_user': boolean;
  /**
     * yyyy-MM-ddTHH:mm:ssZ
     * @type {string}
     * @memberof ChargebackResponse
     */
  'created_time': string;
  /**
     * yyyy-MM-ddTHH:mm:ssZ
     * @type {string}
     * @memberof ChargebackResponse
     */
  'last_modified_time': string;
}

/**
 *
 * @export
 * @interface DisputeModel
 */
export interface DisputeModel {
  /**
     *
     * @type {string}
     * @memberof DisputeModel
     */
  'reason'?: string;
  /**
     *
     * @type {string}
     * @memberof DisputeModel
     */
  'case_management_identifier'?: string;
}

/**
 *
 * @export
 * @interface NetworkFeeModel
 */
export interface NetworkFeeModel {
  /**
     *
     * @type {string}
     * @memberof NetworkFeeModel
     */
  'type'?: NetworkFeeModelTypeEnumValues;
  /**
     *
     * @type {number}
     * @memberof NetworkFeeModel
     */
  'amount'?: number;
  /**
     * C = credit; D = debit
     * @type {string}
     * @memberof NetworkFeeModel
     */
  'credit_debit'?: NetworkFeeModelCreditDebitEnumValues;
}

/**
 *
 * @export
 * @interface TokenServiceProvider
 */
export interface TokenServiceProvider {
  /**
     *
     * @type {string}
     * @memberof TokenServiceProvider
     */
  'token_reference_id'?: string;
  /**
     * 50 char max
     * @type {string}
     * @memberof TokenServiceProvider
     */
  'pan_reference_id': string;
  /**
     *
     * @type {string}
     * @memberof TokenServiceProvider
     */
  'correlation_id'?: string;
  /**
     *
     * @type {string}
     * @memberof TokenServiceProvider
     */
  'token_requestor_id'?: string;
  /**
     *
     * @type {string}
     * @memberof TokenServiceProvider
     */
  'token_requestor_name'?: string;
  /**
     *
     * @type {string}
     * @memberof TokenServiceProvider
     */
  'token_type'?: string;
  /**
     *
     * @type {string}
     * @memberof TokenServiceProvider
     */
  'token_pan'?: string;
  /**
     *
     * @type {string}
     * @memberof TokenServiceProvider
     */
  'token_expiration'?: string;
  /**
     *
     * @type {string}
     * @memberof TokenServiceProvider
     */
  'token_score'?: string;
  /**
     *
     * @type {string}
     * @memberof TokenServiceProvider
     */
  'token_assurance_level'?: string;
  /**
     *
     * @type {string}
     * @memberof TokenServiceProvider
     */
  'token_eligibility_decision'?: string;
}

/**
 *
 * @export
 * @interface Device
 */
export interface Device {
  /**
     *
     * @type {string}
     * @memberof Device
     */
  'token'?: string;
  /**
     *
     * @type {string}
     * @memberof Device
     */
  'type'?: string;
  /**
     *
     * @type {string}
     * @memberof Device
     */
  'language_code'?: string;
  /**
     *
     * @type {string}
     * @memberof Device
     */
  'device_id'?: string;
  /**
     *
     * @type {string}
     * @memberof Device
     */
  'phone_number'?: string;
  /**
     *
     * @type {string}
     * @memberof Device
     */
  'name'?: string;
  /**
     *
     * @type {string}
     * @memberof Device
     */
  'location'?: string;
  /**
     *
     * @type {string}
     * @memberof Device
     */
  'ip_address'?: string;
}

/**
 *
 * @export
 * @interface Account
 */
export interface Account {
  /**
     *
     * @type {string}
     * @memberof Account
     */
  'id'?: string;
  /**
     *
     * @type {string}
     * @memberof Account
     */
  'email_address'?: string;
  /**
     *
     * @type {string}
     * @memberof Account
     */
  'score'?: string;
}

/**
 *
 * @export
 * @interface RiskAssessment
 */
export interface RiskAssessment {
  /**
     *
     * @type {string}
     * @memberof RiskAssessment
     */
  'score'?: string;
  /**
     *
     * @type {string}
     * @memberof RiskAssessment
     */
  'version'?: string;
}
/**
 *
 * @export
 * @interface WalletProviderProfile
 */
export interface WalletProviderProfile {
  /**
     *
     * @type {Account}
     * @memberof WalletProviderProfile
     */
  'account'?: Account;
  /**
     *
     * @type {RiskAssessment}
     * @memberof WalletProviderProfile
     */
  'risk_assessment'?: RiskAssessment;
  /**
     *
     * @type {string}
     * @memberof WalletProviderProfile
     */
  'device_score'?: string;
  /**
     *
     * @type {string}
     * @memberof WalletProviderProfile
     */
  'pan_source'?: string;
  /**
     *
     * @type {string}
     * @memberof WalletProviderProfile
     */
  'reason_code'?: string;
  /**
     *
     * @type {Array<string>}
     * @memberof WalletProviderProfile
     */
  'recommendation_reasons'?: Array<string>;
}

/**
 *
 * @export
 * @interface AddressVerification
 */
export interface AddressVerification {
  /**
     *
     * @type {string}
     * @memberof AddressVerification
     */
  'name'?: string;
  /**
     *
     * @type {string}
     * @memberof AddressVerification
     */
  'street_address'?: string;
  /**
     *
     * @type {string}
     * @memberof AddressVerification
     */
  'zip'?: string;
  /**
     *
     * @type {string}
     * @memberof AddressVerification
     */
  'postal_code'?: string;
}

/**
 *
 * @export
 * @interface Authentication
 */
export interface Authentication {
  /**
     *
     * @type {string}
     * @memberof Authentication
     */
  'last_password_update_channel'?: AuthenticationLastPasswordUpdateChannelEnumValues;
  /**
     * yyyy-MM-ddTHH:mm:ssZ
     * @type {string}
     * @memberof Authentication
     */
  'last_password_update_time'?: string;
  /**
     *
     * @type {boolean}
     * @memberof Authentication
     */
  'email_verified'?: boolean;
  /**
     * yyyy-MM-ddTHH:mm:ssZ
     * @type {string}
     * @memberof Authentication
     */
  'email_verified_time'?: string;
}

/**
 *
 * @export
 * @interface IdentificationResponseModel
 */
export interface IdentificationResponseModel {
  /**
     *
     * @type {string}
     * @memberof IdentificationResponseModel
     */
  'type'?: IdentificationResponseModelTypeEnumValues;
  /**
     *
     * @type {string}
     * @memberof IdentificationResponseModel
     */
  'value'?: string;
  /**
     *
     * @type {string}
     * @memberof IdentificationResponseModel
     */
  'expiration_date'?: string;
}

/**
 *
 * @export
 * @interface DigitalWalletTokenMetadata
 */
export interface DigitalWalletTokenMetadata {
  /**
     *
     * @type {string}
     * @memberof DigitalWalletTokenMetadata
     */
  'issuer_product_config_id'?: string;
  /**
     *
     * @type {string}
     * @memberof DigitalWalletTokenMetadata
     */
  'cardproduct_preferred_notification_language'?: string;
}

/**
 *
 * @export
 * @interface UserCardHolderResponse
 */
export interface UserCardHolderResponse {
  /**
     *
     * @type {Authentication}
     * @memberof UserCardHolderResponse
     */
  'authentication'?: Authentication;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'token'?: string;
  /**
     * Default is true
     * @type {boolean}
     * @memberof UserCardHolderResponse
     */
  'active'?: boolean;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'honorific'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'gender'?: UserCardHolderResponseGenderEnumValues;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'first_name'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'middle_name'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'last_name'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'email'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'address1'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'address2'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'city'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'state'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'zip'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'postal_code'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'country'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'birth_date'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'notes'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'phone'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'parent_token'?: string;
  /**
     * Default is false
     * @type {boolean}
     * @memberof UserCardHolderResponse
     */
  'uses_parent_account'?: boolean;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'ssn'?: string;
  /**
     *
     * @type {boolean}
     * @memberof UserCardHolderResponse
     */
  'corporate_card_holder'?: boolean;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'passport_number'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'id_card_number'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'nationality'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'company'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'ip_address'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'password'?: string;
  /**
     * yyyy-MM-ddTHH:mm:ssZ
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'created_time': string;
  /**
     * yyyy-MM-ddTHH:mm:ssZ
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'last_modified_time': string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'business_token'?: string;
  /**
     *
     * @type {{ [key: string]: string; }}
     * @memberof UserCardHolderResponse
     */
  'metadata'?: { [key: string]: string; };
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'account_holder_group_token'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'status'?: UserCardHolderResponseStatusEnumValues;
  /**
     *
     * @type {Array<IdentificationResponseModel>}
     * @memberof UserCardHolderResponse
     */
  'identifications'?: Array<IdentificationResponseModel>;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'passport_expiration_date'?: string;
  /**
     *
     * @type {string}
     * @memberof UserCardHolderResponse
     */
  'id_card_expiration_date'?: string;
}
/**
 *
 * @export
 * @interface DigitalWalletToken
 */
export interface DigitalWalletToken {
  /**
     *
     * @type {string}
     * @memberof DigitalWalletToken
     */
  'token'?: string;
  /**
     *
     * @type {string}
     * @memberof DigitalWalletToken
     */
  'card_token'?: string;
  /**
     *
     * @type {string}
     * @memberof DigitalWalletToken
     */
  'state'?: string;
  /**
     *
     * @type {string}
     * @memberof DigitalWalletToken
     */
  'state_reason'?: string;
  /**
     *
     * @type {string}
     * @memberof DigitalWalletToken
     */
  'fulfillment_status'?: string;
  /**
     *
     * @type {string}
     * @memberof DigitalWalletToken
     */
  'issuer_eligibility_decision'?: string;
  /**
     *
     * @type {string}
     * @memberof DigitalWalletToken
     */
  'created_time'?: string;
  /**
     *
     * @type {string}
     * @memberof DigitalWalletToken
     */
  'last_modified_time'?: string;
  /**
     *
     * @type {TokenServiceProvider}
     * @memberof DigitalWalletToken
     */
  'token_service_provider'?: TokenServiceProvider;
  /**
     *
     * @type {Device}
     * @memberof DigitalWalletToken
     */
  'device'?: Device;
  /**
     *
     * @type {WalletProviderProfile}
     * @memberof DigitalWalletToken
     */
  'wallet_provider_profile'?: WalletProviderProfile;
  /**
     *
     * @type {AddressVerification}
     * @memberof DigitalWalletToken
     */
  'address_verification'?: AddressVerification;
  /**
     *
     * @type {UserCardHolderResponse}
     * @memberof DigitalWalletToken
     */
  'user'?: UserCardHolderResponse;
  /**
     *
     * @type {DigitalWalletTokenMetadata}
     * @memberof DigitalWalletToken
     */
  'metadata'?: DigitalWalletTokenMetadata;
}

/**
 *
 * @export
 * @interface CardholderMetadata
 */
export interface CardholderMetadata {
  /**
     *
     * @type {{ [key: string]: string; }}
     * @memberof CardholderMetadata
     */
  'metadata'?: { [key: string]: string; };
}

/**
 *
 * @export
 * @interface BusinessMetadata
 */
export interface BusinessMetadata {
  /**
     *
     * @type {{ [key: string]: string; }}
     * @memberof BusinessMetadata
     */
  'metadata'?: { [key: string]: string; };
}

/**
 *
 * @export
 * @interface Acquirer
 */
export interface Acquirer {
  /**
     *
     * @type {string}
     * @memberof Acquirer
     */
  'institution_country'?: string;
  /**
     *
     * @type {string}
     * @memberof Acquirer
     */
  'network_international_id'?: string;
  /**
     *
     * @type {string}
     * @memberof Acquirer
     */
  'institution_id_code'?: string;
  /**
     *
     * @type {string}
     * @memberof Acquirer
     */
  'retrieval_reference_number'?: string;
  /**
     *
     * @type {string}
     * @memberof Acquirer
     */
  'system_trace_audit_number'?: string;
}

/**
 *
 * @export
 * @interface NetworkFraudView
 */
export interface NetworkFraudView {
  /**
     *
     * @type {number}
     * @memberof NetworkFraudView
     */
  'transaction_risk_score'?: number;
  /**
     *
     * @type {string}
     * @memberof NetworkFraudView
     */
  'transaction_risk_score_reason_code'?: string;
  /**
     *
     * @type {string}
     * @memberof NetworkFraudView
     */
  'transaction_risk_score_reason_description'?: string;
  /**
     *
     * @type {string}
     * @memberof NetworkFraudView
     */
  'account_risk_score'?: string;
  /**
     *
     * @type {string}
     * @memberof NetworkFraudView
     */
  'account_risk_score_reason_code'?: string;
}

/**
 *
 * @export
 * @interface RiskcontrolTags
 */
export interface RiskcontrolTags {
  /**
     *
     * @type {Array<string>}
     * @memberof RiskcontrolTags
     */
  'values'?: Array<string>;
  /**
     *
     * @type {string}
     * @memberof RiskcontrolTags
     */
  'tag'?: string;
  /**
     *
     * @type {string}
     * @memberof RiskcontrolTags
     */
  'rule_name'?: string;
}

/**
 *
 * @export
 * @interface Tag
 */
export interface Tag {
  /**
     *
     * @type {string}
     * @memberof Tag
     */
  'name'?: string;
  /**
     *
     * @type {string}
     * @memberof Tag
     */
  'value'?: string;
}
/**
 *
 * @export
 * @interface TriggeredRule
 */
export interface TriggeredRule {
  /**
     *
     * @type {string}
     * @memberof TriggeredRule
     */
  'rule_name'?: string;
  /**
     *
     * @type {Array<Tag>}
     * @memberof TriggeredRule
     */
  'tags'?: Array<Tag>;
  /**
     *
     * @type {boolean}
     * @memberof TriggeredRule
     */
  'alert'?: boolean;
  /**
     *
     * @type {string}
     * @memberof TriggeredRule
     */
  'entity_type'?: string;
  /**
     *
     * @type {string}
     * @memberof TriggeredRule
     */
  'acg_level'?: string;
  /**
     *
     * @type {boolean}
     * @memberof TriggeredRule
     */
  'suppress_alert'?: boolean;
}

/**
 *
 * @export
 * @interface IssuerFraudView
 */
export interface IssuerFraudView {
  /**
     *
     * @type {number}
     * @memberof IssuerFraudView
     */
  'score'?: number;
  /**
     *
     * @type {string}
     * @memberof IssuerFraudView
     */
  'risk_level'?: string;
  /**
     *
     * @type {Array<string>}
     * @memberof IssuerFraudView
     */
  'rule_violations'?: Array<string>;
  /**
     *
     * @type {string}
     * @memberof IssuerFraudView
     */
  'recommended_action'?: string;
  /**
     *
     * @type {Array<RiskcontrolTags>}
     * @memberof IssuerFraudView
     */
  'riskcontrol_tags'?: Array<RiskcontrolTags>;
  /**
     *
     * @type {Array<string>}
     * @memberof IssuerFraudView
     */
  'fraud_score_reasons'?: Array<string>;
  /**
     *
     * @type {Array<TriggeredRule>}
     * @memberof IssuerFraudView
     */
  'triggered_rules'?: Array<TriggeredRule>;
}

/**
 *
 * @export
 * @interface NetworkAccountIntelligenceScore
 */
export interface NetworkAccountIntelligenceScore {
  /**
     *
     * @type {string}
     * @memberof NetworkAccountIntelligenceScore
     */
  'service_type'?: string;
  /**
     *
     * @type {string}
     * @memberof NetworkAccountIntelligenceScore
     */
  'name'?: string;
  /**
     *
     * @type {string}
     * @memberof NetworkAccountIntelligenceScore
     */
  'value'?: string;
}
/**
 *
 * @export
 * @interface FraudView
 */
export interface FraudView {
  /**
     *
     * @type {NetworkFraudView}
     * @memberof FraudView
     */
  'network'?: NetworkFraudView;
  /**
     *
     * @type {IssuerFraudView}
     * @memberof FraudView
     */
  'issuer_processor'?: IssuerFraudView;
  /**
     *
     * @type {NetworkAccountIntelligenceScore}
     * @memberof FraudView
     */
  'network_account_intelligence_score'?: NetworkAccountIntelligenceScore;
}

/**
 *
 * @export
 * @interface Pos
 */
export interface Pos {
  /**
     *
     * @type {string}
     * @memberof Pos
     */
  'pan_entry_mode'?: PosPanEntryModeEnumValues;
  /**
     *
     * @type {string}
     * @memberof Pos
     */
  'pin_entry_mode'?: PosPinEntryModeEnumValues;
  /**
     *
     * @type {string}
     * @memberof Pos
     */
  'terminal_id'?: string;
  /**
     *
     * @type {string}
     * @memberof Pos
     */
  'terminal_attendance'?: PosTerminalAttendanceEnumValues;
  /**
     *
     * @type {string}
     * @memberof Pos
     */
  'terminal_location'?: PosTerminalLocationEnumValues;
  /**
     *
     * @type {boolean}
     * @memberof Pos
     */
  'card_holder_presence'?: boolean;
  /**
     *
     * @type {string}
     * @memberof Pos
     */
  'cardholder_authentication_method'?: PosCardholderAuthenticationMethodEnumValues;
  /**
     *
     * @type {boolean}
     * @memberof Pos
     */
  'card_presence'?: boolean;
  /**
     *
     * @type {boolean}
     * @memberof Pos
     */
  'pin_present'?: boolean;
  /**
     *
     * @type {string}
     * @memberof Pos
     */
  'terminal_type'?: PosTerminalTypeEnumValues;
  /**
     *
     * @type {string}
     * @memberof Pos
     */
  'card_data_input_capability'?: PosCardDataInputCapabilityEnumValues;
  /**
     *
     * @type {string}
     * @memberof Pos
     */
  'country_code'?: string;
  /**
     *
     * @type {string}
     * @memberof Pos
     */
  'zip'?: string;
  /**
     *
     * @type {boolean}
     * @memberof Pos
     */
  'partial_approval_capable'?: boolean;
  /**
     *
     * @type {boolean}
     * @memberof Pos
     */
  'purchase_amount_only'?: boolean;
  /**
     *
     * @type {boolean}
     * @memberof Pos
     */
  'is_recurring'?: boolean;
  /**
     *
     * @type {boolean}
     * @memberof Pos
     */
  'is_installment'?: boolean;
  /**
     *
     * @type {string}
     * @memberof Pos
     */
  'special_condition_indicator'?: PosSpecialConditionIndicatorEnumValues;
}

/**
 *
 * @export
 * @interface AddressVerificationModel
 */
export interface AddressVerificationModel {
  /**
     *
     * @type {AvsInformation}
     * @memberof AddressVerificationModel
     */
  'request'?: AvsInformation;
  /**
     *
     * @type {AvsInformation}
     * @memberof AddressVerificationModel
     */
  'on_file'?: AvsInformation;
  /**
     *
     * @type {Response}
     * @memberof AddressVerificationModel
     */
  'response'?: Response;
}

/**
 *
 * @export
 * @interface CardSecurityCodeVerification
 */
export interface CardSecurityCodeVerification {
  /**
     *
     * @type {string}
     * @memberof CardSecurityCodeVerification
     */
  'type': CardSecurityCodeVerificationTypeEnumValues;
  /**
     *
     * @type {Response}
     * @memberof CardSecurityCodeVerification
     */
  'response': Response;
}

/**
 *
 * @export
 * @interface Transit
 */
export interface Transit {
  /**
     *
     * @type {string}
     * @memberof Transit
     */
  'transaction_type'?: TransitTransactionTypeEnumValues;
  /**
     *
     * @type {string}
     * @memberof Transit
     */
  'transportation_mode'?: TransitTransportationModeEnumValues;
}

/**
 *
 * @export
 * @interface Airline
 */
export interface Airline {
  /**
     *
     * @type {string}
     * @memberof Airline
     */
  'passenger_name'?: string;
  /**
     *
     * @type {string}
     * @memberof Airline
     */
  'depart_date'?: string;
  /**
     *
     * @type {string}
     * @memberof Airline
     */
  'origination_city'?: string;
}
/**
 *
 * @export
 * @interface TransactionMetadata
 */
export interface TransactionMetadata {
  /**
     *
     * @type {string}
     * @memberof TransactionMetadata
     */
  'transaction_category'?: TransactionMetadataTransactionCategoryEnumValues;
  /**
     *
     * @type {string}
     * @memberof TransactionMetadata
     */
  'payment_channel'?: TransactionMetadataPaymentChannelEnumValues;
  /**
     *
     * @type {string}
     * @memberof TransactionMetadata
     */
  'special_purchase_id'?: string;
  /**
     *
     * @type {boolean}
     * @memberof TransactionMetadata
     */
  'cross_border_transaction'?: boolean;
  /**
     *
     * @type {number}
     * @memberof TransactionMetadata
     */
  'authorization_life_cycle'?: number;
  /**
     *
     * @type {boolean}
     * @memberof TransactionMetadata
     */
  'is_lodging_auto_rental'?: boolean;
  /**
     *
     * @type {boolean}
     * @memberof TransactionMetadata
     */
  'is_deferred_authorization'?: boolean;
  /**
     *
     * @type {string}
     * @memberof TransactionMetadata
     */
  'lodging_auto_rental_start_date'?: string;
  /**
     *
     * @type {Transit}
     * @memberof TransactionMetadata
     */
  'transit'?: Transit;
  /**
     *
     * @type {Airline}
     * @memberof TransactionMetadata
     */
  'airline'?: Airline;
  /**
     *
     * @type {string}
     * @memberof TransactionMetadata
     */
  'moto_indicator'?: TransactionMetadataMotoIndicatorEnumValues;
  /**
     *
     * @type {boolean}
     * @memberof TransactionMetadata
     */
  'one_leg_out'?: boolean;
}

/**
 *
 * @export
 * @interface OriginalCredit
 */
export interface OriginalCredit {
  /**
     *
     * @type {string}
     * @memberof OriginalCredit
     */
  'transaction_type'?: OriginalCreditTransactionTypeEnumValues;
  /**
     *
     * @type {string}
     * @memberof OriginalCredit
     */
  'funding_source'?: OriginalCreditFundingSourceEnumValues;
  /**
     *
     * @type {string}
     * @memberof OriginalCredit
     */
  'sender_account_type'?: OriginalCreditSenderAccountTypeEnumValues;
  /**
     *
     * @type {string}
     * @memberof OriginalCredit
     */
  'sender_name'?: string;
  /**
     *
     * @type {string}
     * @memberof OriginalCredit
     */
  'sender_address'?: string;
  /**
     *
     * @type {string}
     * @memberof OriginalCredit
     */
  'sender_city'?: string;
  /**
     *
     * @type {string}
     * @memberof OriginalCredit
     */
  'sender_state'?: string;
  /**
     *
     * @type {string}
     * @memberof OriginalCredit
     */
  'sender_country'?: string;
  /**
     *
     * @type {string}
     * @memberof OriginalCredit
     */
  'screening_score'?: string;
  /**
     *
     * @type {string}
     * @memberof OriginalCredit
     */
  'transaction_purpose'?: string;
  /**
     *
     * @type {string}
     * @memberof OriginalCredit
     */
  'deferred_hold_by'?: OriginalCreditDeferredHoldByEnumValues;
  /**
     *
     * @type {boolean}
     * @memberof OriginalCredit
     */
  'fast_funds_enabled'?: boolean;
}

/**
 *
 * @export
 * @interface AccountFunding
 */
export interface AccountFunding {
  /**
     *
     * @type {string}
     * @memberof AccountFunding
     */
  'transaction_type'?: AccountFundingTransactionTypeEnumValues;
  /**
     *
     * @type {string}
     * @memberof AccountFunding
     */
  'funding_source'?: AccountFundingFundingSourceEnumValues;
  /**
     *
     * @type {string}
     * @memberof AccountFunding
     */
  'receiver_account_type'?: AccountFundingReceiverAccountTypeEnumValues;
  /**
     *
     * @type {string}
     * @memberof AccountFunding
     */
  'receiver_name'?: string;
  /**
     *
     * @type {string}
     * @memberof AccountFunding
     */
  'screening_score'?: string;
  /**
     *
     * @type {string}
     * @memberof AccountFunding
     */
  'transaction_purpose'?: string;
}

/**
 *
 * @export
 * @interface CardholderAuthenticationData
 */
export interface CardholderAuthenticationData {
  /**
     *
     * @type {string}
     * @memberof CardholderAuthenticationData
     */
  'electronic_commerce_indicator'?: string;
  /**
     *
     * @type {string}
     * @memberof CardholderAuthenticationData
     */
  'verification_result'?: string;
  /**
     *
     * @type {string}
     * @memberof CardholderAuthenticationData
     */
  'verification_value_created_by'?: string;
  /**
     *
     * @type {Array<string>}
     * @memberof CardholderAuthenticationData
     */
  'acquirer_exemption'?: Array<string>;
  /**
     *
     * @type {string}
     * @memberof CardholderAuthenticationData
     */
  'three_ds_message_version'?: string;
  /**
     *
     * @type {string}
     * @memberof CardholderAuthenticationData
     */
  'authentication_method'?: string;
  /**
     *
     * @type {string}
     * @memberof CardholderAuthenticationData
     */
  'authentication_status'?: string;
  /**
     *
     * @type {string}
     * @memberof CardholderAuthenticationData
     */
  'issuer_exemption'?: string;
}

/**
 *
 * @export
 * @interface Program
 */
export interface Program {
  /**
     *
     * @type {string}
     * @memberof Program
     */
  'program_id': string;
  /**
     *
     * @type {string}
     * @memberof Program
     */
  'short_code': string;
  /**
     *
     * @type {string}
     * @memberof Program
     */
  'long_code': string;
}

export interface TransactionModel{
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'identifier'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'token': string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'user_token'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'business_token'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'acting_user_token': string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'card_token'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'card_product_token'?: string;
  /**
   *
   * @type {boolean}
   * @memberof TransactionModel
   */
  'is_preauthorization'?: boolean;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'deferred_settlement_days'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'national_net_cpd_of_original'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'type': TransactionModelTypeEnumValues;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'state': TransactionModelStateEnumValues;
  /**
   *
   * @type {number}
   * @memberof TransactionModel
   */
  'duration'?: number;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'created_time'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'user_transaction_time'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'settlement_date'?: string;
  /**
   *
   * @type {number}
   * @memberof TransactionModel
   */
  'request_amount'?: number;
  /**
   *
   * @type {number}
   * @memberof TransactionModel
   */
  'amount': number;
  /**
   *
   * @type {number}
   * @memberof TransactionModel
   */
  'cash_back_amount'?: number;
  /**
   *
   * @type {CurrencyConversion}
   * @memberof TransactionModel
   */
  'currency_conversion'?: CurrencyConversion;
  /**
   *
   * @type {number}
   * @memberof TransactionModel
   */
  'issuer_interchange_amount'?: number;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'currency_code'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'approval_code'?: string;
  /**
   *
   * @type {Response}
   * @memberof TransactionModel
   */
  'response'?: Response;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'preceding_related_transaction_token'?: string;
  /**
   *
   * @type {PrecedingTransaction}
   * @memberof TransactionModel
   */
  'preceding_transaction'?: PrecedingTransaction;
  /**
   *
   * @type {number}
   * @memberof TransactionModel
   */
  'amount_to_be_released'?: number;
  /**
   *
   * @type {Array<string>}
   * @memberof TransactionModel
   */
  'incremental_authorization_transaction_tokens'?: Array<string>;
  /**
   *
   * @type {MerchantResponseModel}
   * @memberof TransactionModel
   */
  'merchant'?: MerchantResponseModel;
  /**
   *
   * @type {StoreResponseModel}
   * @memberof TransactionModel
   */
  'store'?: StoreResponseModel;
  /**
   *
   * @type {TransactionCardAcceptor}
   * @memberof TransactionModel
   */
  'card_acceptor'?: TransactionCardAcceptor;
  /**
   *
   * @type {CardholderBalance}
   * @memberof TransactionModel
   */
  'gpa'?: CardholderBalance;
  /**
   *
   * @type {CardResponse}
   * @memberof TransactionModel
   */
  'card'?: CardResponse;
  /**
   *
   * @type {GpaReturns}
   * @memberof TransactionModel
   */
  'gpa_order_unload'?: GpaReturns;
  /**
   *
   * @type {GpaResponse}
   * @memberof TransactionModel
   */
  'gpa_order'?: GpaResponse;
  /**
   *
   * @type {ProgramTransferResponse}
   * @memberof TransactionModel
   */
  'program_transfer'?: ProgramTransferResponse;
  /**
   *
   * @type {FeeTransferResponse}
   * @memberof TransactionModel
   */
  'fee_transfer'?: FeeTransferResponse;
  /**
   *
   * @type {PeerTransferResponse}
   * @memberof TransactionModel
   */
  'peer_transfer'?: PeerTransferResponse;
  /**
   *
   * @type {Array<MsaOrderResponse>}
   * @memberof TransactionModel
   */
  'msa_orders'?: Array<MsaOrderResponse>;
  /**
   *
   * @type {MsaReturns}
   * @memberof TransactionModel
   */
  'msa_order_unload'?: MsaReturns;
  /**
   *
   * @type {Array<OfferOrderResponse>}
   * @memberof TransactionModel
   */
  'offer_orders'?: Array<OfferOrderResponse>;
  /**
   *
   * @type {AutoReloadModel}
   * @memberof TransactionModel
   */
  'auto_reload'?: AutoReloadModel;
  /**
   *
   * @type {DepositDepositResponse}
   * @memberof TransactionModel
   */
  'direct_deposit'?: DepositDepositResponse;
  /**
   *
   * @type {PullFromCardTransferResponse}
   * @memberof TransactionModel
   */
  'pull_from_card'?: PullFromCardTransferResponse;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'polarity'?: TransactionModelPolarityEnumValues;
  /**
   *
   * @type {RealTimeFeeGroup}
   * @memberof TransactionModel
   */
  'real_time_fee_group'?: RealTimeFeeGroup;
  /**
   *
   * @type {Fee}
   * @memberof TransactionModel
   */
  'fee'?: Fee;
  /**
   *
   * @type {ChargebackResponse}
   * @memberof TransactionModel
   */
  'chargeback'?: ChargebackResponse;
  /**
   *
   * @type {DisputeModel}
   * @memberof TransactionModel
   */
  'dispute'?: DisputeModel;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'network'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'subnetwork'?: string;
  /**
   *
   * @type {NetworkMetadata}
   * @memberof TransactionModel
   */
  'network_metadata'?: NetworkMetadata;
  /**
   *
   * @type {number}
   * @memberof TransactionModel
   */
  'acquirer_fee_amount'?: number;
  /**
   *
   * @type {Array<NetworkFeeModel>}
   * @memberof TransactionModel
   */
  'fees'?: Array<NetworkFeeModel>;
  /**
   *
   * @type {DigitalWalletToken}
   * @memberof TransactionModel
   */
  'digital_wallet_token'?: DigitalWalletToken;
  /**
   *
   * @type {CardholderMetadata}
   * @memberof TransactionModel
   */
  'user'?: CardholderMetadata;
  /**
   *
   * @type {BusinessMetadata}
   * @memberof TransactionModel
   */
  'business'?: BusinessMetadata;
  /**
   *
   * @type {Acquirer}
   * @memberof TransactionModel
   */
  'acquirer'?: Acquirer;
  /**
   *
   * @type {FraudView}
   * @memberof TransactionModel
   */
  'fraud'?: FraudView;
  /**
   *
   * @type {Pos}
   * @memberof TransactionModel
   */
  'pos'?: Pos;
  /**
   *
   * @type {AddressVerificationModel}
   * @memberof TransactionModel
   */
  'address_verification'?: AddressVerificationModel;
  /**
   *
   * @type {CardSecurityCodeVerification}
   * @memberof TransactionModel
   */
  'card_security_code_verification'?: CardSecurityCodeVerification;
  /**
   *
   * @type {TransactionMetadata}
   * @memberof TransactionModel
   */
  'transaction_metadata'?: TransactionMetadata;
  /**
   *
   * @type {OriginalCredit}
   * @memberof TransactionModel
   */
  'original_credit'?: OriginalCredit;
  /**
   *
   * @type {AccountFunding}
   * @memberof TransactionModel
   */
  'account_funding'?: AccountFunding;
  /**
   *
   * @type {UserCardHolderResponse}
   * @memberof TransactionModel
   */
  'card_holder_model'?: UserCardHolderResponse;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'standin_approved_by'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'standin_by'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'standin_reason'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'network_reference_id'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'acquirer_reference_id'?: string;
  /**
   *
   * @type {CardholderAuthenticationData}
   * @memberof TransactionModel
   */
  'cardholder_authentication_data'?: CardholderAuthenticationData;
  /**
   *
   * @type {{ [key: string]: string; }}
   * @memberof TransactionModel
   */
  'transaction_attributes'?: { [key: string]: string; };
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'clearing_record_sequence_number'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'issuer_received_time'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'issuer_payment_node'?: string;
  /**
   *
   * @type {Program}
   * @memberof TransactionModel
   */
  'program'?: Program;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'batch_number'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'from_account'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'multi_clearing_sequence_number'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'multi_clearing_sequence_count'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'isaIndicator'?: TransactionModelIsaIndicatorEnumValues;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'enhanced_data_token'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'advice_reason_code'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'advice_reason_details'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'bank_transfer_token'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'interchange_rate_descriptor'?: string;
  /**
   *
   * @type {string}
   * @memberof TransactionModel
   */
  'fee_type'?: string;
  /**
   *
   * @type {ATC Information Model}
   * @memberof TransactionModel
   */
  'atc_information'?: ATCInformationModel;
  /**
 *
 * @type {string}
 * @memberof TransactionModel
 */
  'local_transaction_date'?: string;
}
