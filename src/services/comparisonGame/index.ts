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
  [
    '62192d58f022c9e3fbfe4c99',
    '62192d5ef022c9e3fbfe5001',
    '62192dc7f022c9e3fbfe8ab5',
  ],
  [
    '62192d3ef022c9e3fbfe3dc5',
    '62192d42f022c9e3fbfe406d',
    '62192d47f022c9e3fbfe4311',
    '62192d49f022c9e3fbfe4409',
    '62192d49f022c9e3fbfe443d',
    '62192dc6f022c9e3fbfe8a19',
    '62192dd1f022c9e3fbfe8ff9',
    '62192dd1f022c9e3fbfe9039',
    '62192dd1f022c9e3fbfe9011',
    '62192dd1f022c9e3fbfe9019',
  ],
  [
    '62192d42f022c9e3fbfe4055',
    '62192d43f022c9e3fbfe4111',
    '62192d44f022c9e3fbfe4121',
    '62192d53f022c9e3fbfe497d',
    '62192d6cf022c9e3fbfe57dd',
    '62192dc2f022c9e3fbfe87c5',
    '62192dc5f022c9e3fbfe8941',
    '62192dc6f022c9e3fbfe8a15',
    '62192dc9f022c9e3fbfe8b95',
    '62192dc9f022c9e3fbfe8b91',
    '62192dd0f022c9e3fbfe8f7d',
    '62192dcef022c9e3fbfe8e91',
    '62192dd1f022c9e3fbfe9081',
    '62192dd5f022c9e3fbfe9281',
  ],
  [
    '62192d3ff022c9e3fbfe3eb1',
    '62192dc3f022c9e3fbfe885d',
    '62192dc6f022c9e3fbfe8a25',
  ],
  [
    '62192dc8f022c9e3fbfe8b75',
    '62192dc9f022c9e3fbfe8b99',
    '62192dcdf022c9e3fbfe8e05',
    '62192dcdf022c9e3fbfe8e29',
    '62192dcdf022c9e3fbfe8df1',
  ],
  [
    '62192dc4f022c9e3fbfe8921',
    '62192dcdf022c9e3fbfe8e39',
    '62192dcef022c9e3fbfe8e51',
    '62192dcdf022c9e3fbfe8e25',
    '62192dcdf022c9e3fbfe8e35',
  ],
  [
    '62192d7df022c9e3fbfe6109',
    '62192dc4f022c9e3fbfe892d',
    '62192dc6f022c9e3fbfe89cd',
    '62192dcef022c9e3fbfe8ec1',
    '62192dcef022c9e3fbfe8e99',
    '62192dcef022c9e3fbfe8eb9',
    '62192dd1f022c9e3fbfe8ff5',
    '62192dd1f022c9e3fbfe906d',
    '62192dd4f022c9e3fbfe91d9',
  ],
  [
    '62192d45f022c9e3fbfe41b9',
    '62192d46f022c9e3fbfe4249',
    '62192d4bf022c9e3fbfe4579',
    '62192dc6f022c9e3fbfe8a31',
    '62192dc7f022c9e3fbfe8a59',
    '62192dc7f022c9e3fbfe8a91',
    '62192dc7f022c9e3fbfe8a79',
    '62192dc7f022c9e3fbfe8a75',
    '62192dc7f022c9e3fbfe8ae1',
    '62192dc7f022c9e3fbfe8abd',
    '62192dc7f022c9e3fbfe8ad1',
    '62192dc7f022c9e3fbfe8ac5',
    '62192dcbf022c9e3fbfe8cd9',
    '62192dcbf022c9e3fbfe8cc5',
    '62192dcbf022c9e3fbfe8ce1',
    '62192dcbf022c9e3fbfe8cf5',
    '62192dcbf022c9e3fbfe8d01',
    '62192dcbf022c9e3fbfe8cf9',
    '62192dcbf022c9e3fbfe8cf1',
    '62192dcbf022c9e3fbfe8d05',
    '62192dcbf022c9e3fbfe8d0d',
    '62192dcbf022c9e3fbfe8cfd',
  ],
  [
    '62192d49f022c9e3fbfe4441',
    '62192dc4f022c9e3fbfe8929',
    '62192dc4f022c9e3fbfe892d',
    '62192dd1f022c9e3fbfe9025',
  ],
  [
    '62192d49f022c9e3fbfe43ed',
    '62192dc7f022c9e3fbfe8a81',
    '62192dc7f022c9e3fbfe8a99',
    '62192dc8f022c9e3fbfe8af5',
    '62192dc7f022c9e3fbfe8add',
    '62192dc7f022c9e3fbfe8ad9',
    '62192dc8f022c9e3fbfe8b0d',
    '62192dc7f022c9e3fbfe8ae5',
    '62192dc8f022c9e3fbfe8b05',
    '62192dcbf022c9e3fbfe8cb5',
    '62192dcbf022c9e3fbfe8cd1',
    '62192dcbf022c9e3fbfe8ce9',
    '62192dd4f022c9e3fbfe91c9',
  ],
  [
    '62192d54f022c9e3fbfe4a81',
    '62192dc4f022c9e3fbfe88ad',
    '62192dd3f022c9e3fbfe9179',
    '62192dd3f022c9e3fbfe9159',
    '62192dd4f022c9e3fbfe91c1',
  ],
  [
    '62192d3ff022c9e3fbfe3e99',
    '62192d51f022c9e3fbfe4885',
    '62192d62f022c9e3fbfe5259',
    '62192d6df022c9e3fbfe5835',
    '62192dc4f022c9e3fbfe8909',
    '62192dcdf022c9e3fbfe8dfd',
    '62192dd1f022c9e3fbfe9031',
    '62192dd1f022c9e3fbfe9035',
    '62192dd1f022c9e3fbfe9045',
    '62192dd1f022c9e3fbfe904d',
    '62192dd8f022c9e3fbfe93fd',
  ],
  [
    '62192d46f022c9e3fbfe4239',
    '62192dc8f022c9e3fbfe8b41',
    '62192dc8f022c9e3fbfe8b2d',
    '62192dc8f022c9e3fbfe8b45',
    '62192dc8f022c9e3fbfe8b55',
    '62192dcef022c9e3fbfe8e81',
  ],
  [
    '62192d4ff022c9e3fbfe4789',
    '62192d50f022c9e3fbfe47d9',
    '62192d65f022c9e3fbfe538d',
    '62192d6cf022c9e3fbfe57d9',
  ],
  [
    '62192d45f022c9e3fbfe4209',
    '62192d48f022c9e3fbfe43a5',
    '62192d5ef022c9e3fbfe5001',
    '62192dc3f022c9e3fbfe8841',
    '62192dccf022c9e3fbfe8d49',
    '62192dd1f022c9e3fbfe9075',
    '62192dd4f022c9e3fbfe91b9',
  ],
  [
    '62192dc7f022c9e3fbfe8a95',
    '62192dc7f022c9e3fbfe8aa5',
    '62192dc7f022c9e3fbfe8ab1',
    '62192dc7f022c9e3fbfe8aad',
    '62192dc7f022c9e3fbfe8aa9',
    '62192dc7f022c9e3fbfe8ab9',
    '62192dcbf022c9e3fbfe8ca1',
    '62192dcff022c9e3fbfe8ee1',
    '62192dcff022c9e3fbfe8f19',
    '62192dcff022c9e3fbfe8f0d',
  ],
  [
    '62192d3ff022c9e3fbfe3e89',
    '62192d4bf022c9e3fbfe4509',
    '62192dc7f022c9e3fbfe8a5d',
    '62192dc6f022c9e3fbfe8a39',
    '62192dc7f022c9e3fbfe8a6d',
    '62192dc7f022c9e3fbfe8a71',
    '62192dc7f022c9e3fbfe8aa1',
    '62192dc7f022c9e3fbfe8a7d',
    '62192dc7f022c9e3fbfe8a89',
    '62192dc7f022c9e3fbfe8a85',
    '62192dc7f022c9e3fbfe8a8d',
    '62192dc7f022c9e3fbfe8acd',
    '62192dc7f022c9e3fbfe8ac9',
    '62192dc8f022c9e3fbfe8b21',
    '62192dc8f022c9e3fbfe8af1',
    '62192dc8f022c9e3fbfe8af9',
    '62192dc8f022c9e3fbfe8b19',
    '62192dc8f022c9e3fbfe8b15',
    '62192dcbf022c9e3fbfe8cd5',
    '62192dcbf022c9e3fbfe8ce5',
    '62192dd3f022c9e3fbfe916d',
  ],
  [
    '62192d4cf022c9e3fbfe45f1',
    '62192d4ef022c9e3fbfe4725',
    '62192d4ef022c9e3fbfe4721',
    '62192d4ff022c9e3fbfe47b9',
    '62192d50f022c9e3fbfe47f5',
    '62192d56f022c9e3fbfe4b39',
    '62192d5af022c9e3fbfe4d99',
    '62192d5ff022c9e3fbfe5071',
    '62192d63f022c9e3fbfe52c5',
    '62192dc6f022c9e3fbfe8a21',
    '62192dd1f022c9e3fbfe9005',
    '62192dd1f022c9e3fbfe8ffd',
    '62192dd7f022c9e3fbfe9379',
    '62192dd8f022c9e3fbfe9429',
    '62192dd9f022c9e3fbfe9481',
  ],
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
