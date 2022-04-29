import { isValidObjectId, ObjectId, Types } from 'mongoose';
import { getRandomInt } from '../../lib/number';
import { IRequest } from '../../types/request';
import * as CarbonService from './utils/carbon';
import * as TransactionService from '../transaction';
import { MiscModel } from '../../models/misc';
import CustomError, { asCustomError } from '../../lib/customError';
import { ErrorTypes, UserRoles } from '../../lib/constants';

import { getTopCompaniesOfAllSectorsFromTransactionTotals, getTopSectorsFromTransactionTotals } from './utils/userTransactionTotals';
import { SectorModel } from '../../models/sector';
import { ICompanyDocument } from '../../models/company';
import { _getCompanies } from '../company';
import { getSample } from '../../lib/misc';

export enum TopCompaniesConfig {
  ShopBy = 'shop-by',
}

export enum TopSectorsConfig {
  ShopBy = 'shop-by',
}

export interface ITopCompaniesRequestQuery {
  config?: TopCompaniesConfig;
  sector?: string;
}

export interface ITopSectorsRequestQuery {
  config?: TopSectorsConfig;
}

interface IUserImpactRequestQuery {
  userId?: string;
}

interface IShowUserAmericanAverageParams {
  userId: string;
  cachedTransactionTotal?: number;
  catchedTransactionCount?: number;
}

// values provided by Anushka 2/2/22. these may need to change
export const averageAmericanEmissions = {
  Monthly: 9 / 12,
  Annually: 9,
  Lifetime: 1000,
};

const shouldUseAmericanAverage = async ({ userId, cachedTransactionTotal, catchedTransactionCount }: IShowUserAmericanAverageParams) => {
  // if the UID and both no cached data, show averages
  if (!userId && !(cachedTransactionTotal || catchedTransactionCount)) {
    return true;
  }
  const transactionAmountTotal = cachedTransactionTotal || await TransactionService.getTransactionTotal({ userId, 'integrations.rare': null });
  const transactionCount = catchedTransactionCount || await TransactionService.getTransactionCount({ userId, 'integrations.rare': null });
  // might need to break this down more granular
  return transactionCount <= 0 && transactionAmountTotal <= 0;
};

const getAmountForTotalEquivalency = (netEmissions: number, totalEmissions: number, totalOffset: number) => {
  /**
   * Logic to Determine Number used for Total Equivalency
   * Case: Net Emissions > 0: Use Net Emissions
   * Case: Negative Net Emissions and 0 Gross Emissions: Use American Average over 2 years
   * Case: Negative Net Emissions and  > 0 Gross Emissions: Use Total Offset
   * Case: 0 Net Emissions and > 0 Gross Emissions and > 0 Offset: Use Total Offset
   * Case: 0 Net Emissions and 0 Gross Emissions: Use American Average over 2 years
   */

  if (netEmissions > 0) return netEmissions;
  if (netEmissions < 0 && totalEmissions === 0) return averageAmericanEmissions.Annually * 2;
  if (netEmissions < 0 && totalEmissions > 0) return totalOffset;
  if (netEmissions === 0 && totalEmissions > 0 && totalOffset > 0) return totalOffset;
  if (netEmissions === 0 && totalEmissions === 0) return averageAmericanEmissions.Annually * 2;
};

