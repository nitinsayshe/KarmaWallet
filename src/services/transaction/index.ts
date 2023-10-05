import { AqpQuery } from 'api-query-params';
import { FilterQuery, ObjectId, Types } from 'mongoose';
import { Transaction } from 'plaid';
import { SafeParseError, z, ZodError } from 'zod';
import { RareClient } from '../../clients/rare';
import { IMatchedTransaction } from '../../integrations/plaid/types';
import { getCleanCompanies, getMatchResults, matchTransactionsToCompanies } from '../../integrations/plaid/v2_matching';
import {
  ErrorTypes,
  MaxCompanyNameLength,
  MaxSafeDoublePercisionFloatingPointNumber,
  MinCompanyNameLength,
  RareTransactionQuery,
  UserRoles,
} from '../../lib/constants';
import { CompanyRating } from '../../lib/constants/company';
import { sectorsToExcludeFromTransactions } from '../../lib/constants/transaction';
import CustomError, { asCustomError } from '../../lib/customError';
import { roundToPercision } from '../../lib/misc';
import { formatZodFieldErrors } from '../../lib/validation';
import { CardModel, ICardDocument, IShareableCard } from '../../models/card';
import { CompanyModel, ICompanyDocument, ICompanySector, IShareableCompany } from '../../models/company';
import { GroupModel } from '../../models/group';
import { ISector, ISectorDocument, SectorModel } from '../../models/sector';
import { IShareableTransaction, ITransaction, ITransactionDocument, TransactionModel } from '../../models/transaction';
import { IShareableUser, IUserDocument, UserModel } from '../../models/user';
import { V2TransactionFalsePositiveModel } from '../../models/v2_transaction_falsePositive';
import { V2TransactionManualMatchModel } from '../../models/v2_transaction_manualMatch';
import { V2TransactionMatchedCompanyNameModel } from '../../models/v2_transaction_matchedCompanyName';
import { IRef } from '../../types/model';
import { IRequest } from '../../types/request';
import { getShareableCard } from '../card';
import {
  convertCompanyModelsToGetCompaniesResponse,
  getShareableCompany,
  ICompanyProtocol,
  _getPaginatedCompanies,
} from '../company';
import { getCompanyRatingsThresholds } from '../misc';
import { calculateCompanyScore } from '../scripts/calculate_company_scores';
import { getShareableSector } from '../sectors';
import { getShareableUser } from '../user';
import { _getTransactions } from './utils';

const plaidIntegrationPath = 'integrations.plaid.category';
const taxRefundExclusion = { [plaidIntegrationPath]: { $not: { $all: ['Tax', 'Refund'] } } };
const paymentExclusion = { [plaidIntegrationPath]: { $nin: ['Payment'] } };
const excludePaymentQuery = { ...taxRefundExclusion, ...paymentExclusion };

export enum ITransactionsConfig {
  MostRecent = 'recent',
}

export interface IGetRecentTransactionsRequestQuery {
  limit?: number;
  unique?: boolean;
  userId?: string | ObjectId;
}

export const _deleteTransactions = async (query: FilterQuery<ITransactionDocument>) => TransactionModel.deleteMany(query);
export interface ITransactionsRequestQuery extends AqpQuery {
  userId?: string;
  includeOffsets?: boolean;
  includeNullCompanies?: boolean;
  onlyOffsets?: boolean;
}

export interface ITransactionsAggregationRequestQuery {
  userId?: string;
  ratings?: CompanyRating[];
  page?: number;
  limit?: number;
}

export interface ITransactionOptions {
  includeOffsets?: boolean;
  includeNullCompanies?: boolean;
}

type EnrichTransactionResponse = {
  company: ICompanyProtocol;
  carbonEmissionKilograms: number; // emmissions associated with the transaction
  karmaScore: number; // 0 to 100
};

export type EnrichTransactionRequest = {
  companyName: string;
  alternateCompanyName?: string;
  amount: number; // in USD
};

