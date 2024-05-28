import { FilterQuery, ObjectId, Types } from 'mongoose';
import { Transaction } from 'plaid';
import { SafeParseError, z, ZodError } from 'zod';
import { RareClient } from '../../clients/rare';
import { IMatchedTransaction } from '../../integrations/plaid/types';
import { getCleanCompanies, getMatchResults, matchTransactionsToCompanies } from '../../integrations/plaid/v2_matching';
import { arrayLengthIsFalsyOrZero } from '../../lib/array';
import {
  ErrorTypes,
  MaxCompanyNameLength,
  MaxSafeDoublePercisionFloatingPointNumber,
  MinCompanyNameLength,
  RareTransactionQuery,
  TransactionIntegrationTypesEnum,
  TransactionIntegrationTypesEnumValues,
  UserRoles,
} from '../../lib/constants';
import { CompanyRating } from '../../lib/constants/company';
import {
  TransactionCreditSubtypeEnum,
  sectorsToExcludeFromTransactions,
} from '../../lib/constants/transaction';
import CustomError, { asCustomError } from '../../lib/customError';
import { roundToPercision } from '../../lib/misc';
import { formatZodFieldErrors } from '../../lib/validation';
import { CardModel, ICardDocument, IShareableCard } from '../../models/card';
import { CompanyModel, ICompanyDocument, ICompanySector, IShareableCompany } from '../../models/company';
import { GroupModel } from '../../models/group';
import { ISector, ISectorDocument, SectorModel } from '../../models/sector';
import {
  IMarqetaTransactionIntegration,
  IShareableTransaction,
  ITransaction,
  ITransactionDocument,
  TransactionModel,
} from '../../models/transaction';
import { IUserDocument, UserModel } from '../../models/user';
import { V2TransactionFalsePositiveModel } from '../../models/v2_transaction_falsePositive';
import { V2TransactionManualMatchModel } from '../../models/v2_transaction_manualMatch';
import { V2TransactionMatchedCompanyNameModel } from '../../models/v2_transaction_matchedCompanyName';
import { IRef } from '../../types/model';
import { IRequest } from '../../types/request';
import { getShareableCard } from '../card';
import { convertCompanyModelsToGetCompaniesResponse, getShareableCompany, _getPaginatedCompanies } from '../company';
import { getCompanyRatingsThresholds } from '../misc';
import { calculateCompanyScore } from '../scripts/calculate_company_scores';
import { getShareableSector } from '../sectors';
import { _getTransactions, getTransactionCount } from './utils';
import {
  ITransactionsAggregationRequestQuery,
  ITransactionsRequestQuery,
  IGetRecentTransactionsRequestQuery,
  EnrichTransactionRequest,
  EnrichTransactionResponse,
  IGetFalsePositivesQuery,
  ICreateFalsePositiveRequest,
  IFalsePositiveIdParam,
  IUpdateFalsePositiveRequest,
  IGetManualMatchesQuery,
  ICreateManualMatchRequest,
  IManualMatchIdParam,
  IUpdateManualMatchRequest,
  IGetMatchedCompaniesQuery,
  ITransactionIdParam,
  IInitiateGPADepositsRequest,
} from './types';
import { fundUserGPAFromProgramFundingSource } from '../../integrations/marqeta/gpa';
import { TransactionModelStateEnum } from '../../clients/marqeta/types';
import { CombinedPartialTransaction } from '../../types/transaction';
import { checkIfUserInGroup } from '../groups/utils';
import { CommissionModel } from '../../models/commissions';
import { checkIfUserActiveInMarqeta, getShareableUser } from '../user/utils';
import { IShareableACHTransfer } from '../../models/achTransfer/types';
import { IShareableUser } from '../../models/user/types';
import { IValue, ValueModel } from '../../models/value';
import { IAggregatePaginateResult } from '../../sockets/types/aggregations';
import { ValueCompanyMappingModel } from '../../models/valueCompanyMapping';
import { ICompanyProtocol } from '../company/types';

export const getMarqetaMerchantName = (marqetaData: IMarqetaTransactionIntegration) => {
  const isDirectDeposit = !!marqetaData?.direct_deposit;

  if (!!marqetaData?.relatedTransactions?.length) {
    const completedTransaction = marqetaData?.relatedTransactions.find((t: any) => t.state === TransactionModelStateEnum.Completion);
    if (!!completedTransaction && isDirectDeposit) return completedTransaction?.direct_deposit?.company_name || '';
    return completedTransaction?.card_acceptor?.name || '';
  }

  return marqetaData?.card_acceptor?.name || '';
};

export const _deleteTransactions = async (query: FilterQuery<ITransactionDocument>) => TransactionModel.deleteMany(query);

