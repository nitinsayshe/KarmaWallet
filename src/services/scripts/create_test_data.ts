import { randomInt } from 'crypto';
import { KardClient } from '../../clients/kard';
import { getUtcDate } from '../../lib/date';
import {
  createSomeCompanies, getSomeCategoryScores,
  getSomeCompanySectors,
  getSomeEvaluatedUnsdgs,
  getSomeSubcategoryScores,
} from '../../lib/testingUtils';
import { CompanyModel, ICompanyDocument } from '../../models/company';

export const createCompaniesFromKardMerchants = async (): Promise<ICompanyDocument[]> => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot create new companies from Kard merchants in a non-test environment');
  }
  try {
    // pull all merchants from kard
    const kc = new KardClient();
    const merchants = await kc.getRewardsMerchants();
    const mccs: Set<number> = new Set();

    // create companies from merchants
    let companies = await Promise.all(
      merchants.map(async (merchant) => {
        let mcc = randomInt(1000, 9999);
        while (mccs.has(mcc)) {
          mcc = randomInt(1000, 9999);
        }
        mccs.add(mcc);
        const company = new CompanyModel({
          companyName: merchant.name,
          url: merchant.websiteURL,
          createdAt: getUtcDate(),
          logo: merchant.imgUrl,
          evaluatedUnsdgs: await getSomeEvaluatedUnsdgs(),
          categoryScores: await getSomeCategoryScores(),
          subcategoryScores: await getSomeSubcategoryScores(),
          sectors: await getSomeCompanySectors(),
          mcc,
        });
        return company;
      }),
    );

    companies = await createSomeCompanies({
      companies,
    });

    return companies;
  } catch (err) {
    console.error(err);
    return [];
  }
};
