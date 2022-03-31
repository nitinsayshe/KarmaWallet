import { FilterQuery } from 'mongoose';
import { CompanyModel, ICompany } from '../../models/company';
import { getRandom } from '../../lib/number';

const threshold = 60; // the threshold between "high" and "low" grade companies

// split the companies into low and high graded companies
const splitCompanies = (companies: ICompany[]) => {
  const highGradeCompanies: ICompany[] = [];
  const lowGradeCompanies: ICompany[] = [];
  companies.forEach(company => {
    (company.combinedScore >= threshold ? highGradeCompanies : lowGradeCompanies).push(company);
  });

  return [highGradeCompanies, lowGradeCompanies];
};

// temporary static data
const staticSwaps = [
  [11397, 11615, 15827],
  [10381, 10712, 10795, 10800, 15801, 16339, 16282, 16341, 16343, 10131],
  [10367, 10458, 10475, 11182, 12114, 15570, 15672, 15799, 15891, 15892, 16174, 16176, 16369, 16662],
  [10206, 15613, 15804],
  [15886, 15889, 16128, 16132, 16130],
  [16138, 16139, 16140, 16143, 15686],
  [12797, 16171, 16172, 16193, 16344, 16345, 16516, 15689, 15691],
  [16033, 15841, 16032, 16028, 16036, 15840, 16039, 16025, 16038, 16034, 16037, 16035, 15839, 10532, 15819, 15818, 15808, 15807, 15823, 15820, 10567, 10908],
  [16346, 10807, 15688, 15689],
  [16489, 16026, 15847, 15846, 15854, 15853, 16024, 16030, 15849, 15855, 10767, 15814, 15817], [11249, 15655, 16470, 16477, 16478],
  [10193, 11764, 15671, 16357, 16362, 16365, 16366, 16741, 12101, 11133, 12101, 16098],
  [15873, 15874, 15876, 15879, 16166, 10601],
  [11055, 11095, 11798, 12113], [11615, 16078, 10587, 16356, 15598, 10741, 16531],
  [15828, 15830, 15832, 15834, 15831, 15835, 16177, 16180, 16178, 16010],
  [16488, 16023, 15843, 15844, 16031, 15850, 15842, 15851, 15845, 15848, 15822, 10169, 15824, 15811, 15821, 15815, 15810, 15813, 15812, 15825, 10886],
  [10957, 11041, 11064, 11096, 11443, 11638, 11772, 15803, 16342, 16702, 16792, 11034, 11295, 16347, 16762],
];

export const getSwaps = async (previousSwaps: number[][] = [], reset = false, includeHidden = false) => {
  let high;
  let low;
  let randomHighGradeCompany;
  let randomLowGradeCompany;
  const allAvailableSubGroupsForUser = [...staticSwaps];

  do {
    // >>>>>>>>>>
    // TODO - update this with getting all companies of a specific subgroup
    //    once can identify a user's preferred subgroup
    // <<<<<<<<<<
    const randSubGroupIndex = getRandom(0, allAvailableSubGroupsForUser.length - 1);
    const randomSubGroup = allAvailableSubGroupsForUser[randSubGroupIndex];
    const query: FilterQuery<ICompany> = { _id: { $in: randomSubGroup } };
    if (!includeHidden) query['hidden.status'] = false;
    const companies = await CompanyModel.find(query).lean();
    [high, low] = splitCompanies(companies);

    if (high.length && low.length) {
      while ((!randomHighGradeCompany || !randomLowGradeCompany) && !!high.length) {
        const randIndex = high.length > 1 ? getRandom(0, high.length - 1) : 0;
        const randHigh = high.length > 1 ? high[randIndex] : high[0];
        high.splice(randIndex, 1);
        const previousLowsPairedWithThisHigh = previousSwaps
          .map(([p1, p2]) => (`${p1}` === `${randHigh._id}`
            ? p2
            : `${p2}` === `${randHigh._id}`
              ? p1
              : null))
          .filter(x => !!x);

        const availableLows = low.filter(l => !previousLowsPairedWithThisHigh.find(p => `${p}` === `${l._id}`));

        if (availableLows.length) {
          randomHighGradeCompany = randHigh;
          randomLowGradeCompany = availableLows.length > 1 ? availableLows[getRandom(0, availableLows.length - 1)] : availableLows[0];
        }
      }
    }

    if (!randomHighGradeCompany || !randomLowGradeCompany) {
      allAvailableSubGroupsForUser.splice(randSubGroupIndex, 1);
    }
  } while ((!randomHighGradeCompany || !randomLowGradeCompany) && !!allAvailableSubGroupsForUser.length);

  if (!!randomHighGradeCompany && !!randomLowGradeCompany) {
    // swap was found, randomize their order and return to client
    const swaps = getRandom(0, 1) === 0 ? [randomHighGradeCompany, randomLowGradeCompany] : [randomLowGradeCompany, randomHighGradeCompany];
    return { swaps, reset: !!reset };
  } if (!allAvailableSubGroupsForUser.length && !randomHighGradeCompany && !randomLowGradeCompany) {
    // all pairs have been exhausted
    // time to start recycling...
    await getSwaps([], true);
  }
};