export const getRatedTransactions = async (req: IRequest<{}, ITransactionsAggregationRequestQuery>): Promise<IAggregatePaginateResult<ITransactionDocument & { values: IValue[] }>> => {
  try {
    const { ratings, userId, page, limit } = req.query;

    if (!req.requestor) throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);

    if (!ratings || !ratings.length) {
      throw new CustomError('A company rating is required to get rated transactions.', ErrorTypes.INVALID_ARG);
    }

    const _ratings = Array.isArray(ratings) ? ratings : [...(ratings as string).split(',')];

    const invalidRatings = _ratings.filter((rating) => !Object.values(CompanyRating).find((r) => r === rating));
    if (invalidRatings.length) {
      throw new CustomError('One or more of the ratings found are invalid.', ErrorTypes.INVALID_ARG);
    }

    const userQuery: FilterQuery<ITransaction> = {
      $and: [{ company: { $ne: null } }, { sector: { $nin: sectorsToExcludeFromTransactions } }, { amount: { $gt: 0 } }],
    };

    if (!!userId) {
      if (req.requestor._id.toString() !== userId && req.requestor.role === UserRoles.None) {
        throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);
      }

      const _userId = new Types.ObjectId(userId);

      userQuery.$and.push({
        $or: [{ user: _userId }, { 'onBehalfOf.user': _userId }],
      });
    } else {
      userQuery.$and.push({
        $or: [{ user: req.requestor._id }, { 'onBehalfOf.user': req.requestor._id }],
      });
    }

    const companyRatingThresholds = await getCompanyRatingsThresholds();

    const companyQuery: FilterQuery<ITransaction> = {
      $or: _ratings.map((rating) => {
        if (rating === CompanyRating.Positive) {
          return { 'company.combinedScore': { $gte: companyRatingThresholds[CompanyRating.Positive].min } };
        }

        if (rating === CompanyRating.Negative) {
          return { 'company.combinedScore': { $lte: companyRatingThresholds[CompanyRating.Negative].max } };
        }

        return {
          $and: [
            { 'company.combinedScore': { $gte: companyRatingThresholds[CompanyRating.Neutral].min } },
            { 'company.combinedScore': { $lte: companyRatingThresholds[CompanyRating.Neutral].max } },
          ],
        };
      }),
    };

    const transactionAggregate = TransactionModel.aggregate([
      {
        $match: userQuery,
      },
      {
        $lookup: {
          from: 'companies',
          localField: 'company',
          foreignField: '_id',
          as: 'company',
        },
      },
      {
        $unwind: {
          path: '$company',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: companyQuery,
      },
      {
        $match: { status: { $ne: TransactionModelStateEnum.Declined } },
      },
      {
        $sort: { date: -1 },
      },
    ]);

    const options = {
      page: page ?? 1,
      limit: limit ?? 10,
    };

    const transactions = (await TransactionModel.aggregatePaginate(transactionAggregate, options) as IAggregatePaginateResult<ITransactionDocument & { values: IValue[], company: ICompanyDocument }>);

    const pageIncludesOffsets = transactions.docs.filter((transaction) => !!transaction.integrations?.rare).length;

    if (!!pageIncludesOffsets) {
      try {
        const Rare = new RareClient();
        const rareTransactions = await Rare.getTransactions(req.requestor?.integrations?.rare?.userId);

        transactions.docs.forEach((transaction) => {
          const matchedRareTransaction = rareTransactions.transactions.find(
            (rareTransaction) => transaction.integrations.rare.transaction_id === rareTransaction.transaction_id,
          );
          transaction.integrations.rare.certificateUrl = matchedRareTransaction?.certificate_url;
        });
      } catch (err) {
        console.log('[-] Failed to retrieve Rare transactions');
        console.log(err);
      }
    }

    // map the values to the transaction
    const valueMappings = await ValueCompanyMappingModel.find({ company: { $in: transactions.docs.map((t) => t.company) } });
    const values = await ValueModel.find({ _id: { $in: valueMappings.map((v) => v.value) } });

    transactions.docs.forEach((transaction) => {
      const matchedValueCompanyMappings = valueMappings.filter((v) => v.company.toString() === transaction.company._id.toString());
      transaction.values = matchedValueCompanyMappings.map((v) => values.find((value) => value._id.toString() === v.value.toString()));
    });

    return transactions;
  } catch (err) {
    throw asCustomError(err);
  }
};

