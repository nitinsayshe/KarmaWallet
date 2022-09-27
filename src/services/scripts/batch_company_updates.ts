/* eslint-disable camelcase */
import slugify from 'slugify';
import csvtojson from 'csvtojson';
import path from 'path';
import fs from 'fs';
import dayjs from 'dayjs';
import { ErrorTypes } from '../../lib/constants';
import { mockRequest } from '../../lib/constants/request';
import CustomError from '../../lib/customError';
import { CompanyHideReasons, CompanyModel } from '../../models/company';
import { IUserDocument, UserModel } from '../../models/user';
import { downloadImageFromUrlAndStoreInS3 } from '../upload';
import { CompanyDataSourceModel } from '../../models/companyDataSource';
import { DataSourceModel } from '../../models/dataSource';
import { MatchedCompanyNameModel } from '../../models/matchedCompanyName';

// Data Source Updates

// Data Source Mappings

// Value Updates

// Company Data Source Updates
enum CompanyDataSourceUpdateActions {
  Add = 'ADD',
  Delete = 'DELETE',
}

const handleAddCompanyDataSource = async (update: any) => {
  const { companyId, dataSourceId } = update;
  const expiration = update?.expiration ? dayjs(update.expiration).toDate() : dayjs().add(1, 'year').toDate();
  const value = parseInt(update?.value, 10);
  if (!companyId || !dataSourceId || Number.isNaN(value)) throw new Error(`Invalid update: ${JSON.stringify(update)}`);
  const newCompanyDataSource = await CompanyDataSourceModel.findOneAndUpdate(
    {
      company: companyId,
      source: dataSourceId,
    },
    {
      dateRange: {
        start: dayjs().toDate(),
        end: expiration,
      },
      status: value,
    },
    {
      new: true,
      upsert: true,
    },
  );
  await newCompanyDataSource.save();
};

const handleDeleteCompanyDataSource = async (update: any) => {
  const existingCompanyDataSource = await CompanyDataSourceModel.findOneAndDelete({ company: update.companyId, source: update.dataSourceId });
  if (!existingCompanyDataSource) throw new Error(`No existing company data source found for update: ${JSON.stringify(update)}`);
};

export const updateCompanyDataSources = async () => {
  const errors: any[] = [];
  const updatePath = path.resolve(__dirname, '.tmp', 'batchCompanyDataSources.csv');
  const updates = await csvtojson().fromFile(updatePath);
  let count = 0;
  for (const update of updates) {
    try {
      const { action } = update;
      switch (action) {
        case CompanyDataSourceUpdateActions.Add:
          await handleAddCompanyDataSource(update);
          break;
        case CompanyDataSourceUpdateActions.Delete:
          await handleDeleteCompanyDataSource(update);
          break;
        default:
          errors.push({ companyId: update.companyId, dataSourceId: update.dataSourceId, error: 'Invalid action.' });
          console.log(`[-] ${update.companyId} - ${update.dataSourceId} - Invalid action.`);
          break;
      }
      count += 1;
      console.log(`[+] ${update.companyId} - ${update.dataSourceId} - ${action}`);
    } catch (err: any) {
      errors.push({ companyId: update.companyId, dataSourceId: update.dataSourceId, error: err.message });
      console.log(`[-] ${update.companyId} - ${update.dataSourceId} - ${err.message}`);
    }
  }
  console.log(`[+] updating ${updates.length} company data sources`);
  if (errors.length > 0) fs.writeFileSync(path.resolve(__dirname, '.tmp', 'batchCompanyDataSourcesErrors.json'), JSON.stringify(errors));
  console.log(`[#] updated ${count} companies with ${errors.length} errors`);
};

// Company Updates
enum UpdateAction {
  Delete = 'DELETE',
  Update = 'UPDATE',
  Hide = 'HIDE',
  Add = 'ADD',
  RemoveParent = 'REMOVE_PARENT',
  AddParent = 'ADD_PARENT',
}

export const handleDeleteCompany = async (companyId: string): Promise<void> => {
  console.log('[-] deleting company', companyId);
  const company = await CompanyModel.findOneAndDelete({ _id: companyId });
  console.log(`[+] deleted company ${company?.companyName}`);
  if (!company) throw new Error(`Company ${companyId} not found.`);
};

