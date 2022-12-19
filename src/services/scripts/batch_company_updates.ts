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
import { getUtcDate } from '../../lib/date';
import { DataSourceMappingModel } from '../../models/dataSourceMapping';
import { UnsdgModel } from '../../models/unsdg';

// NOVEMBER ADDITION
// 1) If company is updated and has sectors, overwrite all sectors on company
// 2) Company Data Source can have status of 1 or -1
// 3) Unhide company if ACTION is unhide
// 4) Update false-positive false-negative logic (remove all manual match false)

// Data Source Mapping Updates
enum DataSourceMappingUpdateAction {
  Delete = 'DELETE',
  Update = 'UPDATE',
  Add = 'ADD',
}

const handleUpdateOrAddDataSourceMapping = async (update: any) => {
  const { _id, source, _1, _1_1, _1_2, _1_3, _1_4, _1_5, _1_a, _1_b, _2, _2_1, _2_2, _2_3, _2_4, _2_5, _2_a, _2_b, _2_c, _3, _3_1, _3_2, _3_3, _3_4, _3_5, _3_6, _3_7, _3_8, _3_9, _3_a, _3_b, _3_c, _3_d, _4, _4_1, _4_2, _4_3, _4_4, _4_5, _4_6, _4_7, _4_a, _4_b, _4_c, _5, _5_1, _5_2, _5_3, _5_4, _5_5, _5_6, _5_a, _5_b, _5_c, _6, _6_1, _6_2, _6_3, _6_4, _6_5, _6_6, _6_a, _6_b, _7, _7_1, _7_2, _7_3, _7_a, _7_b, _8, _8_1, _8_2, _8_3, _8_4, _8_5, _8_6, _8_7, _8_8, _8_9, _8_10, _8_a, _8_b, _9, _9_1, _9_2, _9_3, _9_4, _9_5, _9_a, _9_b, _9_c, _10, _10_1, _10_2, _10_3, _10_4, _10_5, _10_6, _10_7, _10_a, _10_b, _10_c, _11, _11_1, _11_2, _11_3, _11_4, _11_5, _11_6, _11_7, _11_a, _11_b, _11_c, _12, _12_1, _12_2, _12_3, _12_4, _12_5, _12_6, _12_7, _12_8, _12_a, _12_b, _12_c, _13, _13_1, _13_2, _13_3, _13_a, _13_b, _14, _14_1, _14_2, _14_3, _14_4, _14_5, _14_6, _14_7, _14_a, _14_b, _14_c, _15, _15_1, _15_2, _15_3, _15_4, _15_5, _15_6, _15_7, _15_8, _15_9, _15_a, _15_b, _15_c, _16, _16_1, _16_2, _16_3, _16_4, _16_5, _16_6, _16_7, _16_8, _16_9, _16_10, _16_a, _16_b } = update;
  const undsgs = [
    _1,
    _2,
    _3,
    _4,
    _5,
    _6,
    _7,
    _8,
    _9,
    _10,
    _11,
    _12,
    _13,
    _14,
    _15,
    _16,
  ];
  const targetMappings = {
    _1: [_1_1, _1_2, _1_3, _1_4, _1_5, _1_a, _1_b],
    _2: [_2_1, _2_2, _2_3, _2_4, _2_5, _2_a, _2_b, _2_c],
    _3: [_3_1, _3_2, _3_3, _3_4, _3_5, _3_6, _3_7, _3_8, _3_9, _3_a, _3_b, _3_c, _3_d],
    _4: [_4_1, _4_2, _4_3, _4_4, _4_5, _4_6, _4_7, _4_a, _4_b, _4_c],
    _5: [_5_1, _5_2, _5_3, _5_4, _5_5, _5_6, _5_a, _5_b, _5_c],
    _6: [_6_1, _6_2, _6_3, _6_4, _6_5, _6_6, _6_a, _6_b],
    _7: [_7_1, _7_2, _7_3, _7_a, _7_b],
    _8: [_8_1, _8_2, _8_3, _8_4, _8_5, _8_6, _8_7, _8_8, _8_9, _8_10, _8_a, _8_b],
    _9: [_9_1, _9_2, _9_3, _9_4, _9_5, _9_a, _9_b, _9_c],
    _10: [_10_1, _10_2, _10_3, _10_4, _10_5, _10_6, _10_7, _10_a, _10_b, _10_c],
    _11: [_11_1, _11_2, _11_3, _11_4, _11_5, _11_6, _11_7, _11_a, _11_b, _11_c],
    _12: [_12_1, _12_2, _12_3, _12_4, _12_5, _12_6, _12_7, _12_8, _12_a, _12_b, _12_c],
    _13: [_13_1, _13_2, _13_3, _13_a, _13_b],
    _14: [_14_1, _14_2, _14_3, _14_4, _14_5, _14_6, _14_7, _14_a, _14_b, _14_c],
    _15: [_15_1, _15_2, _15_3, _15_4, _15_5, _15_6, _15_7, _15_8, _15_9, _15_a, _15_b, _15_c],
    _16: [_16_1, _16_2, _16_3, _16_4, _16_5, _16_6, _16_7, _16_8, _16_9, _16_a, _16_b],
  };
  let dataSourceMapping = await DataSourceMappingModel.findOne({ source });
  if (!dataSourceMapping) {
    const _dataSourceMapping = await DataSourceMappingModel.findOne({}).lean();
    dataSourceMapping = new DataSourceMappingModel({ source, unsdgs: _dataSourceMapping.unsdgs });
  }
  for (let i = 0; i < 16; i += 1) {
    const unsdgValue = parseFloat(undsgs[i]);
    const goalNum = i + 1;
    const goalNumKey = `_${goalNum}`;
    const unsdg = await UnsdgModel.findOne({ goalNum });
    if (!unsdg) continue;
    const unsdgMappingObject = dataSourceMapping.unsdgs.find((_unsdg) => _unsdg.unsdg.toString() === unsdg._id.toString());
    if (!unsdgMappingObject) throw new Error('Unsdg mapping object not found');
    const exists = !Number.isNaN(unsdgValue);
    unsdgMappingObject.exists = exists;
    unsdgMappingObject.value = exists ? unsdgValue : null;
    // @ts-ignore
    const targets = targetMappings[goalNumKey];
    for (let j = 0; j < targets.length; j += 1) {
      const targetValue = parseFloat(targets[j]);
      const targetObject = unsdgMappingObject.targets[j];
      if (!targetObject) throw new Error('targetObject mapping object not found');
      const targetExists = !Number.isNaN(targetValue);
      targetObject.exists = targetExists;
      targetObject.value = targetExists ? targetValue : null;
    }
  }
  await dataSourceMapping.save();
  console.log(`Updated data source mapping for ${source}`);
};

