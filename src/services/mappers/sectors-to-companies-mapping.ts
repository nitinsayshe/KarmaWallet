import path from 'path';
import csvtojson from 'csvtojson';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { ISectorDocument, SectorModel } from '../../models/sector';
import CustomError, { asCustomError } from '../../lib/customError';
import { LegacyHiddenCompanyModel } from '../../models/legacyCompany';

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

const loadParentSectors = (sector: ISectorDocument, sectors: ISectorDocument[]) => {
  const allSectors = [sector];
  const parentSectors = [...sector.parentSectors];

  while (allSectors[0].tier !== 1) {
    const parentSector = sectors.find(s => s._id.toString() === parentSectors[parentSectors.length - 1].toString());

    if (!parentSector) throw new CustomError(`parent sector not found: ${parentSectors[parentSectors.length - 1]}`);
    parentSectors.pop();

    allSectors.unshift(parentSector);
  }

  return allSectors;
};

const getCompanySectors = (
  row: ISectorsToCompanyMapping,
  sectors: ISectorDocument[],
) => {
  let companySectors: ISectorDocument[] = [];

  for (const tier of tiers) {
    if (!!row[tier]) {
      const sector = sectors.find(s => s.name === row[tier]);
      companySectors = [...companySectors, ...loadParentSectors(sector, sectors)];
    }
  }

  return companySectors;
};

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
    const invalidHide = new Set<string>();
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

      const parentCompany = companies.find(c => (c.parentCompany as ICompanyDocument)?.legacyId.toString() === row.parentLegacyId);

      if (!!row.parentLegacyId && !parentCompany) {
        const hiddenCompany = hiddenCompanies.find(hc => hc._id.toString() === row.parentLegacyId);

        if (!hiddenCompany) {
          invalidParentLegacyId.add(row.parentLegacyId);
          console.log(`[-] parent company with id: ${row.parentLegacyId} could not be found`);
          continue;
        }
      }

      if (row.showHide !== 'Show' && row.showHide !== 'Category' && !row.hideReason.trim()) {
        invalidHide.add(row.legacyId);
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

    if (invalidLegacyId.size !== 0 || invalidParentLegacyId.size !== 0 || invalidHide.size !== 0 || invalidSectors.size !== 0) {
      console.log('invalid legacy ids', invalidLegacyId);
      console.log('invalid parent ids', invalidParentLegacyId);
      console.log('invalid sectors', invalidSectors);
      return;
    }

    console.log('validation complete');
    console.log('updating companies...');

    const timestamp = dayjs().utc().toDate();
    let companiesUpdated = 0;
    let companiesWithNoSectors = 0;
    let companiesWithOneSector = 0;
    let companiesWithMultiSectors = 0;

    let companyWithNoSectors: ICompanyDocument = null;
    let companyWithOneSector: ICompanyDocument = null;
    let companyWithMultiSectors: ICompanyDocument = null;

    for (const row of rawData) {
      try {
        const { showHide, hideReason, desc } = row;

        const company = companies.find(c => c.legacyId.toString() === row.legacyId);
        if (!company) continue;

        if (showHide === 'Show') {
          company.hidden = {
            status: false,
            reason: '',
            lastModified: timestamp,
          };
        } else if (showHide === 'Category') {
          company.hidden = {
            status: true,
            reason: 'Whole sector is hidden',
            lastModified: timestamp,
          };
        } else {
          company.hidden = {
            status: true,
            reason: hideReason,
            lastModified: timestamp,
          };
        }

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
