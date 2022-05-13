import dayjs from 'dayjs';
import { FilterQuery } from 'mongoose';
import { ErrorTypes, sectorsToExclude } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import {
  CompanyModel, ICompany, ICompanyDocument, IShareableCompany,
} from '../../models/company';
import { CompanyUnsdgModel, ICompanyUnsdg, ICompanyUnsdgDocument } from '../../models/companyUnsdg';
import { ISectorModel, SectorModel } from '../../models/sector';
import { IUnsdgDocument, UnsdgModel } from '../../models/unsdg';
import { IUnsdgCategoryDocument, UnsdgCategoryModel } from '../../models/unsdgCategory';
import { IUnsdgSubcategoryDocument, UnsdgSubcategoryModel } from '../../models/unsdgSubcategory';
import { IRequest } from '../../types/request';
import { getShareableSector } from '../sectors';
import { getShareableCategory, getShareableSubCategory, getShareableUnsdg } from '../unsdgs';

export interface ICompanyRequestParams {
  companyId: string;
}

export interface IUpdateCompanyRequestBody {
  companyName: string;
  url: string;
}

/**
 * this function should only be used internally. for anything client
 * facing, please use functions: getCompanies as it has pagination
 * included...this one does not.
 */
export const _getCompanies = (query: FilterQuery<ICompany> = {}, includeHidden = false) => {
  const _query = Object.entries(query).map(([key, value]) => ({ [key]: value }));
  _query.push({ 'hidden.status': includeHidden });
  _query.push({ 'sectors.sector': { $nin: sectorsToExclude } });

  return CompanyModel
    .find({ $and: _query })
    .populate([
      {
        path: 'parentCompany',
        model: CompanyModel,
        populate: {
          path: 'sectors.sector',
          model: SectorModel,
        },
      },
      {
        path: 'sectors.sector',
        model: SectorModel,
      },
    ]);
};

export const getCompanyUNSDGs = (_: IRequest, query: FilterQuery<ICompanyUnsdg>) => CompanyUnsdgModel
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

