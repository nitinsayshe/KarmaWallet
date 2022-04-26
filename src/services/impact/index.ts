import { isValidObjectId, Types } from 'mongoose';
import { getRandomInt } from '../../lib/number';
import { IRequest } from '../../types/request';
import * as CarbonService from './utils/carbon';
import * as TransactionService from '../transaction';
import { MiscModel } from '../../models/misc';
import CustomError from '../../lib/customError';
import { ErrorTypes, UserRoles } from '../../lib/constants';

interface IShowUserAmericanAverageParams {
  userId: string | Types.ObjectId;
  cachedTransactionTotal?: number;
  catchedTransactionCount?: number;
}

export interface ICarbonOffsetRequestQuery {
  userId?: string;
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
export const getCarbonOffsetsAndEmissions = async (req: IRequest<{}, ICarbonOffsetRequestQuery>) => {
  const { userId } = req.query;

  let _id: Types.ObjectId;

  if (!!userId) {
    if (!req.requestor?._id || (req.requestor._id.toString() !== userId && req.requestor?.role === UserRoles.None)) {
      throw new CustomError('You are not authorized to request this user\'s carbon data.', ErrorTypes.UNAUTHORIZED);
    }
    if (!isValidObjectId(userId)) throw new CustomError('Invalid user id found.', ErrorTypes.INVALID_ARG);
    _id = new Types.ObjectId(userId);
  } else {
    _id = new Types.ObjectId(req.requestor?._id);
  }

  let totalEmissions = 0;
  let monthlyEmissions = 0;
  let netEmissions = 0;
  let calculateMonthlyEquivalency = false;

  const donationsCount = await CarbonService.getOffsetTransactionsCount({ userId: _id });
  const totalDonated = await CarbonService.getOffsetTransactionsTotal({ userId: _id });
  const totalOffset = await CarbonService.getRareOffsetAmount({ userId: _id });

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

export const getCarbonOffsetDonationSuggestions = async (req: IRequest<{}, ICarbonOffsetRequestQuery>) => {
  const { userId } = req.query;

  let _id: Types.ObjectId;

  if (!!userId) {
    if (!req.requestor?._id || (req.requestor._id.toString() !== userId && req.requestor?.role === UserRoles.None)) {
      throw new CustomError('You are not authorized to request this user\'s carbon data.', ErrorTypes.UNAUTHORIZED);
    }
    if (!isValidObjectId(userId)) throw new CustomError('Invalid user id found.', ErrorTypes.INVALID_ARG);
    _id = new Types.ObjectId(userId);
  } else {
    _id = new Types.ObjectId(req?.requestor?._id);
  }

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
