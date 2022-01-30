import _ from 'lodash';
import { FilterQuery } from 'mongoose';
import CustomError, { asCustomError } from '../../lib/customError';
import { CompanyModel, ICompany } from '../../models/company';
import { CompanyUnsdgModel, ICompanyUnsdg } from '../../models/companyUnsdg';
import { UnsdgModel } from '../../models/unsdg';
import { UnsdgCategoryModel } from '../../models/unsdgCategory';
import { UnsdgSubcategoryModel } from '../../models/unsdgSubcategory';
import { IRequest } from '../../types/request';

// const { RequiredError } = require('plaid/dist/base');
// const badgeModel = require('../../mongo/model/badge');
// const categoryModel = require('../../mongo/model/category');
// const subcategoryModel = require('../../mongo/model/subcategory');

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
  const data = await CompanyModel.findOne({ _id })
    .populate({
      path: 'categories',
      model: 'category',
      select: 'name',
    })
    .populate({
      path: 'subcategories',
      model: 'subcategory',
      select: 'name parentCategory',
    })
    // .populate({
    //   path: 'badges',
    //   model: 'badge',
    //   select: 'badgeId badgeName image badgeDescription badgeCategory',
    // })
    .populate({
      path: 'parentCompany',
      model: 'company',
      select: 'companyName',
    })
    .populate({
      path: 'brands',
      model: 'company',
      select: 'companyName',
    })
    .lean();
  return data;
};

export const getCompanies = async (__: IRequest, query: FilterQuery<ICompany>) => {
  const options = {
    projection: query?.projection || '',
    populate: query.population || [
      {
        path: 'parentCompany',
        model: 'company',
        populate: [{
          path: 'categories',
          model: 'category',
          select: 'name',
        },
        // {
        //   path: 'badges',
        //   model: 'badge',
        //   select: 'badgeId badgeName image badgeDescription badgeCategory',
        // },
        {
          path: 'subcategories',
          model: 'subcategory',
          select: 'name parentCategory',
        }],
        select: 'companyName logos categories subcategories badges grade',
      },
      // {
      //   path: 'badges',
      //   model: 'badge',
      //   select: 'badgeId badgeName image badgeDescription badgeCategory',
      // },
      {
        path: 'subcategories',
        model: 'subcategory',
        select: 'name parentCategory',
      },
      {
        path: 'categories',
        model: 'category',
        select: 'name',
      },
      {
        path: 'brands',
        populate: [
          {
            path: 'categories',
            model: 'category',
            select: 'name',
          },
          {
            path: 'subcategories',
            model: 'subcategory',
            select: 'name parentCategory',
          },
          // {
          //   path: 'badges',
          //   model: 'badge',
          //   select: 'badgeId badgeName image badgeDescription badgeCategory',
          // }
        ],
        model: 'company',
        select: 'companyName categories subcategories logos grade badges',
      }],
    lean: true,
    page: query?.skip || 1,
    sort: query?.sort ? { ...query.sort, _id: 1 } : { companyName: 1, _id: 1 },
    limit: query?.limit || 10,
  };
  const data = await CompanyModel.paginate(query.filter, options);
  return data;
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
  if (categories.length) {
    data.categories = [];
    for (let i = 0; i < categories.length; i += 1) {
      const categoryId = categories[i];
      const primaryFilter = { categories: categoryId };
      const companies = await _getSampleCompanies({ ...primaryFilter, ...defaultFilter, ...query.filter }, size, _projection);
      const info = await categoryModel.findOne({ _id: categoryId }).select('name subcategories').lean();
      data.categories.push({ companies, ...info });
    }
    data.categories = _checkSort(data.categories, !!sort?.categories, 'name');
  }
  if (subcategories.length) {
    data.subcategories = [];
    for (let i = 0; i < subcategories.length; i += 1) {
      const subcategoryId = subcategories[i];
      const primaryFilter = { subcategories: subcategoryId };
      const companies = await _getSampleCompanies({ ...primaryFilter, ...defaultFilter, ...query.filter }, size, _projection);
      const info = await subcategoryModel.findOne({ _id: subcategoryId }).select('name parentCategory').populate('parentCategory', 'name').lean();
      data.subcategories.push({ companies, ...info });
    }
    data.subcategories = _checkSort(data.subcategories, !!sort?.subcategories, 'name');
  }
  return data;
};

// TODO: clean this function up...should return string | Company
export const compare = async (__: IRequest, query: FilterQuery<ICompany>) => {
  let topPick = 'Avoid All';
  let noClearPick = false;
  let topPickScore = 30;
  const companies = await CompanyModel.find({ _id: { $in: query.companies } })
    .populate({
      path: 'categories',
      model: 'category',
      select: 'name',
    })
    .populate({
      path: 'subcategories',
      model: 'subcategory',
      select: 'name parentCategory',
    })
    // .populate({
    //   path: 'badges',
    //   model: 'badge',
    //   select: 'badgeId badgeName',
    // })
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

    if (!unsdgs.length) throw new CustomError('No UNSDGs were found for this company.');
    return unsdgs;
  } catch (err) {
    throw asCustomError(err);
  }
};
