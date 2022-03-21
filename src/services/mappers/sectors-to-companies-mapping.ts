import path from 'path';
import csvtojson from 'csvtojson';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { SectorModel } from '../../models/sector';
import { asCustomError } from '../../lib/customError';
import { LegacyHiddenCompanyModel } from '../../models/legacyCompany';

interface ISectorsToCompanyMapping {
  legacyCategory: string;
  legacyId: string;
  sourceCompanyName: string;
  displayName: string;
  url: string;
  logo: string;
  showHide: string;
  parentLegacyId: string;
  desc: string;
  primarySector: string;
  secondarySector: string;
  tertiarySector: string;
  quaternarySector: string;
  quinarySector: string;
  senarySector: string;
}

type MappingKey = keyof ISectorsToCompanyMapping;

const tiers: MappingKey[] = [
  'primarySector',
  'secondarySector',
  'tertiarySector',
  'quaternarySector',
  'quinarySector',
  'senarySector',
];

export const mapSectorsToCompanies = async () => {
  try {
    const rawData: ISectorsToCompanyMapping[] = await csvtojson().fromFile(path.resolve(__dirname, '.tmp', 'sectors-to-companies.csv'));
    const sectors = await SectorModel.find({});
    const companies = await CompanyModel.find({})
      .populate([
        {
          path: 'parentCompany',
          ref: CompanyModel,
        },
      ]);
    const hiddenCompanies = await LegacyHiddenCompanyModel.find({});

    for (const row of rawData) {
      const company = companies.find(c => c.legacyId.toString() === row.legacyId);
      if (!company) {
        console.log(`[-] company with legacyId: ${row.legacyId} could not be found.`);
        continue;
      }

      // if (company.companyName !== row.sourceCompanyName && company.companyName !== row.displayName) {
      //   console.log('[-] invalid company name found');
      //   console.log(`\tdb name: ${company.companyName}`);
      //   console.log(`\tsource name: ${row.sourceCompanyName}`);
      //   console.log(`\tdisplay name: ${row.displayName}`);
      //   continue;
      // }

      const parentCompany = companies.find(c => (c.parentCompany as ICompanyDocument)?.legacyId.toString() === row.parentLegacyId);

      if (!!row.parentLegacyId && !parentCompany) {
        console.log(`[-] parent company with id: ${row.parentLegacyId} could not be found`);
        continue;
      }

      for (const tier of tiers) {
        if (!!tier) {
          const sector = sectors.find(s => s.name === row[tier]);

          if (!sector) {
            console.log(`[-] invalid ${tier} specified: ${row[tier]}`);
            continue;
          }
        }
      }
    }
  } catch (err) {
    throw asCustomError(err);
  }
};