export const handleUpdateCompany = async (companyId: string, update: any): Promise<void> => {
  console.log('[+] updating company', companyId);
  const company = await CompanyModel.findOne({ _id: companyId });
  if (!company) throw new Error(`Company ${companyId} not found.`);
  const {
    companyName,
    url,
    logo,
    notes,
    primarySector,
  } = update;
  // handle primary sector update
  if (primarySector) {
    const doesCompanyHaveSector = company.sectors.find(s => s.sector.toString() === primarySector);
    if (!doesCompanyHaveSector) company.sectors.push({ sector: primarySector, primary: true });
    company.sectors.forEach(sector => {
      if (sector.sector.toString() !== primarySector && sector.primary) sector.primary = false;
      if (sector.sector.toString() === primarySector) sector.primary = true;
    });
  }
  // handle other sectors update
  if (update?.otherSector1) {
    for (let i = 1; i <= 100; i += 1) {
      const sector = update[`otherSector${i}`];
      if (!sector) break;
      const doesCompanyHaveSector = company.sectors.find(s => s.sector.toString() === sector);
      if (!doesCompanyHaveSector) company.sectors.push({ sector, primary: false });
    }
  }
  if (notes) company.notes += `; ${notes}`;
  // TODO: add some data validation to these
  if (logo) company.logo = logo;
  if (url) company.url = url;
  if (companyName) company.companyName = companyName;
  await company.save();
};

export const handleHideCompany = async (companyId: string, update: any): Promise<void> => {
  console.log('[+] hiding company', companyId);
  let { hiddenReason } = update;
  hiddenReason = hiddenReason?.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
  const isHiddenReasonValid = Object.values(CompanyHideReasons).includes(hiddenReason);
  if (!isHiddenReasonValid) hiddenReason = CompanyHideReasons.InvalidReason;
  const company = await CompanyModel.findOneAndUpdate({ _id: companyId }, { 'hidden.status': true, 'hidden.reason': hiddenReason });
  if (!company) throw new Error(`Company ${companyId} not found.`);
  console.log(`[+] hid company ${company?.companyName}`);
};

export const handleAddCompany = async (update: any): Promise<void> => {
  // TODO: need to add company
  const {
    companyName,
    url,
    logo,
    notes,
    primarySector,
    otherSector1,
    parentCompany,
  } = update;
  if (!companyName) throw new Error('company name is required.');
  const newCompany = new CompanyModel({
    companyName,
    url,
    logo,
    notes,
    primarySector,
    sectors: [],
    parentCompany,
  });
  if (otherSector1) {
    for (let i = 1; i <= 100; i += 1) {
      const sector = update[`otherSector${i}`];
      if (!sector) break;
      newCompany.sectors.push({ sector, primary: false });
    }
  }
  await newCompany.save();
  console.log('[+] added company', newCompany.companyName, newCompany._id);
};

export const handleRemoveParent = async (companyId: string): Promise<void> => {
  const company = await CompanyModel.updateOne({ _id: companyId }, { $unset: { parentCompany: '' } });
  if (!company) throw new Error(`Company ${companyId} not found.`);
  console.log('[+] removing parent company', companyId);
};

export const handleAddParent = async (companyId: string, update: any): Promise<void> => {
  const { parentCompany } = update;
  const company = await CompanyModel.findOne({ _id: companyId });
  const parent = await CompanyModel.findOne({ _id: parentCompany });

  if (!parent) throw new Error(`parent Company ${companyId} not found.`);

  company.parentCompany = parent._id;
  await company.save();
  console.log('[+] adding parent company', companyId);
};

export const updateCompanies = async (): Promise<void> => {
  const errors: any[] = [];
  const updatePath = path.resolve(__dirname, '.tmp', 'batchCompanyUpdates.csv');
  const updates = await csvtojson().fromFile(updatePath);
  let count = 0;

  console.log(`[+] updating ${updates.length} companies`);

  for (const update of updates) {
    console.log(`[+] processing update ${count + 1} of ${updates.length}`);
    const {
      companyId,
      companyName,
      action,
    } = update;
    try {
      switch (action) {
        case UpdateAction.Delete:
          await handleDeleteCompany(companyId);
          count += 1;
          break;
        case UpdateAction.Update:
          await handleUpdateCompany(companyId, update);
          count += 1;
          break;
        case UpdateAction.Hide:
          await handleHideCompany(companyId, update);
          count += 1;
          break;
        case UpdateAction.Add:
          await handleAddCompany(update);
          count += 1;
          break;
        case UpdateAction.RemoveParent:
          await handleRemoveParent(companyId);
          count += 1;
          break;
        case UpdateAction.AddParent:
          await handleAddParent(companyId, update);
          count += 1;
          break;
        default:
          errors.push({ companyName, companyId, error: 'Invalid action.' });
          console.log(`[-] ${companyName} - ${companyId} - Invalid action.`);
          break;
      }
    } catch (e: any) {
      errors.push({ companyName, companyId, error: e?.message });
      console.log(`[-] ${companyName} - ${companyId} - ${e?.message}`);
    }
  }
  if (errors.length > 0) fs.writeFileSync(path.resolve(__dirname, '.tmp', 'batchCompanyUpdatesErrors.json'), JSON.stringify(errors));
  console.log(`[#] updated ${count} companies with ${errors.length} errors`);
};