const handleDeleteDataSourceMapping = async (update: any) => {
  console.log('Updating data source mapping', update);
};

export const updateDataSourceMapping = async () => {
  const errors: any[] = [];
  const updatePath = path.resolve(__dirname, '.tmp', 'batchDataSourceMappings.csv');
  const updates = await csvtojson().fromFile(updatePath);
  let count = 0;
  console.log(`[+] updating ${updates.length} company data sources`);
  for (const update of updates) {
    try {
      const { action } = update;
      switch (action) {
        case DataSourceMappingUpdateAction.Delete:
          await handleDeleteDataSourceMapping(update);
          break;
        case DataSourceMappingUpdateAction.Update:
        case DataSourceMappingUpdateAction.Add:
          await handleUpdateOrAddDataSourceMapping(update);
          break;
        default:
          throw new Error(`Invalid action: ${action}`);
      }
      count += 1;
    } catch (e: any) {
      console.log(e);
      errors.push(e);
    }
  }
  if (errors.length > 0) fs.writeFileSync(path.resolve(__dirname, '.tmp', 'batchDataSourceMappingErrors.json'), JSON.stringify(errors));
  console.log(`[#] updated ${count} data source mappings with ${errors.length} errors`);
};

// Data Source Updates

enum DataSourceUpdateAction {
  Delete = 'DELETE',
  Update = 'UPDATE',
  Add = 'ADD',
}

const handleAddDataSource = async (update: any) => {
  console.log('Adding data source', update);
};

const handleUpdateDataSource = async (update: any) => {
  const {
    _id,
    name,
    logoUrl,
    description,
    notes,
    rank,
    url,
    hidden,
    expiration,
  } = update;
  const dataSource = await DataSourceModel.findOne({ _id });
  if (!dataSource) throw new Error(`No data source found for update: ${JSON.stringify(update)}`);
  if (notes) dataSource.notes += `; ${notes}`;
  if (name) dataSource.name = name;
  if (description) dataSource.description = description;
  if (rank) dataSource.rank = rank;
  if (url) dataSource.url = url;
  if (logoUrl) dataSource.logoUrl = logoUrl;
  if (hidden === 'TRUE') dataSource.hidden = true;
  if (hidden === 'FALSE') dataSource.hidden = false;
  if (expiration) {
    const _expiration = dayjs(expiration).toDate();
    await CompanyDataSourceModel.updateMany({ source: _id }, { 'dateRange.end': _expiration });
  }
  await dataSource.save();
};

const handleDeleteDataSource = async (update: any) => {
  console.log('Adding data source', update);
};

