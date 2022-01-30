import _ from 'lodash';
import { FilterQuery } from 'mongoose';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import {
  CompanyModel, ICompany, ICompanyDocument, ICompanyModel, ISharableCompany,
} from '../../models/company';
import { CompanyUnsdgModel, ICompanyUnsdg } from '../../models/companyUnsdg';
import { DataSourceModel, IDataSourceModel } from '../../models/dataSource';
import { ISectorModel, SectorModel } from '../../models/sector';
import { UnsdgModel } from '../../models/unsdg';
import { UnsdgCategoryModel } from '../../models/unsdgCategory';
import { UnsdgSubcategoryModel } from '../../models/unsdgSubcategory';
import { IRequest } from '../../types/request';
import { getShareableDataSource } from '../dataSources';
import { getSharableSector } from '../sectors';

const _getSampleCompanies = async (filter: FilterQuery<ICompany>, size: number, projection: { [key: string]: any }) => {
  const companies = await CompanyModel.aggregate([{ $match: filter }]).sample(size).project(projection);
  return companies;
};

const _checkSort = <T>(data: T[], sort: boolean, field: keyof T) => {
  if (!sort) return data;
  return data.sort((a, b) => (b[field] > a[field] ? -1 : b[field] < a[field] ? 1 : 0));
};

const _getCompanyUNSDGs = (query: FilterQuery<ICompanyUnsdg>) => CompanyUnsdgModel
  .find(query)
  .populate({
    path: 'unsdg',
    model: UnsdgModel,
    populate: {
      path: 'subCategory',
      model: UnsdgSubcategoryModel,
      populate: {
        path: 'category',
        model: UnsdgCategoryModel,
      },
    },
  });

