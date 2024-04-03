import { StateAbbreviationEnumValues } from '../../lib/constants';

export enum RewardType {
  'CARDLINKED' = 'CARDLINKED',
  'AFFILIATE' = 'AFFILIATE',
}

export enum RewardStatus {
  'APPROVED' = 'APPROVED',
  'SETTLED' = 'SETTLED',
}

export enum TransactionStatus {
  'APPROVED' = 'APPROVED',
  'SETTLED' = 'SETTLED',
  'REVERSED' = 'REVERSED',
  'DECLINED' = 'DECLINED',
  'RETURNED' = 'RETURNED',
}

export const KardMerchantCategoryEnum = {
  ArtsAndEntertainment: 'Arts & Entertainment',
  BabyKidsAndToys: 'Baby, Kids & Toys',
  BooksAndDigitalMedia: 'Books & Digital Media',
  ClothingShoesAndAccessories: 'Clothing, Shoes & Accessories',
  ComputersElectronicsAndSoftware: 'Computers, Electronics & Software',
  Convenience: 'Convenience',
  Gas: 'Gas',
  DepartmentStores: 'Department Stores',
  FoodAndBeverage: 'Food & Beverage',
  HealthAndBeauty: 'Health & Beauty',
  HomeAndGarden: 'Home & Garden',
  Miscellaneous: 'Miscellaneous',
  OccasionsAndGifts: 'Occasions & Gifts',
  Pets: 'Pets',
  SportsAndOutdoors: 'Sports & Outdoors',
  SuppliesAndServices: 'Supplies & Services',
  Travel: 'Travel',
} as const;
export type KardMerchantCategoryEnumValues = (typeof KardMerchantCategoryEnum)[keyof typeof KardMerchantCategoryEnum];

export type KardAccessToken = string;

export type GetSessionTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export type Transaction = {
  transactionId: string;
  referringPartnerUserId: string;
  amount: number; // in cents
  status: TransactionStatus;
  currency: string;
  description: string; // merchant name
  description2?: string;
  coreProviderId?: string; // name of processor
  mcc?: string; // merchant category code
  transactionDate?: string; // timestamp required for REVERSED, DECLINED, RETURNED status - do not include if settled
  authorizationDate?: string; // timestamp required for APPROVED status
  settledDate?: string; // timestamp required for SETTLED status
  merchantId?: string; // Acquirer Merchant ID (MID)
  merchantStoreId?: string;
  cardPresence?: string;
  merchantName?: string;
  merchantAddrCity?: string;
  merchantAddrState?: StateAbbreviationEnumValues;
  merchantAddrZipCode?: string;
  merchantAddrCountry?: string;
  merchantAddrStreet?: string;
  merchantLat?: number;
  merchantLong?: number;
  panEntryMode?: string;
  cardBIN?: string; // valid BIN of 6 digits. If over 6, send only the first 6 digits of the card number
  cardLastFour?: string;
  googleId?: string;
};

export type AffiliateTransactionData = {
  offerId: string;
  total: number;
  identifier: string;
  quantity: number;
  amount: number;
  description: string;
  category: string; // Baseline by default
  commissionToIssuer: number; // commission to Karma Wallet
};

export type EarnedReward = {
  merchantId: string;
  name: string; // merchant name
  type: RewardType;
  status: RewardStatus;
  commissionToIssuer: number; // commission to Karma Wallet
  offerId?: string;
};

export type EarnedRewardTransaction = {
  issuerTransactionId: string; // id that is added when we send the transaction to kard
  transactionId?: string; // only for affiliates
  transactionAmountInCents: number;
  status: TransactionStatus;
  itemsOrdered?: Partial<AffiliateTransactionData>[];
  transactionTimeStamp: string;
};

export type EarnedRewardWebhookBody = {
  issuer?: string; // should always be KARD_ISSUER_NAME
  user: {
    referringPartnerUserId: string; // UserMode.integrations.kard.userId -- a uuuid
  };
  reward: EarnedReward;
  card: {
    bin: string;
    last4: string;
    network: string;
  };
  transaction: EarnedRewardTransaction;
  postDineInLinkURL?: string;
  error?: any;
};

export type QueueTransactionsRequest = Transaction[];

export type CardInfo = {
  last4: string;
  bin: string;
  issuer: string;
  network: string;
};

export type AddCardToUserResponse = {
  email: string;
  id: string;
  userName: string;
  firstName: string;
  lastName: string;
  zipCode: string;
  referringPartner: string;
  referringPartnerUserId: string; // change this one to update the id
  cards: CardInfo[];
};

export type AddCardToUserRequest = {
  referringPartnerUserId: string;
  cardInfo: CardInfo;
};

export type UpdateUserRequest = {
  referringPartnerUserId: string;
  email?: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  zipCode?: string;
  enrolledRewards?: RewardType[]; // empty array to remove all rewards
};

export type CreateUserRequest = {
  email: string;
  userName: string;
  referringPartnerUserId: string;
  firstName?: string;
  lastName?: string;
  zipCode?: string;
  cardInfo?: CardInfo;
  enrolledRewards?: RewardType[];
};

export enum MerchantSource {
  LOCAL = 'LOCAL',
  NATIONAL = 'NATIONAL',
}

export enum CardNetwork {
  Visa = 'VISA',
  Mastercard = 'MASTERCARD',
  Amex = 'AMERICAN EXPRESS',
  Discover = 'DISCOVER',
}
export enum OfferType {
  INSTORE = 'INSTORE',
  ONLINE = 'ONLINE',
}