// Matched Company Names

enum MatchedCompanyNamesActions {
  Update = 'UPDATE',
  Delete = 'DELETE',
  Add = 'ADD',
}

enum MatchedCompanyNameUpdateType {
  Manual = 'MANUAL',
  FalsePositive = 'FALSE_POSITIVE',
}

export const handleAddMatchedCompanyName = async (update: any): Promise<void> => {
  const {
    companyName,
    original,
    companyId,
    type,
  } = update;
  if (!companyName || !type || !original || !companyId) throw new Error(`Invalid update: ${JSON.stringify(update)}`);
  let typeKey = '';
  switch (type) {
    case MatchedCompanyNameUpdateType.Manual:
      typeKey = 'manualMatch';
      break;
    case MatchedCompanyNameUpdateType.FalsePositive:
      typeKey = 'falsePositive';
      break;
    default:
      throw new Error(`Invalid update type: ${type}`);
  }
  await MatchedCompanyNameModel.findOneAndUpdate(
    {
      companyName,
      original,
      companyId,
      [typeKey]: true,
    },
    {
      companyName,
      original,
      companyId,
      [typeKey]: true,
    },
    {
      upsert: true,
    },
  );
};

export const updateMatchedCompanyNames = async (): Promise<void> => {
  const errors: any[] = [];
  const updatePath = path.resolve(__dirname, '.tmp', 'batchMatchedCompanyNames.csv');
  const updates = await csvtojson().fromFile(updatePath);
  let count = 0;

  console.log(`[+] updating ${updates.length} matched company names`);

  for (const update of updates) {
    console.log(`[+] processing update ${count + 1} of ${updates.length}`);
    const {
      companyId,
      companyName,
      action,
    } = update;
    try {
      switch (action) {
        case MatchedCompanyNamesActions.Add:
          await handleAddMatchedCompanyName(update);
          count += 1;
          break;
        default:
          errors.push({ companyName, companyId, error: 'Invalid action.' });
          console.log(`[-] ${companyName} - ${companyId} - Invalid action.`);
          break;
      }
    } catch (e: any) {
      errors.push({ companyName, companyId, error: e?.message });
      console.log(`[-] ${companyName} - ${companyId} - ${e?.message}`);
    }
  }
  if (errors.length > 0) fs.writeFileSync(path.resolve(__dirname, '.tmp', 'batchMatchedCompanyNamesErrors.json'), JSON.stringify(errors));
  console.log(`[#] updated ${count} matched company names with ${errors.length} errors`);
};

// UTILS
export const getNewlyCreatedCompanies = async () => {
  const newlyCreatedCompanies = await CompanyModel.find({ createdAt: { $gte: new Date('2022-7-25') } });
  return newlyCreatedCompanies;
};

const getAppUser = async (): Promise<IUserDocument> => {
  const appUser = await UserModel.findOne({ _id: process.env.APP_USER_ID });
  return appUser;
};

export const removeBadLogos = async (): Promise<void> => {
  let badlogos = 0;
  const companies = await getNewlyCreatedCompanies();
  for (const company of companies) {
    if (company?.logo?.includes('assets.karmawallet/company')) {
      console.log('[-] removing logo for', company.companyName, company.logo);
      await CompanyModel.update({ _id: company._id }, { $unset: { logo: 1 } });
      badlogos += 1;
    }
  }
  console.log('[+] removed', badlogos, 'logos');
};

// TODO: extract logo upload logic and delete function
export const __ARCHIVED__batchCompanyUpdates = async (): Promise<void> => {
  const errors = [];
  const updatePath = path.resolve(__dirname, '.tmp', 'batchCompanyUpdates.csv');
  const updates = await csvtojson().fromFile(updatePath);
  const appUser = await getAppUser();
  if (!appUser) throw new CustomError('App user not found.', ErrorTypes.NOT_FOUND);
  for (const update of updates) {
    const {
      companyName,
      updateExisting,
      existingCompanyIdToUpdate,
      url,
      logo,
      hiddenStatus,
      hiddenReason,
      notes,
      primary,
      secondary,
      tertiary,
      quaternary,
      quinary,
      senary,
    } = update;
    const additionalSectors = [secondary, tertiary, quaternary, quinary, senary].filter(v => !!v);
    if (logo) {
      const company = await CompanyModel.findOne({ companyName });
      try {
        const mockRequestForLogo = {
          ...mockRequest,
          requestor: appUser,
          body: {
            externalUrl: logo,
            fileId: company._id.toString(),
            filename: slugify(companyName),
          },
        };
        const { url: newLogoUrl } = await downloadImageFromUrlAndStoreInS3(mockRequestForLogo);
        console.log(`[+] successfully downloaded logo for ${companyName} - ${newLogoUrl}`);
        company.logo = newLogoUrl;
        await company.save();
      } catch (e: any) {
        errors.push({ companyName, companyId: company._id, error: e?.message });
      }
    }
  }
  if (errors.length > 0) fs.writeFileSync(path.resolve(__dirname, '.tmp', 'batchCompanyUpdatesErrors.json'), JSON.stringify(errors));
};

