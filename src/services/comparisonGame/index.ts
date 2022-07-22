import { FilterQuery } from 'mongoose';
import { CompanyCreationStatus, CompanyModel, ICompany } from '../../models/company';
import { getRandom } from '../../lib/number';

const threshold = 2; // the threshold between "high" and "low" grade companies

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
  [
    '621b994a5f87e75f5365b139',
    '621b99505f87e75f5365b4b9',
    '621b99b45f87e75f5365ef2d',
  ],
  [
    '621b99305f87e75f5365a27d',
    '621b99345f87e75f5365a509',
    '621b993a5f87e75f5365a821',
    '621b993b5f87e75f5365a895',
    '621b993b5f87e75f5365a89d',
    '621b99b35f87e75f5365eed1',
    '621b99bd5f87e75f5365f499',
    '621b99bd5f87e75f5365f475',
    '621b99bd5f87e75f5365f481',
    '621b99bd5f87e75f5365f4b1',
  ],
  [
    '621b99345f87e75f5365a4e5',
    '621b99355f87e75f5365a595',
    '621b99365f87e75f5365a5ad',
    '621b99445f87e75f5365ae1d',
    '621b995d5f87e75f5365bc75',
    '621b99af5f87e75f5365ec91',
    '621b99b25f87e75f5365edf1',
    '621b99b35f87e75f5365eecd',
    '621b99b55f87e75f5365f009',
    '621b99b55f87e75f5365effd',
    '621b99bb5f87e75f5365f385',
    '621b99bb5f87e75f5365f331',
    '621b99be5f87e75f5365f4f9',
    '621b99c25f87e75f5365f74d',
  ],
  [
    '621b99315f87e75f5365a325',
    '621b99b05f87e75f5365ed09',
    '621b99b35f87e75f5365eee1',
  ],
  [
    '621b99b55f87e75f5365f001',
    '621b99b55f87e75f5365f005',
    '621b99ba5f87e75f5365f2c9',
    '621b99ba5f87e75f5365f2cd',
    '621b99bb5f87e75f5365f349',
  ],
  [
    '621b99b15f87e75f5365edc1',
    '621b99ba5f87e75f5365f2e5',
    '621b99ba5f87e75f5365f2bd',
    '621b99ba5f87e75f5365f2e1',
    '621b99ba5f87e75f5365f2c1',
  ],
  [
    '621b996c5f87e75f5365c581',
    '621b99b15f87e75f5365ede1',
    '621b99b15f87e75f5365ede1',
    '621b99bb5f87e75f5365f33d',
    '621b99bb5f87e75f5365f341',
    '621b99bb5f87e75f5365f371',
    '621b99bd5f87e75f5365f47d',
    '621b99bd5f87e75f5365f48d',
    '621b99c05f87e75f5365f659',
  ],
  [
    '621b99365f87e75f5365a62d',
    '621b99375f87e75f5365a6a9',
    '621b993d5f87e75f5365a9d9',
    '621b99b35f87e75f5365eedd',
    '621b99b35f87e75f5365eed9',
    '621b99b45f87e75f5365ef45',
    '621b99b45f87e75f5365ef15',
    '621b99b35f87e75f5365ef01',
    '621b99b45f87e75f5365ef29',
    '621b99b45f87e75f5365ef41',
    '621b99b45f87e75f5365ef55',
    '621b99b45f87e75f5365ef5d',
    '621b99b75f87e75f5365f15d',
    '621b99b85f87e75f5365f169',
    '621b99b85f87e75f5365f175',
    '621b99b85f87e75f5365f17d',
    '621b99b85f87e75f5365f181',
    '621b99b85f87e75f5365f185',
    '621b99b85f87e75f5365f18d',
    '621b99b85f87e75f5365f189',
    '621b99b85f87e75f5365f195',
    '621b99b85f87e75f5365f191',
  ],
  [
    '621b993b5f87e75f5365a8d9',
    '621b99b15f87e75f5365edbd',
    '621b99b15f87e75f5365ede1',
    '621b99bd5f87e75f5365f4a5',
  ],
  [
    '621b993a5f87e75f5365a875',
    '621b99b35f87e75f5365eefd',
    '621b99b35f87e75f5365ef11',
    '621b99b45f87e75f5365ef75',
    '621b99b45f87e75f5365ef69',
    '621b99b45f87e75f5365efa1',
    '621b99b45f87e75f5365ef7d',
    '621b99b45f87e75f5365ef85',
    '621b99b45f87e75f5365ef89',
    '621b99b75f87e75f5365f159',
    '621b99b85f87e75f5365f165',
    '621b99b85f87e75f5365f16d',
    '621b99bf5f87e75f5365f60d',
  ],
  [
    '621b99465f87e75f5365af15',
    '621b99b15f87e75f5365ed85',
    '621b99bf5f87e75f5365f5c1',
    '621b99bf5f87e75f5365f5e1',
    '621b99bf5f87e75f5365f5e5',
  ],
  [
    '621b99315f87e75f5365a341',
    '621b99435f87e75f5365ad35',
    '621b99545f87e75f5365b715',
    '621b995c5f87e75f5365bc11',
    '621b99b25f87e75f5365ee11',
    '621b99b95f87e75f5365f245',
    '621b99bd5f87e75f5365f4c5',
    '621b99bd5f87e75f5365f4cd',
    '621b99bd5f87e75f5365f4e1',
    '621b99be5f87e75f5365f4f1',
    '621b99c45f87e75f5365f871',
  ],
  [
    '621b99375f87e75f5365a6b9',
    '621b99b55f87e75f5365efe5',
    '621b99b55f87e75f5365efcd',
    '621b99b55f87e75f5365efd1',
    '621b99b55f87e75f5365eff5',
    '621b99ba5f87e75f5365f301',
  ],
  [
    '621b99415f87e75f5365ac0d',
    '621b99425f87e75f5365acc9',
    '621b99545f87e75f5365b799',
    '621b995d5f87e75f5365bc69',
  ],
  [
    '621b99375f87e75f5365a691',
    '621b993a5f87e75f5365a841',
    '621b99505f87e75f5365b4b9',
    '621b99b05f87e75f5365ece5',
    '621b99b95f87e75f5365f1fd',
    '621b99bd5f87e75f5365f4c1',
    '621b99c05f87e75f5365f689',
  ],
  [
    '621b99b45f87e75f5365ef35',
    '621b99b45f87e75f5365ef39',
    '621b99b45f87e75f5365ef49',
    '621b99b45f87e75f5365ef31',
    '621b99b45f87e75f5365ef4d',
    '621b99b45f87e75f5365ef51',
    '621b99b75f87e75f5365f135',
    '621b99bb5f87e75f5365f329',
    '621b99bb5f87e75f5365f339',
    '621b99ba5f87e75f5365f311',
  ],
  [
    '621b99315f87e75f5365a2d5',
    '621b993d5f87e75f5365a9f1',
    '621b99b35f87e75f5365eef5',
    '621b99b35f87e75f5365eef1',
    '621b99b35f87e75f5365eeed',
    '621b99b35f87e75f5365eef9',
    '621b99b35f87e75f5365ef0d',
    '621b99b35f87e75f5365ef05',
    '621b99b45f87e75f5365ef19',
    '621b99b45f87e75f5365ef1d',
    '621b99b45f87e75f5365ef21',
    '621b99b45f87e75f5365ef65',
    '621b99b45f87e75f5365ef61',
    '621b99b45f87e75f5365ef59',
    '621b99b45f87e75f5365ef6d',
    '621b99b45f87e75f5365ef71',
    '621b99b45f87e75f5365ef81',
    '621b99b45f87e75f5365ef79',
    '621b99b75f87e75f5365f155',
    '621b99b85f87e75f5365f171',
    '621b99c05f87e75f5365f619',
  ],
  [
    '621b993e5f87e75f5365aa99',
    '621b99405f87e75f5365abed',
    '621b99405f87e75f5365abbd',
    '621b99415f87e75f5365ac55',
    '621b99425f87e75f5365acb5',
    '621b99475f87e75f5365afa5',
    '621b994b5f87e75f5365b215',
    '621b99505f87e75f5365b521',
    '621b99545f87e75f5365b739',
    '621b99b35f87e75f5365eee9',
    '621b99bd5f87e75f5365f495',
    '621b99bd5f87e75f5365f4a1',
    '621b99c35f87e75f5365f7dd',
    '621b99c45f87e75f5365f8bd',
    '621b99c55f87e75f5365f93d',
  ],
];

export interface IGetSwapsResponse {
  swaps: ICompany[],
  reset: boolean,
}

export const getSwaps = async (previousSwaps: string[][] = [], reset = false, includeHidden = false): Promise<IGetSwapsResponse> => {
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
    const query: FilterQuery<ICompany> = {
      _id: { $in: randomSubGroup },
      'creation.status': { $ne: CompanyCreationStatus.InProgress },
    };
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
    return getSwaps([], true);
  }
};
