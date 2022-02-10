import { getRandomInt } from '../../lib/number';
import { IRequest } from '../../types/request';
import * as CarbonService from './utils/carbon';
import * as TransactionService from '../transaction';

// TODO: values provided by Anushka 2/2/22. these may need to change
const averageAmericanEmissions = {
  Monthly: 9 / 12,
  Annually: 9,
  Lifetime: 1000,
};

interface IShowUserAmericanAverageParams {
  userId: string;
  cachedTransactionTotal?: number;
  catchedTransactionCount?: number;
}

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

export const getCarbonOffsetsAndEmissions = async (req: IRequest) => {
  const _id = req?.requestor?._id;
  let totalEmissions = 0;
  let monthlyEmissions = 0;
  let netEmissions = 0;
  let calculateTotalEquivalency = false;
  let calculateMonthlyEquivalency = false;

  const donationsCount = await CarbonService.getOffsetTransactionsCount(_id);
  const totalDonated = await CarbonService.getOffsetTransactionsTotal(_id);
  const totalOffset = totalDonated > 0 ? CarbonService.getRareOffsetAmount(totalDonated) : 0;
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
  if (totalEmissions > 0) {
    calculateTotalEquivalency = true;
  }

  // Carbon Offsets Sprint - return one total and one monthly negative equivalency from different types (based on icon)
  const monthlyEquivalencies = CarbonService.getEquivalencies(!calculateMonthlyEquivalency ? averageAmericanEmissions.Monthly : monthlyEmissions);
  const totalEquivalencies = CarbonService.getEquivalencies(!calculateTotalEquivalency ? averageAmericanEmissions.Annually * 2 : netEmissions);

  const totalEquivalency = totalEquivalencies.negative[getRandomInt(0, totalEquivalencies.negative.length - 1)];
  totalEquivalency.type = 'total';
  const monthlyEquivalenciesFiltered = monthlyEquivalencies.negative.filter(eq => eq.icon !== totalEquivalency.icon);
  const monthlyEquivalency = monthlyEquivalenciesFiltered[getRandomInt(0, monthlyEquivalenciesFiltered.length - 1)];
  monthlyEquivalency.type = 'monthly';

  return {
    offsets: {
      donationsCount,
      totalDonated,
      totalOffset,
    },
    netEmissions, // FE uses this field to determine branching logic on first card
    totalEmissions, // FE uses this field to determine showing personalized data or average
    monthlyEmissions,
    equivalencies: [totalEquivalency, monthlyEquivalency],
    averageAmericanEmissions: {
      monthly: averageAmericanEmissions.Monthly,
      annually: averageAmericanEmissions.Annually * 2,
    },
  };
};

// > 0 net emissions: calculate by net emissions
// -net emissions:
// // 0 gross emissions: calculate by am avg ovr 2 years
// // > 0 gross emissions: calculate by total offset
// 0 net emissions:
// // > 0 gross emissions and > 0 offset: calculate by total ofset
// // 0 emissions: calculate by am avg ovr 2 years

export const getCarbonOffsetDonationSuggestions = async (req: IRequest) => {
  const { _id } = req.requestor;
  const donationTypes = ['suggested', 'total', 'none'];
  const buildDonationAmount = (amount: number, description: string, type: string) => ({
    amount,
    description,
    type: donationTypes.find(dt => dt.toLowerCase() === type) || 'none',
  });

  const showAverage = await shouldUseAmericanAverage({ userId: _id });

  const totalDonated = await CarbonService.getOffsetTransactionsTotal(_id);
  const totalOffset = totalDonated > 0 ? CarbonService.getRareOffsetAmount(totalDonated) : 0;

  const monthlyEmissions = showAverage
    ? { mt: averageAmericanEmissions.Monthly }
    : await CarbonService.getMonthlyEmissionsAverage(_id);

  const totalEmissions = showAverage
    ? { mt: averageAmericanEmissions.Annually }
    : await CarbonService.getTotalEmissions(_id);

  const totalUserEmissions = totalEmissions.mt || 0;

  const monthlySuggestion = CarbonService.getRareDonationSuggestion(monthlyEmissions.mt);
  let totalSuggestion = CarbonService.getRareDonationSuggestion((totalUserEmissions - totalOffset) || totalEmissions.mt);
  if (showAverage) {
    totalSuggestion *= 2;
  }

  const lowestDescription = 'Even a little makes a difference!';
  const secondLowestAmount = 25;
  const secondLowestOffsetAmount = CarbonService.getRareOffsetAmount(secondLowestAmount);
  let secondLowestDescription = CarbonService.getEquivalencies(secondLowestOffsetAmount, CarbonService.EquivalencyKey.Recycle)?.negative?.[0]?.text;
  secondLowestDescription = `This amounts to ${secondLowestDescription}`;

  const monthlyDescription = showAverage ? 'This amount offsets the average American\'s monthly emissions.' : 'This amount offsets your average monthly emissions.';
  const totalDescription = showAverage ? 'This amount offsets the average American\'s emissions over 2 years.' : 'This amount offsets your total net emissions.';

  const suggestions = [
    buildDonationAmount(10, lowestDescription, 'none'),
    buildDonationAmount(secondLowestAmount, secondLowestDescription, 'none'),
    buildDonationAmount(monthlySuggestion, monthlyDescription, 'suggested'),
  ];

  if (totalSuggestion > 0) {
    suggestions.push(buildDonationAmount(totalSuggestion, totalDescription, 'total'));
  }

  return suggestions;
};