export const getCompanyById = async (__: IRequest, _id: string) => {
  console.log('>>>>> _id: ', _id);

  try {
    const company = await CompanyModel.findOne({ _id })
      .populate({
        path: 'parentCompany',
        model: CompanyModel,
        populate: [
          {
            path: 'sectors',
            model: SectorModel,
          },
          {
            path: 'dataSource',
            model: DataSourceModel,
          },
        ],
      })
      .populate({
        path: 'sectors',
        model: SectorModel,
      })
      .populate({
        path: 'dataSources',
        model: DataSourceModel,
      });

    if (!company) throw new CustomError('Company not found.', ErrorTypes.NOT_FOUND);

    return company;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getCompanies = (__: IRequest, query: FilterQuery<ICompany>) => {
  const options = {
    projection: query?.projection || '',
    populate: query.population || [
      {
        path: 'parentCompany',
        model: CompanyModel,
        populate: [
          {
            path: 'sectors',
            model: SectorModel,
          },
          {
            path: 'dataSources',
            model: DataSourceModel,
          },
        ],
      },
      {
        path: 'sectors',
        model: SectorModel,
      },
      {
        path: 'dataSources',
        model: DataSourceModel,
      },
    ],
    lean: true,
    page: query?.skip || 1,
    sort: query?.sort ? { ...query.sort, _id: 1 } : { companyName: 1, _id: 1 },
    limit: query?.limit || 10,
  };
  return CompanyModel.paginate(query.filter, options);
};

export const getSample = async (__: IRequest, query: FilterQuery<ICompany>) => {
  const data = {};
  const { aggregates, projection, sort } = query;
  const { categories, subcategories } = aggregates;
  // Set Defaults or Query Values
  const size = query?.filter?.size || 6;
  const minScore = query?.filter?.minScore || 0;
  delete query.filter.size;
  delete query.filter.minScore;
  delete query.filter.subcategories;
  delete query.filter.categories;
  delete query.filter.badges;
  const _projection = _.isEmpty(projection) ? {
    badgeCounts: 1, grade: 1, badges: 1, combinedScore: 1, companyName: 1, categories: 1, subcategories: 1, logo: 1, logos: 1,
  } : projection;
  const defaultFilter = { combinedScore: { $gte: minScore } };
  // if (badges.length) {
  //   data.badges = [];
  //   for (let i = 0; i < badges.length; i += 1) {
  //     const badgeId = badges[i];
  //     const primaryFilter = { badges: badgeId };
  //     const companies = await _getSampleCompanies({ ...primaryFilter, ...defaultFilter, ...query.filter }, size, _projection);
  //     const info = await badgeModel.findOne({ _id: badgeId }).select('badgeId badgeName image badgeCategory').lean();
  //     data.badges.push({ companies, ...info });
  //   }
  //   data.badges = _checkSort(data.badges, !!sort?.badges, 'badgeName');
  // }
  // if (categories.length) {
  //   data.categories = [];
  //   for (let i = 0; i < categories.length; i += 1) {
  //     const categoryId = categories[i];
  //     const primaryFilter = { categories: categoryId };
  //     const companies = await _getSampleCompanies({ ...primaryFilter, ...defaultFilter, ...query.filter }, size, _projection);
  //     const info = await categoryModel.findOne({ _id: categoryId }).select('name subcategories').lean();
  //     data.categories.push({ companies, ...info });
  //   }
  //   data.categories = _checkSort(data.categories, !!sort?.categories, 'name');
  // }
  // if (subcategories.length) {
  //   data.subcategories = [];
  //   for (let i = 0; i < subcategories.length; i += 1) {
  //     const subcategoryId = subcategories[i];
  //     const primaryFilter = { subcategories: subcategoryId };
  //     const companies = await _getSampleCompanies({ ...primaryFilter, ...defaultFilter, ...query.filter }, size, _projection);
  //     const info = await subcategoryModel.findOne({ _id: subcategoryId }).select('name parentCategory').populate('parentCategory', 'name').lean();
  //     data.subcategories.push({ companies, ...info });
  //   }
  //   data.subcategories = _checkSort(data.subcategories, !!sort?.subcategories, 'name');
  // }
  return data;
};

// TODO: clean this function up...should not return string | Company
export const compare = async (__: IRequest, query: FilterQuery<ICompany>) => {
  let topPick = 'Avoid All';
  let noClearPick = false;
  let topPickScore = 30;
  const companies = await CompanyModel.find({ _id: { $in: query.companies } })
    .populate({
      path: 'sectors',
      model: SectorModel,
    })
    .lean();
  companies.forEach(company => {
    if (company.combinedScore > topPickScore) {
      topPick = company;
      topPickScore = company.combinedScore;
      noClearPick = false;
    } else if (company.combinedScore === topPickScore) {
      noClearPick = true;
    }
  });
  topPick = noClearPick ? 'No Clear Pick' : topPick;

  return { companies, topPick };
};

// TODO: update to use new partner collection
export const getPartners = (req: IRequest, companiesCount: number) => CompanyModel
  .find({ isPartner: true })
  .limit(companiesCount);

export const getCompanyUNSDGs = async (__: IRequest, companyId: string, year: number) => {
  try {
    let unsdgs = await _getCompanyUNSDGs({
      companyId,
      year,
    });

    // if no unsdgs found, try to retrieve from previous year
    if (!unsdgs.length) {
      unsdgs = await _getCompanyUNSDGs({
        companyId,
        year: year - 1,
      });
    }

    if (!unsdgs.length) throw new CustomError('No UNSDGs were found for this company.', ErrorTypes.NOT_FOUND);
    return unsdgs;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getShareableCompany = ({
  _id,
  combinedScore,
  companyName,
  dataSources,
  dataYear,
  grade,
  isBrand,
  parentCompany,
  sectors,
  slug,
  url,
}: ICompanyDocument): ISharableCompany => {
  // since these are refs, they could be id's or a populated
  // value. have to check if they are populated, and if so
  // need to get the sharable version of each resource.
  const _dataSources = (!!dataSources && !!(dataSources as IDataSourceModel[]).filter(d => !!Object.keys(d).length).length)
    ? dataSources.map(d => getShareableDataSource(d as IDataSourceModel))
    : dataSources;
  const _parentCompany = (!!parentCompany && Object.keys(parentCompany).length) ? getShareableCompany(parentCompany as ICompanyModel) : null;
  const _sectors = (!!sectors && !!(sectors as ISectorModel[]).filter(s => !!Object.keys(s).length).length)
    ? sectors.map(s => getSharableSector(s as ISectorModel))
    : sectors;

  return {
    _id,
    combinedScore,
    companyName,
    dataSources: _dataSources,
    dataYear,
    grade,
    isBrand,
    parentCompany: _parentCompany,
    sectors: _sectors,
    slug,
    url,
  };
};