// TODO: split this up so offsets and emissions can be accessed
//   and retrieved separately.
export const getCarbonOffsetsAndEmissions = async (req: IRequest) => {
  const _id = req?.requestor?._id;
  let totalEmissions = 0;
  let monthlyEmissions = 0;
  let netEmissions = 0;
  let calculateMonthlyEquivalency = false;

  const donationsCount = await CarbonService.getOffsetTransactionsCount({ userId: new Types.ObjectId(_id) });
  const totalDonated = await CarbonService.getOffsetTransactionsTotal({ userId: new Types.ObjectId(_id) });
  const totalOffset = await CarbonService.getRareOffsetAmount({ userId: new Types.ObjectId(_id) });

  const useAmericanAverage = await shouldUseAmericanAverage({ userId: _id });

  if (!useAmericanAverage) {
    const { mt: totalMT } = await CarbonService.getTotalEmissions(_id);
    totalEmissions = totalMT;
    const { mt: averageMT } = await CarbonService.getMonthlyEmissionsAverage(_id);
    monthlyEmissions = averageMT;
  }

  netEmissions = totalEmissions - totalOffset;

  if (monthlyEmissions > 0) {
    calculateMonthlyEquivalency = true;
  }

  // Carbon Offsets Sprint - return one total and one monthly negative equivalency from different types (based on icon)
  const monthlyEquivalencies = CarbonService.getEquivalencies(!calculateMonthlyEquivalency ? averageAmericanEmissions.Monthly : monthlyEmissions);
  const totalEquivalencies = CarbonService.getEquivalencies(getAmountForTotalEquivalency(netEmissions, totalEmissions, totalOffset));

  const totalEquivalency = totalEquivalencies.negative[getRandomInt(0, totalEquivalencies.negative.length - 1)];
  totalEquivalency.type = CarbonService.EquivalencyObjectType.Total;

  const monthlyEquivalenciesFiltered = monthlyEquivalencies.negative.filter(eq => eq.icon !== totalEquivalency.icon);
  const monthlyEquivalency = monthlyEquivalenciesFiltered[getRandomInt(0, monthlyEquivalenciesFiltered.length - 1)];
  monthlyEquivalency.type = CarbonService.EquivalencyObjectType.Monthly;

  const equivalencies = [totalEquivalency, monthlyEquivalency];

  // Add 3rd Equivalency (positive) if User hasx purchased any offsets
  if (totalOffset > 0) {
    const { positive } = CarbonService.getEquivalencies(totalOffset);
    const equivalency = positive[getRandomInt(0, positive.length - 1)];
    equivalencies.push({ ...equivalency, type: CarbonService.EquivalencyObjectType.Offsets });
  }

  return {
    offsets: {
      donationsCount,
      totalDonated,
      totalOffset,
    },
    netEmissions, // FE uses this field to determine branching logic on first card
    totalEmissions, // FE uses this field to determine showing personalized data or average
    monthlyEmissions,
    equivalencies,
    averageAmericanEmissions: {
      monthly: averageAmericanEmissions.Monthly,
      annually: averageAmericanEmissions.Annually * 2,
    },
  };
};

export const getCarbonOffsetDonationSuggestions = async (req: IRequest) => {
  const { _id } = req.requestor;
  const donationTypes = ['suggested', 'total', 'none'];
  const buildDonationAmount = (amount: number, description: string, type: string) => ({
    amount,
    description,
    type: donationTypes.find(dt => dt.toLowerCase() === type) || 'none',
  });

  const showAverage = await shouldUseAmericanAverage({ userId: _id });

  const totalOffset = await CarbonService.getRareOffsetAmount({ _id });

  const monthlyEmissions = showAverage
    ? { mt: averageAmericanEmissions.Monthly }
    : await CarbonService.getMonthlyEmissionsAverage(_id);

  const totalEmissions = showAverage
    ? { mt: averageAmericanEmissions.Annually }
    : await CarbonService.getTotalEmissions(_id);

  const totalUserEmissions = totalEmissions.mt || 0;

  const monthlySuggestion = await CarbonService.getRareDonationSuggestion(monthlyEmissions.mt);
  let totalSuggestion = await CarbonService.getRareDonationSuggestion((totalUserEmissions - totalOffset) || totalEmissions.mt);
  if (showAverage) {
    totalSuggestion *= 2;
  }

  const wrapInSpan = (str: string) => `<span>${str}</span>`;
  const c02Sub = 'CO<sub>2</sub>';

  const lowestAmount = 10;
  const rareAverage = await MiscModel.findOne({ key: 'rare-project-average' }); // 13.81;
  const lowestDescription = wrapInSpan(`Offsets ${(lowestAmount / parseFloat(rareAverage.value)).toFixed(2)} tonnes of ${c02Sub} emissions`);
  const monthlyDescription = showAverage ? wrapInSpan(`The average American's monthly ${c02Sub} emissions`) : wrapInSpan(`Offsets your average monthly ${c02Sub} emissions`);
  const totalDescription = showAverage ? wrapInSpan(`The average American's ${c02Sub} emissions over 2 years`) : wrapInSpan(`Offsets your ${totalOffset > 0 ? 'remaining' : 'total'} ${c02Sub} emissions`);

  const suggestions = [
    buildDonationAmount(lowestAmount, lowestDescription, 'none'),
    buildDonationAmount(monthlySuggestion, monthlyDescription, 'suggested'),
  ];

  if (totalSuggestion > 0) {
    suggestions.push(buildDonationAmount(totalSuggestion, totalDescription, 'total'));
  }

  return suggestions;
};

export const getUserImpactData = async (req: IRequest<{}, IUserImpactRequestQuery>) => {
  try {
    const { userId } = req.query;

    if (userId && req.requestor.role === UserRoles.None) throw new CustomError('You are not authorized to make this request.', ErrorTypes.UNAUTHORIZED);

    const _id = userId ?? req.requestor._id;

    const transactions = await TransactionService.get;
  } catch (err) {
    throw asCustomError(err);
  }
};