export interface IGetFalsePositivesQuery {
  page: number;
  limit: number;
  matchType: string;
  originalValue: string;
  company: string;
  search: string;
}

export interface ICreateFalsePositiveRequest {
  matchType: string;
  originalValue: string;
}

export interface IUpdateFalsePositiveRequest {
  matchType?: string;
  originalValue?: string;
}
export interface IFalsePositiveIdParam {
  id: string;
}

export interface IGetManualMatchesQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ICreateManualMatchRequest {
  matchType: string;
  company: string;
  originalValue: string;
}

export interface IManualMatchIdParam {
  id: string;
}

export interface IUpdateManualMatchRequest {
  matchType?: string;
  company?: string;
  originalValue?: string;
}

export interface IGetMatchedCompaniesQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export const getRatedTransactions = async (req: IRequest<{}, ITransactionsAggregationRequestQuery>) => {
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
      $and: [
        { company: { $ne: null } },
        { sector: { $nin: sectorsToExcludeFromTransactions } },
        { amount: { $gt: 0 } },
      ],
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
        $sort: { date: -1 },
      },
    ]);

    const options = {
      page: page ?? 1,
      limit: limit ?? 10,
    };

    const transactions = await TransactionModel.aggregatePaginate(transactionAggregate, options);

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

    return transactions;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getTransactions = async (
  req: IRequest<{}, ITransactionsRequestQuery>,
  query: FilterQuery<ITransaction>,
) => {
  const { userId, includeOffsets, includeNullCompanies, onlyOffsets } = req.query;

  if (!req.requestor) throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);

  const paginationOptions = {
    projection: query?.projection || '',
    populate: query.population || [
      {
        path: 'company',
        model: CompanyModel,
      },
      {
        path: 'card',
        model: CardModel,
      },
      {
        path: 'sector',
        model: SectorModel,
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
          ([key]) => key !== 'userId' && key !== 'includeOffsets' && key !== 'includeNullCompanies' && key !== 'onlyOffsets',
        )
        .map(([key, value]) => ({ [key]: value })),
      { sector: { $nin: sectorsToExcludeFromTransactions } },
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
    const { limit = 5, unique = true, userId } = req.query;
    const _limit = parseInt(limit.toString());
    if (isNaN(_limit)) throw new CustomError('Invalid limit found. Must be a number.');

    const query: FilterQuery<ITransactionDocument> = { $and: [{ sector: { $nin: sectorsToExcludeFromTransactions } }] };

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
    query.$and.push({ company: { $ne: null } });

    const transactions = await _getTransactions(query);

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

export const getTransactionTotal = async (query: FilterQuery<ITransaction>): Promise<number> => {
  const aggResult = await TransactionModel.aggregate()
    .match({ sector: { $nin: sectorsToExcludeFromTransactions }, amount: { $gt: 0 }, ...query, ...excludePaymentQuery })
    .group({ _id: '$user', total: { $sum: '$amount' } });

  return aggResult?.length ? aggResult[0].total : 0;
};

// await needed her for TS to resolve the type of aggregations output
// eslint-disable-next-line no-return-await
export const getTransactionCount = async (query = {}) => await TransactionModel.find({
  sector: { $nin: sectorsToExcludeFromTransactions },
  amount: { $gt: 0 },
  ...query,
  ...excludePaymentQuery,
}).count();

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

export const getShareableTransaction = ({
  _id,
  user,
  company,
  card,
  sector,
  amount,
  date,
  reversed,
  createdOn,
  lastModified,
  integrations,
}: ITransactionDocument) => {
  const _user: IRef<ObjectId, IShareableUser> = !!(user as IUserDocument)?.name
    ? getShareableUser(user as IUserDocument)
    : user;

  const _card: IRef<ObjectId, IShareableCard> = !!(card as ICardDocument)?.mask
    ? getShareableCard(card as ICardDocument)
    : card;

  const _company: IRef<ObjectId, IShareableCompany> = !!(company as ICompanyDocument)?.companyName
    ? getShareableCompany(company as ICompanyDocument)
    : company;

  const _sector: IRef<ObjectId, ISector> = !!(sector as ISectorDocument)?.name
    ? getShareableSector(sector as ISectorDocument)
    : sector;

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
  };

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

  return shareableTransaction;
};

export const hasTransactions = async (req: IRequest<{}, ITransactionsRequestQuery>) => {
  try {
    const { userId, includeOffsets, includeNullCompanies } = req.query;
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

    const count = await getTransactionCount(query);

    return count > 0;
  } catch (err) {
    throw asCustomError(err);
  }
};

const matchTransactionCompanies = async (
  transactions: Transaction[],
): Promise<{ matched: Transaction[]; notMatched: Transaction[] }> => {
  try {
    let remainingTransactions = transactions as Transaction[];

    // handle known false positive matches
    const falsePositives = await V2TransactionFalsePositiveModel.find({});
    const foundFalsePositives: Transaction[] = [];
    remainingTransactions = remainingTransactions.filter((t) => {
      if (falsePositives.find((fp) => fp.originalValue === t[fp.matchType])) {
        foundFalsePositives.push(t);
        return false;
      }
      return true;
    });
    if (foundFalsePositives?.length > 0) {
      // return error response (transaction did not match / transaction has a false positive)
      if (!remainingTransactions?.length || remainingTransactions.length === 0) {
        return { matched: [], notMatched: remainingTransactions };
      }
    }

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
      if (!remainingTransactions?.length || remainingTransactions.length === 0) {
        return { matched: foundManualMatches, notMatched: [] };
      }
    }

    // check if this match has been cached
    const alreadyMatchedCompanies = await V2TransactionMatchedCompanyNameModel.find({});
    const [matchedResults, nonMatchedResults] = matchTransactionsToCompanies(
      remainingTransactions,
      alreadyMatchedCompanies,
    );
    remainingTransactions = nonMatchedResults;

    if (matchedResults?.length > 0) {
      if (!remainingTransactions?.length || remainingTransactions.length === 0) {
        return { matched: matchedResults, notMatched: [] };
      }
    }

    // run text matching on any unmatched transactions remaining
    const cleanedCompanies = await getCleanCompanies();
    const textMatchingResults = await getMatchResults({
      transactions: remainingTransactions,
      cleanedCompanies,
      saveMatches: true,
    });
    const [matched, notMatched] = matchTransactionsToCompanies(remainingTransactions, textMatchingResults);

    return { matched, notMatched };
  } catch (err) {
    throw new CustomError('Error matching transactions to companies', ErrorTypes.SERVER);
  }
};