const getTransactionIntegrationFilter = (integrationType: TransactionIntegrationTypesEnumValues): FilterQuery<ITransactionDocument> => {
  switch (integrationType) {
    case TransactionIntegrationTypesEnum.Plaid:
      return { 'integrations.plaid': { $ne: null } };
    case TransactionIntegrationTypesEnum.Rare:
      return { 'integrations.rare': { $ne: null } };
    case TransactionIntegrationTypesEnum.Kard:
      return { 'integrations.kard': { $ne: null } };
    case TransactionIntegrationTypesEnum.Marqeta:
      return { 'integrations.marqeta': { $ne: null } };
    default:
      return {};
  }
};

export const getTransactions = async (req: IRequest<{}, ITransactionsRequestQuery>, query: FilterQuery<ITransaction>) => {
  const { userId, includeOffsets, includeNullCompanies, onlyOffsets, integrationType, startDate, endDate } = req.query;
  if (!req.requestor) throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);

  let startDateQuery = {};
  let endDateQuery = {};

  if (!!startDate) {
    if (isNaN(new Date(startDate).getTime())) throw new CustomError('Invalid start date found. Must be a valid date.');
    delete query.startDate;
    startDateQuery = {
      date: {
        $gte: startDate,
      },
    };
  }

  if (!!endDate) {
    if (isNaN(new Date(startDate).getTime())) throw new CustomError('Invalid end date found. Must be a valid date.');
    delete query.endDate;
    endDateQuery = {
      date: {
        $lte: endDate,
      },
    };
  }

  const paginationOptions = {
    projection: query?.projection || '',
    populate: query.population || [
      {
        path: 'card',
        model: CardModel,
      },
      {
        path: 'sector',
        model: SectorModel,
      },
      {
        path: 'company',
        model: CompanyModel,
      },
      {
        path: 'association.user',
        model: UserModel,
      },
      {
        path: 'association.group',
        model: GroupModel,
      },
    ],
    page: query?.skip || 1,
    sort: query?.sort ? { ...query.sort, _id: -1 } : { date: -1, _id: -1 },
    limit: query?.limit || 10,
  };

  const filter: FilterQuery<ITransaction> = {
    $and: [
      ...Object.entries(query.filter)
        .filter(
          ([key]) => key !== 'userId'
            && key !== 'includeOffsets'
            && key !== 'includeNullCompanies'
            && key !== 'onlyOffsets'
            && key !== 'startDate'
            && key !== 'endDate'
            && key !== 'integrationType'
            && key !== 'includeDeclined',
        )
        .map(([key, value]) => ({ [key]: value })),
      { sector: { $nin: sectorsToExcludeFromTransactions } },
      { status: { $ne: TransactionModelStateEnum.Declined } },
      { amount: { $gt: 0 } },
    ],
  };

  if (!!userId) {
    if (req.requestor._id.toString() !== userId && req.requestor.role === UserRoles.None) {
      throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);
    }

    filter.$and.push({
      $or: [{ user: userId }, { 'onBehalfOf.user': userId }],
    });
  } else {
    filter.$and.push({
      $or: [{ user: req.requestor }, { 'onBehalfOf.user': req.requestor }],
    });
  }

  if (!!onlyOffsets) filter.$and.push({ 'integrations.rare': { $ne: null } });
  if (!includeOffsets && !onlyOffsets) filter.$and.push({ 'integrations.rare': null });
  if (!includeNullCompanies) filter.$and.push({ company: { $ne: null } });
  if (!!integrationType) filter.$and.push(getTransactionIntegrationFilter(integrationType));
  if (!!startDate) filter.$and.push(startDateQuery);
  if (!!endDate) filter.$and.push(endDateQuery);

  const transactions = await TransactionModel.paginate(filter, paginationOptions);

  if (includeOffsets || onlyOffsets) {
    const pageIncludesOffsets = transactions.docs.filter((transaction) => !!transaction.integrations?.rare).length;

    if (!!pageIncludesOffsets) {
      try {
        const Rare = new RareClient();
        const rareTransactions = await Rare.getTransactions(req.requestor?.integrations?.rare?.userId);

        transactions.docs.forEach((transaction) => {
          const matchedRareTransaction = rareTransactions.transactions.find(
            (rareTransaction) => transaction.integrations.rare.transaction_id === rareTransaction.transaction_id,
          );
          transaction.integrations.rare.certificateUrl = matchedRareTransaction?.certificate_url;
        });
      } catch (err) {
        console.log('[-] Failed to retrieve Rare transactions');
        console.log(err);
      }
    }
  }

  return transactions;
};

