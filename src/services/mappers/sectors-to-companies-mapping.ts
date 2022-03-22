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

    const invalidLegacyId = new Set<string>();
    const invalidParentLegacyId = new Set<string>();
    const invalidSectors = new Set<string>();

    console.log('validating mapping data...');
    for (const row of rawData) {
      if (!row.legacyId && !row.showHide && !row.displayName) continue;

      const company = companies.find(c => c.legacyId.toString() === row.legacyId);
      if (!company) {
        const hiddenCompany = hiddenCompanies.find(hc => hc._id.toString() === row.legacyId);
        if (!hiddenCompany) {
          if (!row.legacyId) console.log(row);
          invalidLegacyId.add(row.legacyId);
          console.log(`[-] company with legacyId: ${row.legacyId} could not be found.`);
          continue;
        }
      }

      // if (
      //   company.name !== row.sourceCompanyName
      //   && company.companyName !== row.displayName
      // ) {
      //   console.log('[-] invalid company name found');
      //   console.log(`\tdb name: ${company.companyName}`);
      //   console.log(`\tsource name: ${row.sourceCompanyName}`);
      //   console.log(`\tdisplay name: ${row.displayName}`);
      //   continue;
      // }

      const parentCompany = companies.find(c => (c.parentCompany as ICompanyDocument)?.legacyId.toString() === row.parentLegacyId);

      if (!!row.parentLegacyId && !parentCompany) {
        const hiddenCompany = hiddenCompanies.find(hc => hc._id.toString() === row.parentLegacyId);

        if (!hiddenCompany) {
          invalidParentLegacyId.add(row.parentLegacyId);
          console.log(`[-] parent company with id: ${row.parentLegacyId} could not be found`);
          continue;
        }
      }

      for (const tier of tiers) {
        if (!!row[tier]) {
          const sector = sectors.find(s => s.name === row[tier]);

          if (!sector) {
            invalidSectors.add(row[tier]);
            console.log(`[-] invalid ${tier} specified: ${row[tier]}`);
            continue;
          }
        }
      }
    }

    if (invalidLegacyId.size === 0 && invalidParentLegacyId.size === 0 && invalidSectors.size === 0) {
      console.log('validation checks complete...updated companies...');
    }

    console.log('>>>>> invalid legacy ids', invalidLegacyId);
    console.log('>>>>> invalid parent ids', invalidParentLegacyId);
    console.log('>>>>> invalid sectors', invalidSectors);
  } catch (err) {
    throw asCustomError(err);
  }
};