export const enrichTransaction = async (
  req: IRequest<{}, {}, EnrichTransactionRequest>,
): Promise<EnrichTransactionResponse> => {
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

    const matchingResults = await matchTransactionCompanies([transaction as Transaction]);
    const matchedTransaction = matchingResults?.matched[0] as IMatchedTransaction & { company: Types.ObjectId };

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
      throw new CustomError(
        `Error getting company from transaction match: ${JSON.stringify(matchedTransaction)} `,
        ErrorTypes.SERVER,
      );
    }

    // get the carbon emmissions
    let carbonEmissionKilograms = 0;
    if (!!(sector?.sector as ISectorDocument)?.carbonMultiplier && !!matchedTransaction?.amount) {
      carbonEmissionKilograms = roundToPercision(
        (sector?.sector as ISectorDocument).carbonMultiplier * matchedTransaction.amount,
        2,
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
    const falsePositive = await V2TransactionFalsePositiveModel.findOneAndUpdate(
      { _id: id },
      update,
      { new: true },
    );
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
    if (!matchType || !company || !originalValue) throw new CustomError('Missing required fields', ErrorTypes.INVALID_ARG);
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
    const manualMatch = await V2TransactionManualMatchModel.findOneAndUpdate(
      { _id: id },
      update,
      { new: true },
    );
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