export const getMostRecentTransactions = async (req: IRequest<{}, IGetRecentTransactionsRequestQuery>) => {
  try {
    const { limit = 5, unique = true, userId, integrationType } = req.query;
    const _limit = parseInt(limit.toString());
    if (isNaN(_limit)) throw new CustomError('Invalid limit found. Must be a number.');

    const query: FilterQuery<ITransactionDocument> = {
      $and: [{ sector: { $nin: sectorsToExcludeFromTransactions } }, { status: { $ne: TransactionModelStateEnum.Declined } }],
    };

    if (!!userId) {
      if (req.requestor._id.toString() !== userId && req.requestor.role === UserRoles.None) {
        throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);
      }

      query.$and.push({
        $or: [{ user: userId }, { 'onBehalfOf.user': userId }],
      });
    } else {
      query.$and.push({
        $or: [{ user: req.requestor._id }, { 'onBehalfOf.user': req.requestor._id }],
      });
    }

    query.$and.push({ 'integrations.rare': null });

    if (!!integrationType) {
      query.$and.push(getTransactionIntegrationFilter(integrationType));
    } else {
      query.$and.push({ company: { $ne: null } });
    }

    const transactions = await _getTransactions(query, integrationType === TransactionIntegrationTypesEnum.Marqeta);

    if (integrationType === TransactionIntegrationTypesEnum.Marqeta) {
      return transactions.slice(0, _limit);
    }

    const uniqueCompanies = new Set();
    const recentTransactions: ITransactionDocument[] = [];

    for (const transaction of transactions) {
      if (unique && uniqueCompanies.has((transaction.company as ICompanyDocument)?._id.toString())) continue;

      recentTransactions.push(transaction);
      uniqueCompanies.add((transaction.company as ICompanyDocument)?._id.toString());

      if (recentTransactions.length === _limit) break;
    }

    return recentTransactions;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getCarbonOffsetTransactions = async (req: IRequest) => {
  const Rare = new RareClient();
  const transactions: ITransactionDocument[] = await TransactionModel.find({
    $and: [
      { sector: { $nin: sectorsToExcludeFromTransactions } },
      { amount: { $gt: 0 } },
      {
        $or: [{ userId: req?.requestor?._id }, { 'onBehalfOf.user': req?.requestor?._id }],
      },
      { matchType: null },
      { ...RareTransactionQuery },
    ],
  });

  if (transactions.length === 0) return [];

  const rareTransactions = await Rare.getTransactions(req.requestor?.integrations?.rare?.userId);

  return transactions.map((transaction) => {
    const matchedRareTransaction = rareTransactions.transactions.find(
      (rareTransaction) => transaction.integrations.rare.transaction_id === rareTransaction.transaction_id,
    );
    transaction.integrations.rare.certificateUrl = matchedRareTransaction?.certificate_url;
    return transaction;
  });
};

export const getShareableTransaction = async ({
  _id,
  user,
  company,
  card,
  sector,
  status,
  amount,
  date,
  achTransfer,
  reversed,
  createdOn,
  lastModified,
  integrations,
  settledDate,
  sortableDate,
  type,
  subType,
  group,
}: ITransactionDocument, skipKard = false) => {
  const _user: IRef<ObjectId, IShareableUser> = !!(user as IUserDocument)?.name ? getShareableUser(user as IUserDocument) : user;

  const _card: IRef<ObjectId, IShareableCard> = !!(card as ICardDocument)?.mask ? getShareableCard(card as ICardDocument) : card;

  const _achtransfer: IRef<ObjectId, IShareableACHTransfer> = achTransfer;

  const _company: IRef<ObjectId, IShareableCompany> = !!(company as ICompanyDocument)?.companyName
    ? getShareableCompany(company as ICompanyDocument)
    : company;

  const _sector: IRef<ObjectId, ISector> = !!(sector as ISectorDocument)?.name ? getShareableSector(sector as ISectorDocument) : sector;

  const shareableTransaction: Partial<IShareableTransaction & { _id: string }> = {
    _id,
    user: _user,
    company: _company,
    card: _card,
    sector: _sector,
    amount,
    date,
    reversed,
    createdOn,
    lastModified,
    type,
    settledDate,
    sortableDate,
    subType,
    status,
    group,
  };

  if (!!_achtransfer) shareableTransaction.achTransfer = _achtransfer;

  if (integrations?.rare) {
    const { projectName, tonnes_amt: offsetsPurchased, certificateUrl } = integrations.rare;

    const rareIntegration = {
      projectName,
      offsetsPurchased,
      certificateUrl,
    };

    shareableTransaction.integrations = {
      ...shareableTransaction.integrations,
      rare: rareIntegration,
    };
  }

  let earnedCommission;

  if (!!integrations?.kard && !skipKard) {
    // does a commission exist for this transaction?
    if (!!integrations?.kard?.rewardData) {
      // if so, add it to the shareable transaction
      const associatedCommission = await CommissionModel.findOne({ transaction: _id });
      if (!!associatedCommission?._id) {
        earnedCommission = {
          id: associatedCommission._id.toString(),
          amount: associatedCommission.amount,
          karmaAllocation: associatedCommission.allocation.karma,
          userAllocation: associatedCommission.allocation.user,
        };
      }
    }
    shareableTransaction.earnedCommission = earnedCommission;

    const kardIntegration = {
      id: integrations.kard.id,
      status: integrations.kard.status,
    };

    shareableTransaction.integrations = {
      ...shareableTransaction.integrations,
      kard: kardIntegration,
    };
  }

  if (!!integrations?.marqeta) {
    const {
      token,
      user_token: userToken,
      card_token: cardToken,
      state,
      created_time: createdTime,
      request_amount: requestAmount,
      amount: marqetaAmount,
      settlement_date: settlementDate,
      currency_code: currencyCode,
    } = integrations.marqeta;

    const merchantName = getMarqetaMerchantName(integrations.marqeta);

    const marqetaIntegration: any = {
      token,
      userToken,
      cardToken,
      type: integrations.marqeta.type,
      state,
      createdTime,
      requestAmount,
      amount: marqetaAmount,
      settlementDate,
      currencyCode,
      merchantName,
      cardMask: integrations.marqeta?.card?.last_four || null,
    };

    if (!!integrations?.marqeta?.gpa_order) {
      marqetaIntegration.gpa_order = integrations.marqeta.gpa_order;
    }

    if (!!integrations?.marqeta?.direct_deposit) {
      marqetaIntegration.direct_deposit = {
        type: integrations.marqeta?.direct_deposit?.type,
        company_name: merchantName,
      };
    }

    shareableTransaction.integrations = {
      ...shareableTransaction.integrations,
      marqeta: marqetaIntegration,
    };
  }

  return shareableTransaction;
};

export const getShareableTransactionWithValues = async (transaction: (ITransactionDocument & {values: IValue[]})): Promise<(Partial<IShareableTransaction> & {values: IValue[]})> => {
  const shareableTransaction = await getShareableTransaction(transaction, true) as Partial<IShareableTransaction>;
  const shareableTransactionWithValues = {
    ...shareableTransaction,
    values: transaction?.values?.length > 0 ? transaction.values : undefined,
  };
  return shareableTransactionWithValues;
};

export const hasTransactions = async (req: IRequest<{}, ITransactionsRequestQuery>) => {
  try {
    const { userId, includeOffsets, includeNullCompanies, integrationType } = req.query;
    const _userId = userId ?? req.requestor._id;

    const query: FilterQuery<ITransaction> = {
      $and: [
        { sector: { $nin: sectorsToExcludeFromTransactions } },
        {
          $or: [{ user: _userId }, { 'onBehalfOf.user': _userId }],
        },
      ],
    };

    if (!includeOffsets) query.$and.push({ 'integrations.rare': null });
    if (!includeNullCompanies) query.$and.push({ company: { $ne: null } });
    if (!!integrationType) query.$and.push(getTransactionIntegrationFilter(integrationType));

    const count = await getTransactionCount(query);

    return count > 0;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const matchTransactionCompanies = async (
  transactions: CombinedPartialTransaction[],
  saveMatches = false,
): Promise<{ matched: IMatchedTransaction[]; notMatched: CombinedPartialTransaction[] }> => {
  let remainingTransactions = transactions;
  let matchedTransactions: IMatchedTransaction[] = [];

  try {
    // handle known false positive matches
    const falsePositives = await V2TransactionFalsePositiveModel.find({});

    const foundFalsePositives: CombinedPartialTransaction[] = [];
    remainingTransactions = remainingTransactions.filter((t) => {
      if (falsePositives.find((fp) => fp.originalValue === t[fp.matchType])) {
        foundFalsePositives.push(t);
        return false;
      }
      return true;
    });

    if (foundFalsePositives?.length > 0) {
      matchedTransactions = [...foundFalsePositives];
      if (arrayLengthIsFalsyOrZero(remainingTransactions)) {
        return { matched: matchedTransactions, notMatched: remainingTransactions };
      }
    }
  } catch (err) {
    console.error(`Error looking up false positive matches: ${err}`);
  }

  try {
    // check if this is a manual match
    const manualMatches = await V2TransactionManualMatchModel.find({});
    const foundManualMatches: IMatchedTransaction[] = [];
    remainingTransactions = remainingTransactions.filter((t) => {
      const manualMatch = manualMatches.find((mm) => mm.originalValue === t[mm.matchType]);
      if (manualMatch) {
        foundManualMatches.push({ ...t, company: manualMatch.company });
        return false;
      }
      return true;
    });

    if (foundManualMatches.length > 0) {
      matchedTransactions = [...foundManualMatches, ...matchedTransactions];
      if (arrayLengthIsFalsyOrZero(remainingTransactions)) {
        return { matched: matchedTransactions, notMatched: remainingTransactions };
      }
    }
  } catch (err) {
    console.error(`Error looking up manual matches: ${err}`);
  }

  try {
    // check if this match has been cached
    const alreadyMatchedCompanies = await V2TransactionMatchedCompanyNameModel.find({});
    const [matchedResults, nonMatchedResults] = matchTransactionsToCompanies(remainingTransactions, alreadyMatchedCompanies);
    remainingTransactions = nonMatchedResults;

    if (matchedResults?.length > 0) {
      matchedTransactions = [...matchedResults, ...matchedTransactions];
      if (arrayLengthIsFalsyOrZero(remainingTransactions)) {
        return {
          matched: matchedTransactions,
          notMatched: remainingTransactions,
        };
      }
    }
  } catch (err) {
    console.error(`Error looking up previously saved matches: ${err}`);
  }

  try {
    // run text matching on any unmatched transactions remaining
    const cleanedCompanies = await getCleanCompanies();
    const textMatchingResults = await getMatchResults({
      transactions: remainingTransactions,
      cleanedCompanies,
      saveMatches,
    });
    const [matched, notMatched] = matchTransactionsToCompanies(remainingTransactions, textMatchingResults);

    matchedTransactions = [...matched, ...matchedTransactions];
    return { matched: matchedTransactions, notMatched };
  } catch (err) {
    console.error(`Error in text matching: ${err}`);
    return { matched: matchedTransactions, notMatched: remainingTransactions };
  }
};

export const getCarbonEmissionsForTransaction = (carbonMultiplier: number, transactionAmount: number) => {
  // get the carbon emmissions
  let carbonEmissionKilograms = 0;

  if (!!carbonMultiplier && !!transactionAmount) {
    carbonEmissionKilograms = roundToPercision(carbonMultiplier * transactionAmount, 2);
  }

  return carbonEmissionKilograms;
};

export const enrichTransaction = async (req: IRequest<{}, {}, EnrichTransactionRequest>): Promise<EnrichTransactionResponse> => {
  try {
    // create zod schema
    const transactionRequestSchema = z.object({
      companyName: z.string().min(MinCompanyNameLength).max(MaxCompanyNameLength),
      alternateCompanyName: z.string().min(MinCompanyNameLength).max(MaxCompanyNameLength).optional(),
      amount: z.number().positive().lt(MaxSafeDoublePercisionFloatingPointNumber),
    });

    // validate request body
    const parsed = transactionRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const formattedError = formatZodFieldErrors(
        ((parsed as SafeParseError<EnrichTransactionRequest>)?.error as ZodError)?.formErrors?.fieldErrors,
      );
      throw new CustomError(`${formattedError || 'Error parsing request body'}`, ErrorTypes.INVALID_ARG);
    }

    const transaction = {
      name: parsed.data.companyName,
      amount: parsed.data.amount,
      merchant_name: parsed.data.alternateCompanyName || parsed.data.companyName,
    };

    const matchingResults = await matchTransactionCompanies([transaction as Transaction], true);
    const matchedTransaction = matchingResults?.matched[0] as IMatchedTransaction;

    if (!matchedTransaction || !(matchedTransaction as unknown as { company: Types.ObjectId }).company) {
      throw new CustomError(`No match found for request: ${JSON.stringify(transaction)} `, ErrorTypes.SERVER);
    }

    // get company and sector from db
    let company: ICompanyProtocol | null = null;
    let sector: ICompanySector | null = null;
    try {
      const companies = await _getPaginatedCompanies({ filter: { _id: matchedTransaction.company } });

      if (!companies || !companies?.docs?.length) {
        throw Error('No company found');
      }
      sector = companies.docs[0].sectors.find((s) => s.primary);
      company = (await convertCompanyModelsToGetCompaniesResponse(companies, req.apiRequestor))?.companies[0];
    } catch (err) {
      throw new CustomError(`Error getting company from transaction match: ${JSON.stringify(matchedTransaction)} `, ErrorTypes.SERVER);
    }

    let carbonEmissionKilograms = 0;

    if (!!(sector?.sector as ISectorDocument)?.carbonMultiplier && !!matchedTransaction?.amount) {
      carbonEmissionKilograms = getCarbonEmissionsForTransaction(
        (sector?.sector as ISectorDocument)?.carbonMultiplier,
        matchedTransaction?.amount,
      );
    }

    // get a karma score
    const karmaScore = roundToPercision(calculateCompanyScore(company.score), 0);

    return {
      karmaScore,
      carbonEmissionKilograms,
      company,
    };
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getFalsePositives = async (req: IRequest<{}, IGetFalsePositivesQuery, {}>) => {
  try {
    const { page = 1, limit = 50, matchType, originalValue, company, search } = req.query;

    const query: any = {};

    if (matchType) query.matchType = matchType;
    if (originalValue) query.originalValue = originalValue;
    if (company) query.company = company;
    if (search) query.$text = { $search: search };

    const falsePositives = await V2TransactionFalsePositiveModel.paginate(query, {
      page,
      limit,
      lean: true,
      sort: { createdOn: -1 },
    });
    return falsePositives;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const createFalsePositive = async (req: IRequest<{}, {}, ICreateFalsePositiveRequest>) => {
  try {
    const { matchType, originalValue } = req.body;
    if (!matchType || !originalValue) throw new CustomError('Missing required fields', ErrorTypes.INVALID_ARG);
    const falsePositive = new V2TransactionFalsePositiveModel({
      matchType,
      originalValue,
    });
    await falsePositive.save();
    return falsePositive;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const deleteFalsePositive = async (req: IRequest<IFalsePositiveIdParam, {}, {}>) => {
  try {
    const { id } = req.params;
    const falsePositive = await V2TransactionFalsePositiveModel.findByIdAndDelete(id);
    return falsePositive;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const updateFalsePositive = async (req: IRequest<IFalsePositiveIdParam, {}, IUpdateFalsePositiveRequest>) => {
  try {
    const { id } = req.params;
    const { matchType, originalValue } = req.body;
    const update: IUpdateFalsePositiveRequest = {};
    if (matchType) update.matchType = matchType;
    if (originalValue) update.originalValue = originalValue;
    const falsePositive = await V2TransactionFalsePositiveModel.findOneAndUpdate({ _id: id }, update, { new: true });
    return falsePositive;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getManualMatches = async (req: IRequest<{}, IGetManualMatchesQuery, {}>) => {
  try {
    const { page = 1, limit = 50, search } = req.query;

    const query: any = {};

    if (search) query.$text = { $search: search };

    const manualMatches = await V2TransactionManualMatchModel.paginate(query, {
      page,
      limit,
      lean: true,
      populate: [
        {
          path: 'company',
          model: 'company',
          select: 'companyName',
        },
      ],
      sort: { createdOn: -1 },
    });
    return manualMatches;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const createManualMatch = async (req: IRequest<{}, {}, ICreateManualMatchRequest>) => {
  try {
    const { matchType, company, originalValue } = req.body;
    if (!matchType || !company || !originalValue) {
      throw new CustomError('Missing required fields', ErrorTypes.INVALID_ARG);
    }
    const manualMatch = new V2TransactionManualMatchModel({
      matchType,
      company,
      originalValue,
    });
    await manualMatch.save();
    return manualMatch;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const deleteManualMatch = async (req: IRequest<IManualMatchIdParam, {}, {}>) => {
  try {
    const { id } = req.params;
    const manualMatch = await V2TransactionManualMatchModel.findByIdAndDelete(id);
    return manualMatch;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const updateManualMatch = async (req: IRequest<IManualMatchIdParam, {}, IUpdateManualMatchRequest>) => {
  try {
    const { id } = req.params;
    const { matchType, company, originalValue } = req.body;
    const update: IUpdateManualMatchRequest = {};
    if (matchType) update.matchType = matchType;
    if (company) update.company = company;
    if (originalValue) update.originalValue = originalValue;
    const manualMatch = await V2TransactionManualMatchModel.findOneAndUpdate({ _id: id }, update, { new: true });
    return manualMatch;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getMatchedCompanies = async (req: IRequest<{}, IGetMatchedCompaniesQuery, {}>) => {
  try {
    const { page = 1, limit = 50, search } = req.query;

    const query: any = { company: { $ne: null } };

    if (search) query.$text = { $search: search };

    const matchedCompanies = await V2TransactionMatchedCompanyNameModel.paginate(query, {
      page,
      limit,
      populate: [
        {
          path: 'company',
          model: 'company',
          select: 'companyName',
        },
      ],
      lean: true,
      sort: { createdOn: -1 },
    });
    return matchedCompanies;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getTransaction = async (req: IRequest<ITransactionIdParam, {}, {}>) => {
  let carbonEmissionsMetricTonnes = 0;
  let groupName = '';
  const { transactionId } = req.params;
  const matchedTransaction = await TransactionModel.findOne({
    _id: transactionId,
    user: req.requestor._id,
  })
    .populate('company')
    .populate('sector')
    .populate({ path: 'achTransfer', options: { strictPopulate: false } });

  if (!matchedTransaction) throw new CustomError('No transaction found with given id.', ErrorTypes.NOT_FOUND);

  const sectorData = await SectorModel.findById(matchedTransaction.sector);

  if (!!sectorData && !!sectorData?.carbonMultiplier && !!matchedTransaction?.amount) {
    carbonEmissionsMetricTonnes = getCarbonEmissionsForTransaction(sectorData.carbonMultiplier, matchedTransaction?.amount) / 1000;
  }

  if (matchedTransaction.group) {
    const groupData = await GroupModel.findById(matchedTransaction.group);

    if (!!groupData) {
      groupName = groupData.name;
    }
  }

  return {
    carbonEmissionsMetricTonnes,
    groupName,
    transaction: await getShareableTransaction(matchedTransaction),
  };
};

export const isValidMemoLength = (memo: string) => memo.length > 99;

export const processEmployerGPADeposits = async (deposits: IInitiateGPADepositsRequest) => {
  const { groupId, type, gpaDeposits, memo } = deposits;
  const group = await GroupModel.findById(groupId);

  if (!group) {
    throw new CustomError(`Group with groupId: ${groupId} not found.`, ErrorTypes.NOT_FOUND);
  }

  const errors = [];
  const success = [];

  for (const deposit of gpaDeposits) {
    const tags = `groupId=${groupId},type=${type}`;
    const userInGroup = await checkIfUserInGroup(deposit.userId, groupId);
    const userActiveInMarqeta = await checkIfUserActiveInMarqeta(deposit.userId);

    // Update this later to return a list of errors or something to person running script
    if (!userActiveInMarqeta) {
      console.log(`[+] Use ${deposit.userId} not active in Marqeta, skipping deposit`);
    }

    if (!userInGroup) {
      console.error(`User ${deposit.userId} is not in group ${groupId}`);
      continue;
    }

    const gpaFundResponse = await fundUserGPAFromProgramFundingSource({
      userId: deposit.userId,
      amount: deposit.amount,
      tags,
      memo: !!memo ? memo : `You received money from ${group.name}`,
    });

    if (!gpaFundResponse.data) {
      errors.push(`${deposit.userId} : ${JSON.stringify(gpaFundResponse)}`);
    }

    success.push(`${deposit.userId}`);
  }

  return {
    success,
    errors,
  };
};

export const processCashbackGPADeposits = async (deposits: IInitiateGPADepositsRequest) => {
  const { type, gpaDeposits, memo } = deposits;

  const success = [];
  const errors = [];

  for (const deposit of gpaDeposits) {
    const tags = `type=${type}`;
    const gpaFundResponse = await fundUserGPAFromProgramFundingSource({
      userId: deposit.userId,
      amount: deposit.amount,
      tags,
      memo: !!memo ? memo : 'You earned Karma Cash!',
    });

    if (!gpaFundResponse.data) {
      errors.push(`${deposit.userId} : ${JSON.stringify(gpaFundResponse)}`);
    }

    success.push(deposit.userId);
  }

  return {
    success,
    errors,
  };
};

// make a custom one at some point
export const processProgramCreditDeposit = async (deposits: IInitiateGPADepositsRequest) => {
  const { type, gpaDeposits, memo } = deposits;

  const success = [];
  const errors = [];

  for (const deposit of gpaDeposits) {
    let _tags = [`type=${type}`];

    if (!!deposit.tags) _tags = [..._tags, ...deposit.tags];

    const gpaFundResponse = await fundUserGPAFromProgramFundingSource({
      userId: deposit.userId,
      amount: deposit.amount,
      tags: _tags.join(', '),
      memo: !!memo ? memo : 'Courtesy credit from Karma Wallet',
    });

    if (!gpaFundResponse.data) {
      errors.push(`${deposit.userId} : ${JSON.stringify(gpaFundResponse)}`);
    }

    success.push(deposit.userId);
  }

  return {
    success,
    errors,
  };
};

export const processGPADeposits = async (deposits: IInitiateGPADepositsRequest) => {
  const { groupId, type, memo } = deposits;

  if (!!memo && !isValidMemoLength) {
    throw new CustomError('Memo must be 99 characters or less', ErrorTypes.INVALID_ARG);
  }

  if (type === TransactionCreditSubtypeEnum.Employer) {
    if (!groupId) throw new CustomError('Missing group id', ErrorTypes.INVALID_ARG);
    const depositsResponse = await processEmployerGPADeposits(deposits);
    return depositsResponse;
  }

  if (type === TransactionCreditSubtypeEnum.Cashback) {
    const response = await processCashbackGPADeposits(deposits);
    return response;
  }

  if (type === TransactionCreditSubtypeEnum.ProgramCredit) {
    const response = await processProgramCreditDeposit(deposits);
    return response;
  }

  throw new CustomError('Invalid type', ErrorTypes.INVALID_ARG);
};
