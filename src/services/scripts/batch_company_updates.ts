import csvtojson from 'csvtojson';
import path from 'path';
import fs from 'fs';
import slugify from 'slugify';
import dayjs from 'dayjs';
import { ErrorTypes } from '../../lib/constants';
import { mockRequest } from '../../lib/constants/request';
import CustomError from '../../lib/customError';
import { CompanyModel } from '../../models/company';
import { IUserDocument, UserModel } from '../../models/user';
import { downloadImageFromUrlAndStoreInS3 } from '../upload';
import { CompanyDataSourceModel } from '../../models/companyDataSource';
import { DataSourceModel } from '../../models/dataSource';

export const getNewlyCreatedCompanies = async () => {
  const newlyCreatedCompanies = await CompanyModel.find({ createdAt: { $gte: new Date('2022-7-25') } });
  return newlyCreatedCompanies;
};

const getAppUser = async (): Promise<IUserDocument> => {
  const appUser = await UserModel.findOne({ _id: process.env.APP_USER_ID });
  return appUser;
};

export const batchCompanyUpdates = async (): Promise<void> => {
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

export const updateParentChildRelationships = async (): Promise<void> => {
  const errors: string | any[] = [];
  const updatePath = path.resolve(__dirname, '.tmp', 'parentChildUpdates.csv');
  const updates = await csvtojson().fromFile(updatePath);
  for (const update of updates) {
    const { companyName, companyId, parentId, removeParent } = update;
    const company = await CompanyModel.findOne({ _id: companyId });
    if (!company) {
      errors.push({ companyName, companyId, error: 'Company not found.' });
      console.log(`[-] ${companyName} - ${companyId} - Company not found.`);
      continue;
    }
    if (removeParent) {
      await CompanyModel.updateOne({ _id: companyId }, { $unset: { parentCompany: 1 } });
      console.log(`[+] removed parent relationship for ${companyName}`);
    }
    if (parentId) {
      const parent = await CompanyModel.findOne({ _id: parentId });
      if (!parent) {
        errors.push({ companyName, companyId, error: 'Parent company not found.' });
        console.log(`[-] parent relationship for ${companyName} not found.`);
        continue;
      }
      company.parentCompany = parent._id;
      await company.save();
      console.log(`[+] updated parent relationship for ${companyName}`);
    }
  }
  if (errors.length > 0) fs.writeFileSync(path.resolve(__dirname, '.tmp', 'parentChildUpdateErrors.json'), JSON.stringify(errors));
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

export const updateCompanyDataSources = async (): Promise<void> => {
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
    // if (action.toLowerCase() === 'update') {
    //   // remove the current primary data source designation
    //   const primaryDataSource = await CompanyDataSourceModel.findOne({ company: companyId, isPrimary: true });
    //   if (primaryDataSource) {
    //     primaryDataSource.isPrimary = false;
    //     await primaryDataSource.save();
    //     console.log(`[+] removed primary data source designation for ${companyName}`);
    //   } else {
    //     console.log(`[-] ${companyName} - ${companyId} - No primary data source found.`);
    //     errors.push({ companyName, companyId, error: 'No primary data source found.' });
    //   }
    //   // update the current data source to primary
    //   const dataSource = await CompanyDataSourceModel.findOne({ company: companyId, source: dataSourceId });
    //   if (!dataSource) {
    //     errors.push({ companyName, companyId, error: 'Data source not found.' });
    //     console.log(`[-] ${companyName} - ${companyId} - Data source not found.`);
    //     continue;
    //   }
    //   dataSource.isPrimary = true;
    //   await dataSource.save();
    //   console.log(`[+] updated primary data source for ${companyName}`);
    // }
    // if (action.toLowerCase() === 'remove') {
    //   try {
    //     const parent = await CompanyDataSourceModel.findOne({ company: companyId, source: dataSourceId });
    //     const children = await CompanyModel.find({ parentCompany: parent.company });
    //     const childrenDataSources = await CompanyDataSourceModel.find({ source: dataSourceId, company: { $in: children.map(c => c._id) } });
    //     console.log('[+] removing data source', dataSourceName, 'for', companyName);
    //     await parent.delete();
    //     for (const child of childrenDataSources) {
    //       console.log(`[+] removing inherited data source for ${child.source} for ${child.company}`);
    //       await child.delete();
    //     }
    //   } catch (e: any) {
    //     errors.push({ companyName, companyId, error: e?.message });
    //     console.log(`[-] ${companyName} - ${companyId} - ${e?.message}`);
    //   }
    // }
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

// on remove, get all companies with companyId as parentCompany
// remove any dataSourceId/companyIdChild in DB

// on add, upsert only