export const getCompanyById = async (req: IRequest, _id: string, includeHidden = false) => {
  try {
    const query: FilterQuery<ICompany> = { _id };
    if (!includeHidden) query['hidden.status'] = false;

    const company = await CompanyModel.findOne(query)
      .populate([
        {
          path: 'parentCompany',
          model: CompanyModel,
          populate: [
            {
              path: 'sectors.sector',
              model: SectorModel,
            },
          ],
        },
        {
          path: 'sectors.sector',
          model: SectorModel,
        },
        {
          path: 'categoryScores.category',
          model: UnsdgCategoryModel,
        },
        {
          path: 'subcategoryScores.subcategory',
          model: UnsdgSubcategoryModel,
        },
      ]);

    if (!company) throw new CustomError('Company not found.', ErrorTypes.NOT_FOUND);

    const unsdgs = await getCompanyUNSDGs(req, { company });

    return { company, unsdgs };
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getCompanies = (__: IRequest, query: FilterQuery<ICompany>, includeHidden = false) => {
  const options = {
    projection: query?.projection || '',
    populate: query.population || [
      {
        path: 'parentCompany',
        model: CompanyModel,
        populate: [
          {
            path: 'sectors.sector',
            model: SectorModel,
          },
        ],
      },
      {
        path: 'sectors.sector',
        model: SectorModel,
      },
    ],
    page: query?.skip || 1,
    sort: query?.sort ? { ...query.sort, _id: 1 } : { companyName: 1, _id: 1 },
    limit: query?.limit || 10,
  };
  const filter: FilterQuery<ICompany> = { ...query.filter };
  if (!includeHidden) filter['hidden.status'] = false;
  return CompanyModel.paginate(filter, options);
};

export const compare = async (__: IRequest, query: FilterQuery<ICompany>, includeHidden = false) => {
  let topPick: ICompanyDocument = null;
  let noClearPick = false;
  let topPickScore = -5;

  const _query: FilterQuery<ICompany> = { _id: { $in: query.companies } };
  if (!includeHidden) query['hidden.status'] = false;
  const companies: ICompanyDocument[] = await CompanyModel.find(_query)
    .populate({
      path: 'sectors.sector',
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

  return {
    companies,
    topPick,
    noClearPick,
    avoidAll: !noClearPick && !topPick,
  };
};

// TODO: update to use new partner collection
export const getPartners = (req: IRequest, companiesCount: number, includeHidden = false) => {
  const query: FilterQuery<ICompany> = { isPartner: true };
  if (!includeHidden) query['hidden.status'] = false;
  return CompanyModel
    .find(query)
    .limit(companiesCount);
};

export const getShareableCompany = ({
  _id,
  combinedScore,
  categoryScores,
  subcategoryScores,
  companyName,
  dataYear,
  grade,
  isBrand,
  logo,
  parentCompany,
  sectors,
  slug,
  url,
  lastModified,
}: ICompanyDocument) => {
  // since these are refs, they could be id's or a populated
  // value. have to check if they are populated, and if so
  // need to get the sharable version of each resource.
  const _parentCompany: IShareableCompany = (!!parentCompany && Object.keys(parentCompany).length)
    ? getShareableCompany(parentCompany as ICompanyDocument)
    : null;

  const _categoryScores = (categoryScores || []).map(cs => ((!!cs && !!Object.values(cs).length)
    ? {
      category: !!cs.category && !!Object.values(cs.category).length
        ? getShareableCategory(cs.category as IUnsdgCategoryDocument)
        : cs.category,
      score: cs.score,
    }
    : cs));

  const _subcategoryScores = (subcategoryScores || []).map(scs => ((!!scs && !!Object.values(scs).length)
    ? {
      subcategory: !!scs.subcategory && !!Object.values(scs.subcategory).length
        ? getShareableSubCategory(scs.subcategory as IUnsdgSubcategoryDocument)
        : scs.subcategory,
      score: scs.score,
    }
    : scs));

  const _sectors = (!!sectors && !!sectors.filter(s => !!Object.keys(s.sector).length).length)
    ? sectors.map(s => ({
      sector: getShareableSector(s.sector as ISectorModel),
      primary: s.primary,
    }))
    : sectors;

  return {
    _id,
    combinedScore,
    categoryScores: _categoryScores,
    subcategoryScores: _subcategoryScores,
    companyName,
    dataYear,
    grade,
    isBrand,
    logo,
    parentCompany: _parentCompany,
    sectors: _sectors,
    slug,
    url,
    lastModified,
  };
};

export const getShareableCompanyUnsdg = ({
  unsdg,
  value,
}: ICompanyUnsdgDocument) => ({
  unsdg: getShareableUnsdg(unsdg as IUnsdgDocument),
  value,
});

export const updateCompany = async (req: IRequest<ICompanyRequestParams, {}, IUpdateCompanyRequestBody>) => {
  try {
    const { companyId } = req.params;
    const { companyName, url } = req.body;

    if (!companyId) throw new CustomError('A company id is required.', ErrorTypes.INVALID_ARG);
    if (!companyName && !url) throw new CustomError('No updatable company data found.', ErrorTypes.INVALID_ARG);

    const updatedData: Partial<ICompany> = {
      lastModified: dayjs().utc().toDate(),
    };

    // TODO: add name sterilization
    if (companyName) updatedData.companyName = companyName.trim();
    if (url) updatedData.url = url.trim();

    // TODO: add change log for record keeping.

    const company = await CompanyModel.findOneAndUpdate({ _id: companyId }, updatedData, { new: true });

    if (!company) throw new CustomError(`Company with id: ${companyId} could not be found.`, ErrorTypes.NOT_FOUND);

    return company;
  } catch (err) {
    throw asCustomError(err);
  }
};