export enum OfferSource {
  LOCAL = 'LOCAL',
  NATIONAL = 'NATIONAL',
}

export enum CommissionType {
  PERCENT = 'PERCENT',
  FLAT = 'FLAT',
}

export type Offer = {
  _id: string;
  name: string;
  merchantId: string;
  merchantLocationIds?: string[]; // locatin ids when isLocationSpecific is true
  offerType: OfferType;
  source: OfferSource;
  commissionType: CommissionType;
  isLocationSpecific: boolean;
  optInRequired: boolean;
  terms: string;
  expirationDate: string;
  createdDate: string;
  lastModified: string;
  totalCommission: number;
  minRewardAmount: number;
  maxRewardAmount: number;
  minTransactionAmount: number;
  maxTransactionAmount: number;
  redeemableOnce: boolean;
};

export type Merchant = {
  _id: string;
  name: string;
  source: MerchantSource;
  description: string;
  imgUrl: string;
  bannerImgUrl: string;
  websiteURL: string;
  acceptedCards: CardNetwork[];
  category: KardMerchantCategoryEnumValues;
  createdDate: string;
  lastModified: string;
  offers: Offer[];
};

export type LocationMerchant =
  | Merchant
  | {
    source?: MerchantSource;
    type?: string;
  };

export const KardEnvironmentEnum = {
  Aggregator: 'Aggregator',
  Issuer: 'Issuer',
};

export type PaginationFields = {
  page?: number; // Page number (number >= 0)
  limit?: number; // Maximum number of locations (number [1..200])
};

type BaseGetLocationFields =
  | PaginationFields
  | {
    locationName?: string; // Name of location
    googleId?: string; // GoogleId from location
    city?: string; // City of location; REQUIRES state field
    state?: StateAbbreviationEnumValues; // State of location; REQUIRES city field
    zipCode?: string; // Zipcode of location, cannot provide State, City, Longitude, Latitude when using Zipcode
    createdDateStart?: string; // Time in string format for createdDate search (UTC)
    createdDateEnd?: string; // Time in string format for createdDate search (UTC)
    locationNameSort?: 1 | -1; // Sort location names (number enum: 1 or -1)
    citySort?: 1 | -1; // Sort city names (number enum: 1 or -1)
    stateSort?: 1 | -1; // Sort state names (number enum: 1 or -1)
    longitude?: number; // Longitude to search locations from, must provide latitude (number [-180..180])
    latitude?: number; // Latitude to search locations from, must provide longitude (number [-90..90])
    radius?: number; // Radius to search for locations in miles, defaults to 10. Must provide longitude & latitude (number [1..50])
    category?: KardMerchantCategoryEnumValues; // Category of merchant. Use Url Encode for non single word categories. Food & Beverage should be Food%20%26%20Beverage
  };

export type GetLocationsRequest =
  | BaseGetLocationFields
  | {
    source?: OfferSource; // Source of location
  };

export type GetEligibleLocationsRequest =
  | {
    referringPartnerUserId: string; // CardModel.integrations.kard.userId for aggregator env and UserModel.integrations.marqeta.userToken for issuer env
  }
  | (GetLocationsRequest & { referringPartnerUserId: string });

export type LocationAddress = {
  street: string;
  city: string;
  state: StateAbbreviationEnumValues;
  zipCode: number;
};

export type GeoLocation = {
  longitude: number;
  latitude: number;
};

export type OperationHours = {
  SUNDAY: string;
  MONDAY: string;
  TUESDAY: string;
  WEDNESDAY: string;
  THURSDAY: string;
  FRIDAY: string;
  SATURDAY: string;
};

export type LocationOffer = {
  _id: string; // Id of Offer
  totalCommission: number; // Commission going to issuer and cardholder
  issuersCommission?: number; // Commission going to issuer
  usersCommission?: number; // Commission going to cardholder
  commissionType: string; // Type of Commission
  startDate: string; // Beginning date of offer (UTC)
  expirationDate?: string; // Expiration date of offer if applicable (UTC)
  imgUrl: string; // Image impression URL for offer
  bannerImgUrl: string; // Banner image impression URL for offer
};

export type KardMerchantLocation = {
  _id: string; // Id of Location
  name: string; // Name of Location
  merchant: LocationMerchant; // Merchant associated with offer
  locationType: string; // Type of Location; "INSTORE" for locations
  source: OfferSource; // Source of Location
  googleId: string; // GoogleId of location
  address: LocationAddress; // Address of merchant
  geoLocation: GeoLocation; // Coordinates of Merchant
  phone: string; // Phone number for merchant
  operationHours: OperationHours; // Hours of operations
  createdDate: string; // Created date of location (UTC)
  lastModified: string; // Last modified date of location (UTC)
  offers: LocationOffer[]; // Offers of location
  category: KardMerchantCategoryEnumValues; // Category of merchant associated with location
};

export type GetLocationsByMerchantIdRequest = { id: string } | (PaginationFields & { id: string });

export type KardMerchantLocations = KardMerchantLocation[];

export type KardEnvironmentEnumValues = (typeof KardEnvironmentEnum)[keyof typeof KardEnvironmentEnum];

export type GetRewardsMerchantsResponse = Merchant[];

export const KardServerError = new Error('Bad Request');
export const KardInvalidSignatureError = new Error('Invalid Signature');