export const updateDataSources = async () => {
  const errors: any[] = [];
  const updatePath = path.resolve(__dirname, '.tmp', 'batchDataSources.csv');
  const updates = await csvtojson().fromFile(updatePath);
  let count = 0;
  for (const update of updates) {
    try {
      const { action } = update;
      switch (action) {
        case DataSourceUpdateAction.Add:
          await handleAddDataSource(update);
          break;
        case DataSourceUpdateAction.Update:
          await handleUpdateDataSource(update);
          break;
        case DataSourceUpdateAction.Delete:
          await handleDeleteDataSource(update);
          break;
        default:
          throw new Error(`Invalid action: ${action}`);
      }
    } catch (err: any) {
      errors.push({ dataSourceId: update._id, error: err.message });
      console.log(`[-] ${update.companyId} - ${update.dataSourceId} - ${err.message}`);
    }
    count += 1;
  }
  console.log(`[+] updating ${updates.length} company data sources`);
  if (errors.length > 0) fs.writeFileSync(path.resolve(__dirname, '.tmp', 'batchDataSourcesErrors.json'), JSON.stringify(errors));
  console.log(`[#] updated ${count} data sources with ${errors.length} errors`);
};

// Company Data Source Updates

// Data Source Mappings

// Value Updates

// Company Data Source Updates
enum CompanyDataSourceUpdateActions {
  Add = 'ADD',
  Delete = 'DELETE',
}

const handleAddCompanyDataSource = async (update: any) => {
  const { name, nameDs } = update;
  let { dataSourceId } = update;
  let { companyId } = update;
  if (!companyId && name) {
    const company = await CompanyModel.findOne({ companyName: name });
    if (!company) await CompanyModel.findOne({ _id: companyId });
    if (!company) throw new Error(`No company found for update: ${JSON.stringify(update)}`);
    companyId = company._id;
  }
  if (!dataSourceId) {
    const _dataSourceId = await DataSourceModel.findOne({ name: nameDs });
    if (!_dataSourceId) throw new Error(`No data source found for update: ${JSON.stringify(update)}`);
    dataSourceId = _dataSourceId._id;
  }
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
  let _dataSourceId;
  if (!update.dataSourceId) {
    _dataSourceId = await DataSourceModel.findOne({ name: update.nameDs });
    if (!_dataSourceId) throw new Error(`No data source found for update: ${JSON.stringify(update)}`);
  }
  let query: any = { company: update.companyId };
  if (update.dataSourceId) query = { ...query, source: update.dataSourceId };
  else query = { ...query, source: _dataSourceId._id.toString() };
  console.log('query', query);
  const existingCompanyDataSource = await CompanyDataSourceModel.findOne(query);
  console.log({ existingCompanyDataSource });
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
  await CompanyDataSourceModel.deleteMany({ company: companyId });
  console.log(`[+] deleted company and company data sources ${company?.companyName}`);
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
    company.sectors = [{ sector: primarySector, primary: true }];
    for (let i = 1; i <= 100; i += 1) {
      const sector = update[`otherSector${i}`];
      if (!sector) break;
      company.sectors.push({ sector, primary: false });
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
    sectors: [{ sector: primarySector, primary: true }],
    createdAt: getUtcDate(),
  });
  if (parentCompany) newCompany.parentCompany = parentCompany;
  let { hiddenReason } = update;
  if (hiddenReason) {
    hiddenReason = hiddenReason?.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    const isHiddenReasonValid = Object.values(CompanyHideReasons).includes(hiddenReason);
    if (!isHiddenReasonValid) hiddenReason = CompanyHideReasons.InvalidReason;
    newCompany.hidden = {
      status: true,
      reason: hiddenReason,
      ...newCompany.hidden,
    };
  } else {
    newCompany.hidden = {
      status: false,
      reason: CompanyHideReasons.None,
      ...newCompany.hidden,
    };
  }
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

// main function to update companies from the monthly batch updates CSV
// sector parent inheritance is handled separately in effects
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
  Remove = 'REMOVE',
  Add = 'ADD',
}

enum MatchedCompanyNameUpdateType {
  Manual = 'MANUAL',
  FalsePositive = 'FALSE_POSITIVE',
}

export const handleAddMatchedCompanyName = async (update: any): Promise<void> => {
  const {
    original,
    companyId,
    type,
  } = update;
  let company: any;
  if (companyId) company = await CompanyModel.findOne({ _id: companyId });
  let companyName = '';
  if (company) companyName = company.companyName;
  if (!type || !original) throw new Error(`Invalid update: ${JSON.stringify(update)}`);
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
  const query: any = {
    original,
    [typeKey]: true,
  };

  if (companyName) query.companyName = companyName;
  if (company) query.companyId = companyId;
  await MatchedCompanyNameModel.findOneAndUpdate(
    {
      ...query,
    },
    {
      ...query,
    },
    {
      upsert: true,
    },
  );
};

export const handleRemoveMatchedCompanyName = async (update: any): Promise<void> => {
  const {
    original,
    companyId,
    type,
  } = update;
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
  const query = { [typeKey]: true, original };
  if (companyId) query.companyId = companyId;
  const match = await MatchedCompanyNameModel.findOne(query);
  if (!match) throw new Error(`Matched company name ${original} not found.`);
  await MatchedCompanyNameModel.deleteOne({ _id: match._id });
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
        case MatchedCompanyNamesActions.Remove:
          await handleRemoveMatchedCompanyName(update);
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