const getTopCompaniesToShopBy = async (req: IRequest<{}, ITopCompaniesRequestQuery>) => {
  try {
    const { sector } = req.query;
    if (!sector) throw new CustomError('No sector found. Please provide a sector id to retrieve top companies to shop by.', ErrorTypes.INVALID_ARG);
    if (!isValidObjectId(sector)) throw new CustomError(`Invalid sector id found: ${sector}`, ErrorTypes.INVALID_ARG);

    const config = {
      // get users and all users in same request...if user
      // does not have enough top companies, all users will
      // be used as fallback
      uids: [process.env.APP_USER_ID],
      sectors: [sector],
      count: 11,
      validator: (company: ICompanyDocument) => company.combinedScore > 60,
    };

    if (!!req.requestor) config.uids.unshift(req.requestor._id.toString());

    const topCompanyTransactionTotals = await getTopCompaniesOfAllSectorsFromTransactionTotals(config);

    const requestorsTopCompanies = topCompanyTransactionTotals.find(t => (t.user as ObjectId).toString() === (config.uids as string[])[0]);

    let companies = !!requestorsTopCompanies
      ? requestorsTopCompanies.companies
      : topCompanyTransactionTotals.find(t => (t.user as ObjectId).toString() === process.env.APP_USER_ID).companies;

    if ((companies || []).length < config.count) {
      // fill with relevant companies
      const relevantCompanies = await _getCompanies({
        _id: { $nin: companies.map(c => c._id) },
        'sectors.sector': { $in: config.sectors.map(s => new Types.ObjectId(s)) },
        combinedScore: { $gt: 60 },
      });

      const relevantCompanySamples = getSample<ICompanyDocument>(relevantCompanies, config.count - (companies || []).length);

      companies = [...(companies || []), ...relevantCompanySamples];
    }

    return companies;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getTopCompanies = async (req: IRequest<{}, ITopCompaniesRequestQuery>) => {
  try {
    const { config } = req.query;
    if (!config) throw new CustomError('No configuration found. Please specify a configuration for top companies.', ErrorTypes.INVALID_ARG);

    switch (config) {
      case TopCompaniesConfig.ShopBy: return getTopCompaniesToShopBy(req);
      default: throw new CustomError(`Invalid configuration for getting top companies: ${config}`, ErrorTypes.INVALID_ARG);
    }
  } catch (err) {
    throw asCustomError(err);
  }
};

const getTopSectorsToShopBy = async (req: IRequest<{}, ITopSectorsRequestQuery>) => {
  try {
    const config = {
      // get users and all users in same request...if user
      // does not have enough top sectors, all users will
      // be used as fallback
      uids: [process.env.APP_USER_ID],
      tiers: [1],
      // exclude financial services (staging, prod)
      sectorsToExclude: ['62192ef2f022c9e3fbff0b0c', '621b9ada5f87e75f53666f98'],
      count: 4,
    };

    if (!!req.requestor) config.uids.unshift(req.requestor._id.toString());

    const topSectorsTransactionTotals = await getTopSectorsFromTransactionTotals(config);
    const totalSectorsCount = await SectorModel
      .find({
        _id: { $nin: config.sectorsToExclude },
        tier: { $in: config.tiers },
      })
      .count();

    const requestorsTopSectors = topSectorsTransactionTotals.find(t => (t.user as ObjectId).toString() === (config.uids as string[])[0]);

    const sectorTransactionTotals = !!requestorsTopSectors && requestorsTopSectors.sectorTransactionTotals.length >= config.count
      ? requestorsTopSectors.sectorTransactionTotals
      : topSectorsTransactionTotals.find(t => (t.user as ObjectId).toString() === process.env.APP_USER_ID)?.sectorTransactionTotals;

    return {
      sectors: (sectorTransactionTotals || []).map(s => s.sector),
      remainingCategoriesCount: totalSectorsCount - (sectorTransactionTotals?.length ?? 0),
    };
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getTopSectors = async (req: IRequest<{}, ITopSectorsRequestQuery>) => {
  try {
    const { config } = req.query;
    if (!config) throw new CustomError('No configuration found. Please specify a configuration for top sectors.', ErrorTypes.INVALID_ARG);

    switch (config) {
      case TopSectorsConfig.ShopBy: return getTopSectorsToShopBy(req);
      default: throw new CustomError(`Invalid configuration for getting top sectors: ${config}`, ErrorTypes.INVALID_ARG);
    }
  } catch (err) {
    throw asCustomError(err);
  }
};
