import dayjs from 'dayjs';
import { FilterQuery } from 'mongoose';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import {
  CompanyModel, ICompany, ICompanyDocument, ICompanyModel, IShareableCompany,
} from '../../models/company';
import { CompanyUnsdgModel, ICompanyUnsdg } from '../../models/companyUnsdg';
import { DataSourceModel, IDataSourceModel } from '../../models/dataSource';
import { ISectorModel, SectorModel } from '../../models/sector';
import { UnsdgModel } from '../../models/unsdg';
import { UnsdgCategoryModel } from '../../models/unsdgCategory';
import { UnsdgSubcategoryModel } from '../../models/unsdgSubcategory';
import { IRequest } from '../../types/request';
import { getShareableDataSource } from '../dataSources';
import { getShareableSector } from '../sectors';

export interface ICompanyRequestParams {
  companyId: string;
}

export interface IUpdateCompanyRequestBody {
  companyName: string;
  url: string;
}

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

export const getCompanyById = async (__: IRequest, _id: string, includeHidden = false) => {
  try {
    const query: FilterQuery<ICompany> = { _id };
    if (!includeHidden) query['hidden.status'] = false;

    const company = await CompanyModel.findOne(query)
      .populate({
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

    return (company as ICompanyModel);
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
  let topPickScore = 30;

  const _query: FilterQuery<ICompany> = { _id: { $in: query.companies } };
  if (!includeHidden) query['hidden.status'] = false;
  const companies: ICompanyDocument[] = await CompanyModel.find(_query)
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
  const _dataSources = (!!dataSources && !!(dataSources as IDataSourceModel[]).filter(d => !!Object.keys(d).length).length)
    ? dataSources.map(d => getShareableDataSource(d as IDataSourceModel))
    : dataSources;
  const _parentCompany: IShareableCompany = (!!parentCompany && Object.keys(parentCompany).length)
    ? getShareableCompany(parentCompany as ICompanyDocument)
    : null;
  const _sectors = (!!sectors && !!(sectors as ISectorModel[]).filter(s => !!Object.keys(s).length).length)
    ? sectors.map(s => getShareableSector(s as ISectorModel))
    : sectors;

  return {
    _id,
    combinedScore,
    companyName,
    dataSources: _dataSources,
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
