import path from 'path';
import csvtojson from 'csvtojson';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ISectorDocument, SectorModel } from '../../models/sector';
import { CompanyModel, ICompanyDocument, ICompanySector } from '../../models/company';
import CustomError, { asCustomError } from '../../lib/customError';

dayjs.extend(utc);

interface ISectorsToCompanyMapping {
  legacyCategory: string;
  legacyId: string;
  sourceCompanyName: string;
  displayName: string;
  url: string;
  logo: string;
  showHide: string;
  hideReason: string;
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

const loadParentSectors = (sector: ISectorDocument, sectors: ISectorDocument[], primarySector: string) => {
  const allSectors = [{ sector, primary: sector.name === primarySector }];
  const parentSectors = [...sector.parentSectors];

  while (allSectors[0].sector.tier !== 1) {
    const parentSector = sectors.find(s => s._id.toString() === parentSectors[parentSectors.length - 1].toString());

    if (!parentSector) throw new CustomError(`parent sector not found: ${parentSectors[parentSectors.length - 1]}`);
    parentSectors.pop();

    allSectors.unshift({ sector: parentSector, primary: parentSector.name === primarySector });
  }

  return allSectors;
};

const getCompanySectors = (
  row: ISectorsToCompanyMapping,
  sectors: ISectorDocument[],
) => {
  let companySectors: ICompanySector[] = [];

  for (const tier of tiers) {
    if (!!row[tier]) {
      const sector = sectors.find(s => s.name === row[tier]);
      companySectors = [...companySectors, ...loadParentSectors(sector, sectors, row.primarySector)];
    }
  }

  return companySectors;
};

export const updateCompanySectorsWithPrimaryStatus = async () => {
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

    const invalidSectors = new Set<string>();

    console.log('validating mapping data...');
    for (const row of rawData) {
      if (!row.legacyId && !row.showHide && !row.displayName) continue;

      const company = companies.find(c => c.legacyId.toString() === row.legacyId);
      if (!company) {
        console.log(`[-] company with legacyId: ${row.legacyId} could not be found.`);
        continue;
      }

      if (row.showHide !== 'Show' && row.showHide !== 'Category' && !row.hideReason.trim()) {
        console.log('>>>>> invalid hide', row.showHide, row.hideReason);
        continue;
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

    console.log('validation complete');
    console.log('updating companies...');

    let companiesUpdated = 0;
    let companiesWithNoSectors = 0;
    let companiesWithOneSector = 0;
    let companiesWithMultiSectors = 0;

    let companyWithNoSectors: ICompanyDocument = null;
    let companyWithOneSector: ICompanyDocument = null;
    let companyWithMultiSectors: ICompanyDocument = null;

    for (const row of rawData) {
      try {
        const { desc } = row;

        const company = companies.find(c => c.legacyId.toString() === row.legacyId);
        if (!company) continue;

        company.notes = desc;

        company.sectors = getCompanySectors(row, sectors);

        if (company.sectors.length === 0) {
          if (!companyWithNoSectors) companyWithNoSectors = company;
          companiesWithNoSectors += 1;
        }

        if (company.sectors.length === 1) {
          if (!companyWithOneSector) companyWithOneSector = company;
          companiesWithOneSector += 1;
        }

        if (company.sectors.length > 1) {
          if (!companyWithMultiSectors) companyWithMultiSectors = company;
          companiesWithMultiSectors += 1;
        }

        if (!!row.displayName) company.companyName = row.displayName;

        await company.save();

        companiesUpdated += 1;
      } catch (err) {
        console.log(err);
      }
    }

    console.log(`[+] ${companiesUpdated} companies updated with new sectors`);
    console.log('companies with 0 sectors: ', companiesWithNoSectors);
    console.log('companies with 1 sector: ', companiesWithOneSector);
    console.log('companies with more than 1 sectors: ', companiesWithMultiSectors);
  } catch (err) {
    throw asCustomError(err);
  }
};