export const __ARCHIVED__updateCompanyDataSources = async (): Promise<void> => {
  const errors: string | any[] = [];
  const updatePath = path.resolve(__dirname, '.tmp', 'companyDataSources.csv');
  const updates = await csvtojson().fromFile(updatePath);
  for (const update of updates) {
    const { companyId, companyName, dataSourceId, dataSourceName, action, expiration, value, isPrimary: _isPrimary, primaryReplacementDataSourceId } = update;
    const isPrimary = !!_isPrimary && _isPrimary?.toLowerCase() === 'true';
    const company = await CompanyModel.findOne({ _id: companyId });
    if (!company) {
      errors.push({ companyName, companyId, error: 'Company not found.' });
      console.log(`[-] ${companyName} - ${companyId} - Company not found.`);
      continue;
    }
    if (action.toLowerCase() === 'update') {
      // remove the current primary data source designation
      const primaryDataSource = await CompanyDataSourceModel.findOne({ company: companyId, isPrimary: true });
      if (primaryDataSource) {
        primaryDataSource.isPrimary = false;
        await primaryDataSource.save();
        console.log(`[+] removed primary data source designation for ${companyName}`);
      } else {
        console.log(`[-] ${companyName} - ${companyId} - No primary data source found.`);
        errors.push({ companyName, companyId, error: 'No primary data source found.' });
      }
      // update the current data source to primary
      const dataSource = await CompanyDataSourceModel.findOne({ company: companyId, source: dataSourceId });
      if (!dataSource) {
        errors.push({ companyName, companyId, error: 'Data source not found.' });
        console.log(`[-] ${companyName} - ${companyId} - Data source not found.`);
        continue;
      }
      dataSource.isPrimary = true;
      await dataSource.save();
      console.log(`[+] updated primary data source for ${companyName}`);
    }
    if (action.toLowerCase() === 'remove') {
      try {
        const parent = await CompanyDataSourceModel.findOne({ company: companyId, source: dataSourceId });
        const children = await CompanyModel.find({ parentCompany: parent.company });
        const childrenDataSources = await CompanyDataSourceModel.find({ source: dataSourceId, company: { $in: children.map(c => c._id) } });
        console.log('[+] removing data source', dataSourceName, 'for', companyName);
        await parent.delete();
        for (const child of childrenDataSources) {
          console.log(`[+] removing inherited data source for ${child.source} for ${child.company}`);
          await child.delete();
        }
      } catch (e: any) {
        errors.push({ companyName, companyId, error: e?.message });
        console.log(`[-] ${companyName} - ${companyId} - ${e?.message}`);
      }
    }
    if (action.toLowerCase() === 'add') {
      try {
        const dataSource = await DataSourceModel.findOne({ _id: dataSourceId });
        if (!dataSource) {
          errors.push({ companyName, companyId, error: 'Data source not found.' });
          console.log(`[-] ${companyName} - ${companyId} - Data source not found.`);
          continue;
        }
        let existingPrimaryDataSource;
        if (isPrimary) existingPrimaryDataSource = await CompanyDataSourceModel.findOne({ company: companyId, isPrimary: true });
        const newCompanyDataSource = await CompanyDataSourceModel.findOneAndUpdate(
          {
            company: companyId,
            source: dataSourceId,
          },
          {
            isPrimary: !!isPrimary,
            dateRange: {
              start: dayjs().toDate(),
              end: dayjs(expiration).toDate(),
            },
            status: value,
          },
          { new: true, upsert: true },
        );
        await newCompanyDataSource.save();
        console.log(`[+] added data source for ${companyName}`);
        if (isPrimary && existingPrimaryDataSource) {
          existingPrimaryDataSource.isPrimary = false;
          await existingPrimaryDataSource.save();
          console.log(`[+] removed primary data source designation for ${companyName}`);
        }
      } catch (e: any) {
        errors.push({ companyName, companyId, error: e?.message });
        console.log(`[-] ${companyName} - ${companyId} - ${e?.message}`);
      }
    }
  }
  if (errors.length > 0) fs.writeFileSync(path.resolve(__dirname, '.tmp', 'companyDataSourcesErrors.json'), JSON.stringify(errors));
};
