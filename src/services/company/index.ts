import aqp from 'api-query-params';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { FilterQuery, isValidObjectId, ObjectId, PaginateDocument, PaginateResult, Types } from 'mongoose';
import { MainBullClient } from '../../clients/bull/main';
import { DefaultPaginationLimit, DefaultPaginationPage, ErrorTypes, MaxPaginationLimit, sectorsToExclude } from '../../lib/constants';
import { WildfireApiIds } from '../../lib/constants/client';
import { CompanyRating } from '../../lib/constants/company';
import { JobNames } from '../../lib/constants/jobScheduler';
import { convertFilterToObjectId } from '../../lib/convertFilterToObjectId';
import CustomError, { asCustomError } from '../../lib/customError';
import { getRandomInt } from '../../lib/number';
import { slugify } from '../../lib/slugify';
import { IApp } from '../../models/app';
import {
  CompanyCreationStatus,
  CompanyModel,
  ICompany,
  ICompanyDocument,
  IShareableCompany,
  CashbackCompanyDisplayLocation,
} from '../../models/company';
import { CompanyUnsdgModel, ICompanyUnsdg, ICompanyUnsdgDocument } from '../../models/companyUnsdg';
import { IJobReportDocument, JobReportModel, JobReportStatus } from '../../models/jobReport';
import { IMerchantDocument, IShareableMerchant, MerchantModel } from '../../models/merchant';
import { MerchantRateModel } from '../../models/merchantRate';
import { ISectorAverageScores, ISectorDocument, ISectorModel, SectorModel } from '../../models/sector';
import { IUnsdgDocument, UnsdgModel } from '../../models/unsdg';
import { IUnsdgCategoryDocument, UnsdgCategoryModel } from '../../models/unsdgCategory';
import { IUnsdgSubcategoryDocument, UnsdgSubcategoryModel } from '../../models/unsdgSubcategory';
import { IValueDocument, ValueModel } from '../../models/value';
import { IValueCompanyMapping, ValueCompanyMappingModel } from '../../models/valueCompanyMapping';
import { IRef } from '../../types/model';
import { IRequest } from '../../types/request';
import { Logger } from '../logger';
import { getShareableMerchant } from '../merchant';
import { getCompanyRatingsThresholds } from '../misc';
import { getShareableSector } from '../sectors';
import { getShareableCategory, getShareableSubCategory, getShareableUnsdg } from '../unsdgs';
import { CompanyDataSourceModel } from '../../models/companyDataSource';
import { DataSourceModel, IDataSourceDocument } from '../../models/dataSource';
import { getUtcDate } from '../../lib/date';
import { getShareableMerchantRate } from '../merchantRates';

dayjs.extend(utc);

const MAX_SAMPLE_SIZE = 25;

export interface ICompanyRequestParams {
  companyId: string;
}

export interface ICompanyRequestQuery {
  includeHidden?: boolean;
  search?: string;
  rating?: string;
  evaluatedUnsdgs?: string;
  cashback?: string;
  'sectors.sector'?: string;
}

export interface ICompanySearchRequest extends IRequest {
  query: ICompanyRequestQuery;
}

export interface IUpdateCompanyRequestBody {
  companyName: string;
  url: string;
  logo: string;
}

export interface ICompanySampleRequest {
  count?: number;
  sectors?: string;
  excludedCompanyIds?: string;
  ratings?: string;
}

export interface IBatchedCompaniesRequestBody {
  fileUrl: string;
}

export interface IBatchedCompanyParentChildRelationshipsRequestBody extends IBatchedCompaniesRequestBody {
  jobReportId?: string;
}

export interface IGetCompanyDataParams {
  page: string;
  limit: string;
}
export interface IGetPartnerQuery {
  companyId: string;
}

export interface IGetFeaturedCashbackCompaniesQuery {
  location?: CashbackCompanyDisplayLocation;
  'sectors.sector'?: string;
}

export interface IGetFeaturedCashbackCompaniesRequest {
  query: IGetFeaturedCashbackCompaniesQuery;
}

interface ISubcategoryScore {
  subcategory: string;
  score: number;
}

interface ICategoryScore {
  category: string;
  score: number;
}

interface ISectorScores {
  avgScore: number;
  avgPlanetScore: number;
  avgPeopleScore: number;
  avgSustainabilityScore: number;
  avgClimateActionScore: number;
  avgCommunityWelfareScore: number;
  avgDiversityInclusionScore: number;
}

interface ISector {
  name: string;
  scores: ISectorScores;
}

export interface ICompanyProtocol {
  companyName: string;
  values: string[];
  rating: CompanyRating;
  score: number;
  karmaWalletUrl: string;
  companyUrl: string;
  subcategoryScores: ISubcategoryScore[];
  categoryScores: ICategoryScore[];
  wildfireId?: number;
  sector: ISector;
}

interface IPagination {
  page: number;
  totalPages: number;
  limit: number;
  totalCompanies: number;
}

export interface IGetCompaniesResponse {
  companies: ICompanyProtocol[];
  pagination: IPagination;
}

export interface ISearchCompaniesQuery {
  search: string;
}

interface IFeaturedCashbackUpdatesParams {
  companyId: string;
  status: boolean;
  location: CashbackCompanyDisplayLocation[];
}

export const _getPaginatedCompanies = (query: FilterQuery<ICompany> = {}, includeHidden = false) => {
  const options = {
    projection: query?.projection || '',
    populate: query?.population || [
      {
        path: 'merchant',
        model: MerchantModel,
      },
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
  filter['creation.status'] = { $nin: [CompanyCreationStatus.PendingDataSources, CompanyCreationStatus.PendingScoreCalculations] };
  if (!includeHidden) filter['hidden.status'] = false;
  return CompanyModel.paginate(filter, options);
};

/**
 * this function should only be used internally. for anything client
 * facing, please use functions: getCompanies as it has pagination
 * included...this one does not.
 */
export const _getCompanies = (query: FilterQuery<ICompany> = {}, includeHidden = false) => {
  const _query = Object.entries(query).map(([key, value]) => ({ [key]: value }));
  _query.push({ 'hidden.status': includeHidden });
  _query.push({ 'creation.status': { $nin: [CompanyCreationStatus.PendingDataSources, CompanyCreationStatus.PendingScoreCalculations] } });
  _query.push({ 'sectors.sector': { $nin: sectorsToExclude } });

  return CompanyModel
    .find({ $and: _query })
    .populate([
      {
        path: 'merchant',
        model: MerchantModel,
      },
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

export const createBatchedCompanies = async (req: IRequest<{}, {}, IBatchedCompaniesRequestBody>) => {
  let jobReport: IJobReportDocument;

  try {
    jobReport = new JobReportModel({
      initiatedBy: req.requestor._id,
      name: JobNames.CreateBatchCompanies,
      status: JobReportStatus.Pending,
      data: [
        {
          status: JobReportStatus.Completed,
          message: `Batch file uploaded successfully. URL: ${req.body.fileUrl}`,
          createdAt: dayjs().utc().toDate(),
        },
      ],
      createdAt: dayjs().utc().toDate(),
    });

    await jobReport.save();
  } catch (err: any) {
    Logger.error(asCustomError(err));
    throw new CustomError(`An error occurred while attempting to create a job report: ${err.message}`, ErrorTypes.SERVER);
  }

  try {
    const data = {
      fileUrl: req.body.fileUrl,
      jobReportId: jobReport._id,
    };

    MainBullClient.createJob(JobNames.CreateBatchCompanies, data);

    return { message: `Your request to create this batch of companies is being processed, but it may take a while. Please check back later for status updates. (see Job Report: ${jobReport._id})` };
  } catch (err: any) {
    Logger.error(asCustomError(err));
    throw new CustomError(`An error occurred while attempting to create this job: ${err.message}`, ErrorTypes.SERVER);
  }
};

export const getCompaniesOwned = (_: IRequest, parentCompany: ICompanyDocument) => {
  if (!parentCompany) throw new CustomError('A parent company is required.', ErrorTypes.INVALID_ARG);

  return CompanyModel
    .find({ parentCompany, 'hidden.status': false })
    .populate([
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

export const getCompanyDataSources = async (companyId: ObjectId) => {
  const date = getUtcDate().toDate();

  const match = {
    company: companyId,
    'dateRange.start': { $lte: date },
    'dateRange.end': { $gte: date },
  };

  const pipeline = [
    {
      $match: match,
    },
    {
      $lookup: {
        from: 'data_sources',
        localField: 'source',
        foreignField: '_id',
        as: 'source',
      },
    },
    {
      $unwind: {
        path: '$source',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  const datasources = await CompanyDataSourceModel.aggregate(pipeline);
  const _datasources: IDataSourceDocument[] = [];
  const parents: ObjectId[] = [];
  // we need to return only the sources without parents or the parents (we don't want to return children with parents)
  for (const ds of datasources) {
    if (ds.source.hidden && !ds.source.parentSource) continue;
    if (ds.source.parentSource && !parents.find(p => ds.source.parentSource.toString() === p.toString())) {
      parents.push(ds.source.parentSource.toString());
      continue;
    }
    if (!ds.source.parentSource && !ds.source.hidden) _datasources.push(ds.source);
  }
  const _parents = await DataSourceModel.find({ _id: { $in: parents } });

  return [..._datasources, ..._parents];
};

export const getCompanyById = async (req: IRequest, _id: string, includeHidden = false) => {
  try {
    const query: FilterQuery<ICompany> = { _id, 'creation.status': { $nin: [CompanyCreationStatus.PendingDataSources, CompanyCreationStatus.PendingScoreCalculations] } };
    if (!includeHidden) query['hidden.status'] = false;

    const company = await CompanyModel.findOne(query)
      .populate([
        {
          path: 'merchant',
          model: MerchantModel,
        },
        {
          path: 'evaluatedUnsdgs.unsdg',
          model: UnsdgModel,
          populate: [{
            path: 'subCategory',
            model: UnsdgSubcategoryModel,
            populate: [{
              path: 'category',
              model: UnsdgCategoryModel,
            }],
          }],
        },
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
    const companiesOwned = await getCompaniesOwned(req, company);
    const companyDataSources = await getCompanyDataSources(company._id);

    return { company, unsdgs, companiesOwned, companyDataSources };
  } catch (err) {
    throw asCustomError(err);
  }
};

// exclude karma collective cashback offers by default (web), mobile app will need to pass thru `includeKarmaCollective=true`
export const getCompanies = async (request: ICompanySearchRequest, query: FilterQuery<ICompany>, includeHidden = false) => {
  const { filter } = query;
  let unsdgQuery = {};
  let searchQuery = {};
  let merchantQuery = {};
  let merchantLookup = {};
  let merchantUnwind = {};
  let merchantFilter = {};
  const unsdgs = filter?.evaluatedUnsdgs;
  const search = filter?.companyName;
  const cashbackOnly = !!filter?.merchant;
  const karmaCollectiveMember = !!filter?.karmaCollectiveMember;
  const includeKarmaCollective = !!filter?.includeKarmaCollective;

  if (unsdgs) {
    delete filter.evaluatedUnsdgs;
    const unsdgsArray = request.query.evaluatedUnsdgs.split(',').map(unsdg => new Types.ObjectId(unsdg));
    unsdgQuery = {
      evaluatedUnsdgs: {
        $elemMatch: {
          $and: [
            { unsdg: { $in: unsdgsArray } },
            { score: { $ne: null } },
            { score: { $gte: 0.5 } },
          ],
        },
      },
    };
  }

  if (cashbackOnly) {
    delete filter.merchant;

    merchantQuery = {
      merchant: { $ne: null },
    };

    merchantFilter = {
      $or: [
        { 'merchant.integrations.wildfire.domains.Merchant.MaxRate': { $ne: null } },
        { $and:
            [
              { 'merchant.integrations.kard': { $exists: true } },
              { 'merchant.integrations.kard.maxOffer.totalCommission': { $ne: 0 } },
            ],
        },
      ],
    };

    merchantLookup = {
      $lookup: {
        from: 'merchants',
        localField: 'merchant',
        foreignField: '_id',
        as: 'merchant',
      },
    };

    merchantUnwind = {
      $unwind: {
        path: '$merchant',
        preserveNullAndEmptyArrays: true,
      },
    };
  }

  if (search) {
    delete filter.companyName;
    searchQuery = { $text: { $search: String(search) } };
  }

  const cleanedFilter = convertFilterToObjectId(filter);
  const hiddenQuery = !includeHidden ? { 'hidden.status': false } : {};

  const options: any = {
    projection: query?.projection || '',
    page: query?.skip || 1,
    limit: query?.limit || 10,
    sort: query?.sort ? { ...query.sort, companyName: 1 } : { companyName: 1, _id: 1 },
  };

  let matchQuery: any = {
    ...hiddenQuery,
    ...unsdgQuery,
    ...searchQuery,
    ...merchantQuery,
  };

  if (cleanedFilter) matchQuery = { ...matchQuery, ...cleanedFilter };
  let aggregateSteps: any;

  if (cashbackOnly) {
    aggregateSteps = [
      {
        $match: matchQuery,
      },
      merchantLookup,
      merchantUnwind,
    ];

    aggregateSteps.push({ $match: merchantFilter });

    if (!!karmaCollectiveMember) {
      delete filter.karmaCollectiveMember;
      aggregateSteps.push({
        $match: {
          'merchant.karmaCollectiveMember': true,
        },
      });
    }

    if (!includeKarmaCollective) {
      delete filter.includeKarmaCollectiveMembers;
      aggregateSteps.push({
        $match: {
          'merchant.karmaCollectiveMember': { $ne: true },
        },
      });
    }
  } else {
    aggregateSteps = [
      {
        $match: matchQuery,
      },
    ];
  }

  if (cleanedFilter?.['values.value']) {
    const valuesQuery = cleanedFilter?.['values.value'];
    delete cleanedFilter['values.value'];
    delete matchQuery['values.value'];
    matchQuery = { ...matchQuery, ...cleanedFilter };
    aggregateSteps.shift();
    aggregateSteps.unshift({ $match: matchQuery });
    const companiesWithValues = await ValueCompanyMappingModel.aggregate([
      {
        $match: {
          value: valuesQuery,
        },
      },
      {
        $group: {
          _id: '$company',
          company: {
            $sum: 1,
          },
        },
      },
    ]);

    const companiesWithValuesIds = companiesWithValues.map(c => c._id);

    aggregateSteps.push({
      $match: {
        _id: {
          $in: companiesWithValuesIds,
        },
      },
    });
  }

  if (cleanedFilter?.['sectors.sector']) {
    delete cleanedFilter['sectors.sector'];
    delete matchQuery['sectors.sector'];
    matchQuery = { ...matchQuery, ...cleanedFilter };
    aggregateSteps.shift();
    aggregateSteps.unshift({ $match: matchQuery });
    const sectors = request.query['sectors.sector'].split(',');
    const sectorsArray = sectors.map(sector => new Types.ObjectId(sector));

    const addFieldsQuery: any = {
      $addFields: {},
    };

    const sectorsMatch = {
      $match: {
        'sectors.sector': {
          $in: sectorsArray,
        },
      },
    };

    aggregateSteps.push(sectorsMatch);

    for (const sector of sectors) {
      addFieldsQuery.$addFields[sector] = {
        $reduce: {
          input: '$sectors',
          initialValue: 0,
          in: {
            $cond: [
              {
                $eq: [
                  '$$this.sector', new Types.ObjectId(sector),
                ],
              }, 1, '$$value',
            ],
          },
        },
      };
      options.sort = { [sector]: -1, ...options.sort };
    }

    aggregateSteps.push(addFieldsQuery);
  }

  const companyAggregate = CompanyModel.aggregate(aggregateSteps);
  const companies = await CompanyModel.aggregatePaginate(companyAggregate, options);

  // avoiding $lookup in aggregate pipeline to avoid performance issues while joining parentCompany and merchant on results

  const parentCompanyIds = companies.docs.map(c => c.parentCompany);
  const parentCompanies = await CompanyModel.find({ _id: { $in: parentCompanyIds } });
  // assign parent companies to companies
  companies.docs.forEach(company => {
    const parentCompany = parentCompanies.find(c => c._id?.toString() === company.parentCompany?.toString());
    company.parentCompany = parentCompany;
  });

  const merchantIds = companies.docs.map(c => c.merchant);
  const merchants = await MerchantModel.find({ _id: { $in: merchantIds } });
  companies.docs.forEach(company => {
    const merchant = merchants.find(c => c._id?.toString() === company.merchant?.toString());
    if (!merchant) return;

    if (!!merchant?.integrations?.wildfire && !merchant?.integrations?.wildfire?.domains[0]?.Merchant?.MaxRate.Amount) {
      company.merchant = null;
    } else if (!!merchant?.integrations?.kard && !merchant?.integrations?.kard?.maxOffer?.totalCommission) {
      company.merchant = null;
    } else {
      company.merchant = merchant;
    }
  });

  return companies;
};

export const compare = async (__: IRequest, query: FilterQuery<ICompany>, includeHidden = false) => {
  let topPick: ICompanyDocument = null;
  let noClearPick = false;
  let topPickScore = -5;

  const _query: FilterQuery<ICompany> = {
    _id: { $in: query.companies },
  };
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
  const query: FilterQuery<ICompany> = {
    isPartner: true,
    'creation.status': { $nin: [CompanyCreationStatus.PendingDataSources, CompanyCreationStatus.PendingScoreCalculations] },
  };
  if (!includeHidden) query['hidden.status'] = false;
  return CompanyModel
    .find(query)
    .limit(companiesCount);
};

export const getSample = async (req: IRequest<{}, ICompanySampleRequest>) => {
  try {
    const { count = 10, sectors, excludedCompanyIds, ratings } = req.query;

    const _count = parseInt(`${count}`);
    if (isNaN(_count)) throw new CustomError('Invalid count. Must be a number', ErrorTypes.INVALID_ARG);
    if (count < 1 || count > MAX_SAMPLE_SIZE) throw new CustomError('Sample size. must be a number 0-25.', ErrorTypes.INVALID_ARG);

    let _sectors: string[] = [];

    if (!!sectors) {
      _sectors = (sectors || '').split(',');
      const invalidSectors = _sectors.filter(s => !isValidObjectId(s));
      if (!!invalidSectors.length) {
        throw new CustomError(`${invalidSectors.length > 1 ? 'Some of' : 'One of'} the sector ids found ${invalidSectors.length > 1 ? 'are' : 'is'} invalid.`, ErrorTypes.INVALID_ARG);
      }
    }

    let _excludedCompanyIds: string[] = [];

    if (excludedCompanyIds) {
      _excludedCompanyIds = (excludedCompanyIds || '').split(',');
      const invalidCompanyIds = _excludedCompanyIds.filter(c => !isValidObjectId(c));
      if (!!invalidCompanyIds.length) {
        throw new CustomError(`${invalidCompanyIds.length > 1 ? 'Some of' : 'One of'} the excluded company ids found ${invalidCompanyIds.length > 1 ? 'are' : 'is'} invalid.`, ErrorTypes.INVALID_ARG);
      }
    }

    let _ratings: string[] = [];

    if (!!ratings) {
      _ratings = (ratings || '').split(',');
      const invalidRatings = _ratings.filter(r => !Object.values(CompanyRating).find(cr => cr === r));
      if (!!invalidRatings.length) {
        throw new CustomError(`${invalidRatings.length > 1 ? 'Some of' : 'One of'} the ratings found ${invalidRatings.length > 1 ? 'are' : 'is'} invalid.`, ErrorTypes.INVALID_ARG);
      }
    }

    const query: FilterQuery<ICompany> = {
      $and: [
        { 'hidden.status': false },
        { 'creation.status': { $nin: [CompanyCreationStatus.PendingDataSources, CompanyCreationStatus.PendingScoreCalculations] } },
      ],
    };

    if (!!_sectors.length) query.$and.push({ 'sectors.sector': { $in: _sectors.map(s => new Types.ObjectId(s)) } });
    if (!!_excludedCompanyIds.length) query.$and.push({ _id: { $nin: _excludedCompanyIds.map(e => new Types.ObjectId(e)) } });
    if (!!_ratings.length) query.$and.push({ rating: { $in: _ratings } });

    const companies = await CompanyModel.find(query)
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

    if (companies.length < _count) throw new CustomError('There are not enough companies that meet the specified criteria to fill this sample size.', ErrorTypes.UNPROCESSABLE);

    const sample: ICompanyDocument[] = [];
    const uniqueIds = new Set<string>();

    while (sample.length < _count) {
      const randomCompany = companies[getRandomInt(0, (companies.length - 1))];
      if (uniqueIds.has(randomCompany._id.toString())) continue;
      uniqueIds.add(randomCompany._id.toString());
      sample.push(randomCompany);
    }

    return sample;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getShareableCompany = ({
  _id,
  combinedScore,
  categoryScores,
  subcategoryScores,
  companyName,
  dataYear,
  grade,
  hidden,
  isBrand,
  logo,
  parentCompany,
  rating,
  sectors,
  slug,
  url,
  createdAt,
  lastModified,
  merchant,
  evaluatedUnsdgs,
  partnerStatus,
}: ICompanyDocument): IShareableCompany => {
  // since these are refs, they could be id's or a populated
  // value. have to check if they are populated, and if so
  // need to get the sharable version of each resource.
  const _parentCompany: IRef<ObjectId, IShareableCompany> = (!!parentCompany && !!Object.keys(parentCompany).length)
    ? getShareableCompany(parentCompany as ICompanyDocument)
    : parentCompany as ObjectId;

  const _merchant: IRef<ObjectId, IShareableMerchant> = (!!merchant && !!Object.keys(merchant).length) ? getShareableMerchant(merchant as IMerchantDocument)
    : merchant as ObjectId;

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

  const _sectors = (!!sectors && !!sectors.filter(s => !!s.sector && !!Object.keys(s.sector).length).length)
    ? sectors.map(s => ({
      sector: getShareableSector(s.sector as ISectorModel),
      primary: s.primary,
    }))
    : sectors;

  // required since virtuals are not populated
  // from aggregates, so if has not been
  // populated, need to add manually.
  const _slug = slug ?? slugify(companyName);

  return {
    _id,
    combinedScore,
    categoryScores: _categoryScores,
    subcategoryScores: _subcategoryScores,
    companyName,
    dataYear,
    grade,
    hidden,
    isBrand,
    logo,
    parentCompany: _parentCompany,
    rating,
    sectors: _sectors,
    slug: _slug,
    url,
    createdAt,
    lastModified,
    merchant: _merchant,
    evaluatedUnsdgs,
    partnerStatus,
  };
};

export const getShareableCompanyUnsdg = ({
  unsdg,
  value,
}: ICompanyUnsdgDocument) => ({
  unsdg: getShareableUnsdg(unsdg as IUnsdgDocument),
  value,
});

export const getShareableDataSource = ({
  name, url, description, logoUrl,
}: IDataSourceDocument) => ({
  name,
  url,
  description,
  logoUrl,
});

export const initCompanyBatchJob = async (req: IRequest<{}, {}, IBatchedCompanyParentChildRelationshipsRequestBody>, jobName: JobNames) => {
  const { jobReportId } = req.body;
  let jobReport: IJobReportDocument;

  if (!!jobReportId) {
    jobReport = await JobReportModel.findById(jobReportId);
    if (!jobReport) throw new CustomError(`Job report with id: ${jobReportId} not found.`, ErrorTypes.INVALID_ARG);
  }

  try {
    jobReport = new JobReportModel({
      initiatedBy: req.requestor._id,
      name: jobName,
      status: JobReportStatus.Pending,
      prevJobReports: !!jobReport ? [jobReport] : [],
      data: [
        {
          status: JobReportStatus.Completed,
          message: `Batch file uploaded successfully. URL: ${req.body.fileUrl}`,
          createdAt: dayjs().utc().toDate(),
        },
      ],
      createdAt: dayjs().utc().toDate(),
    });

    await jobReport.save();
  } catch (err: any) {
    Logger.error(asCustomError(err));
    throw new CustomError(`An error occurred while attempting to create a job report: ${err.message}`, ErrorTypes.SERVER);
  }

  try {
    const data = {
      fileUrl: req.body.fileUrl,
      jobReportId: jobReport._id,
    };

    MainBullClient.createJob(jobName, data);

    return { message: `Your request is being processed, but it may take a while. Please check back later for status updates. (see Job Report: ${jobReport._id})` };
  } catch (err: any) {
    Logger.error(asCustomError(err));
    throw new CustomError(`An error occurred while attempting to create this job: ${err.message}`, ErrorTypes.SERVER);
  }
};

export const updateCompany = async (req: IRequest<ICompanyRequestParams, {}, IUpdateCompanyRequestBody>) => {
  try {
    const { companyId } = req.params;
    const { companyName, url, logo } = req.body;

    if (!companyId) throw new CustomError('A company id is required.', ErrorTypes.INVALID_ARG);
    if (!companyName && !url && !logo) throw new CustomError('No updatable company data found.', ErrorTypes.INVALID_ARG);

    const updatedData: Partial<ICompany> = {
      lastModified: dayjs().utc().toDate(),
    };

    // TODO: add name sterilization
    if (companyName) updatedData.companyName = companyName.trim();
    if (url) updatedData.url = url.trim();
    if (logo) updatedData.logo = logo.trim();

    // TODO: add change log for record keeping.

    const company = await CompanyModel.findOneAndUpdate({ _id: companyId }, updatedData, { new: true });

    if (!company) throw new CustomError(`Company with id: ${companyId} could not be found.`, ErrorTypes.NOT_FOUND);

    return company;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getCompanyScoreRange = async (_req: IRequest) => {
  const { positive, negative } = await getCompanyRatingsThresholds();
  return { min: negative.min, max: positive.max };
};

export const getMerchantRatesForCompany = async (req: IRequest<ICompanyRequestParams, {}, {}>) => {
  const { companyId } = req.params;
  if (!companyId) throw new CustomError('A company id is required.', ErrorTypes.INVALID_ARG);
  const companyResponse = await getCompanyById(req, companyId);
  const company = companyResponse?.company;
  if (!company) throw new CustomError(`Company with id: ${companyId} could not be found.`, ErrorTypes.NOT_FOUND);
  if (!company.merchant) throw new CustomError(`Company with id: ${companyId} does not have a merchant.`, ErrorTypes.NOT_FOUND);
  const merchantRates = await MerchantRateModel.find({ merchant: company.merchant });
  const shareableMerchantRates = [];

  for (const merchantRate of merchantRates) {
    const shareable = await getShareableMerchantRate(merchantRate);
    shareableMerchantRates.push(shareable);
  }

  return shareableMerchantRates;
};

const isWildfireApp = (app: IApp): boolean => (!!Object.values(WildfireApiIds).filter(v => v === app?.apiId).length);

// Takes mongoose paginated output and converts it to a response object
export const convertCompanyModelsToGetCompaniesResponse = async (
  companies: PaginateResult<PaginateDocument<ICompanyDocument, unknown, unknown>>,
  app: IApp,
): Promise<IGetCompaniesResponse> => {
  // get all company values for the requested companies
  const companyValues = await ValueCompanyMappingModel
    .find({ company: { $in: companies?.docs?.map(c => c._id) } })
    .populate([
      {
        path: 'value',
        model: ValueModel,
        populate: [
          {
            path: 'category',
            model: UnsdgCategoryModel,
          },
        ],
      },
    ]);

  const companiesProtocol: ICompanyProtocol[] = await Promise.all(companies?.docs?.map(async (company) => {
    if (!company || !company.companyName) return null;
    const c = company as any as IShareableCompany;
    const merchant = c.merchant as IShareableMerchant;
    const values = companyValues.filter((v: IValueCompanyMapping) => v.company.toString() === c?._id?.toString())
      .map((valueMapping: IValueCompanyMapping) => valueMapping.value as IValueDocument);

    const primarySector = company.sectors.find(s => s.primary)?.sector as any as ISectorDocument;
    delete primarySector?.averageScores?.numCompanies;

    return {
      companyName: company.companyName,
      values: values.map(v => (v as IValueDocument).name),
      rating: company.rating,
      score: company.combinedScore,
      karmaWalletUrl: `https://karmawallet.io/company/${company._id}/${company.slug}`,
      evaluatedUnsdgs: company.evaluatedUnsdgs?.filter((unsdg) => unsdg.evaluated).length || 0,
      companyUrl: company.url,
      subcategoryScores: company.subcategoryScores.map(subcategory => ({
        subcategory: (subcategory.subcategory as any).name as string,
        score: subcategory.score,
      })),
      categoryScores: company.categoryScores.map(category => ({
        category: (category.category as any).name as string,
        score: category.score,
      })),
      wildfireId: isWildfireApp(app) ? merchant?.integrations?.wildfire?.merchantId : undefined,
      sector: {
        name: primarySector?.name,
        scores: primarySector?.averageScores as ISectorAverageScores,
      },
    };
  }));

  return {
    companies: companiesProtocol.filter(c => !!c),
    pagination: {
      page: companies.page || 0,
      limit: companies.limit,
      totalPages: parseInt(companies.totalPages.toString(), 10) || 0,
      totalCompanies: companies.totalDocs,
    },
  };
};

export async function getCompaniesUsingClientSettings(req: IRequest<{}, IGetCompanyDataParams, {}>): Promise<IGetCompaniesResponse> {
  // validate input
  let page = parseInt(req.query.page, 10);
  page = !!req.query.page && !isNaN(parseInt(req.query.page, 10)) ? page : DefaultPaginationPage;
  if (page <= 0) throw new CustomError(`page: "${req.query.page}" must be greater than 0.`, ErrorTypes.INVALID_ARG);

  let limit = parseInt(req.query.limit, 10);
  limit = !!req.query.limit && !isNaN(limit) ? limit : DefaultPaginationLimit;
  if (limit <= 0 || limit > MaxPaginationLimit) throw new CustomError(`limit: "${req.query.limit}" must be greater than 0 and less than ${MaxPaginationLimit}.`, ErrorTypes.INVALID_ARG);

  // generate db pagination query
  const query = aqp(`skip=${page.toString()}&limit=${limit.toString()}`);

  try {
    const companies = await _getPaginatedCompanies(query);
    return convertCompanyModelsToGetCompaniesResponse(companies, req.apiRequestor);
  } catch (err) {
    throw new CustomError('Our servers encountered trouble processing this request. Please retry or reach out for help.', ErrorTypes.SERVER);
  }
}

export const getPartnersCount = async (_req: IRequest) => {
  const count = await CompanyModel.countDocuments({ 'partnerStatus.active': true });
  return { count };
};

export const getAllPartners = async (_req: IRequest) => {
  const partners = await CompanyModel.find({ 'partnerStatus.active': true }).populate([
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
  return partners;
};

export const getPartner = async (req: IRequest<{}, IGetPartnerQuery, {}>) => {
  const { companyId } = req.query;

  if (companyId) {
    const _validObjectId = Types.ObjectId.isValid(companyId);
    if (!_validObjectId) throw new CustomError('Invalid company id', ErrorTypes.INVALID_ARG);

    const partner = await CompanyModel.findOne({ _id: companyId, 'partnerStatus.active': true }).populate([
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
      {
        path: 'merchant',
        model: MerchantModel,
      },
    ]);
    if (!partner) throw new CustomError('Partner not found', ErrorTypes.NOT_FOUND);
    return partner;
  }
  const partners = await CompanyModel.aggregate([
    {
      $match: {
        'partnerStatus.active': true,
      },
    }, {
      $sample: {
        size: 1,
      },
    }, {
      $lookup: {
        from: 'merchants',
        localField: 'merchant',
        foreignField: '_id',
        as: 'merchant',
      },
    }, {
      $unwind: {
        path: '$merchant',
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);

  if (!partners.length) throw new CustomError('No partners found', ErrorTypes.NOT_FOUND);
  const partner: ICompanyDocument = partners[0];
  // TODO: This is a hack to get the populated fields to show up in the response. Find a better way to do this.

  const _sectors = await SectorModel.find({ _id: { $in: partner.sectors.map((s: any) => s.sector) } });
  _sectors.forEach((s: any) => {
    const sector = (partner).sectors.find((p: any) => p.sector.toString() === s._id.toString());
    sector.sector = getShareableSector(s);
  });

  const _unsdgCategories = await UnsdgCategoryModel.find({ _id: { $in: partner.categoryScores.map((c: any) => c.category) } });
  _unsdgCategories.forEach((c: any) => {
    const category = (partner).categoryScores.find((p: any) => p.category.toString() === c._id.toString());
    category.category = c;
  });

  const _unsdgSubcategories = await UnsdgSubcategoryModel.find({ _id: { $in: partner.subcategoryScores.map((s: any) => s.subcategory) } });
  _unsdgSubcategories.forEach((s: any) => {
    const subcategory = (partner).subcategoryScores.find((p: any) => p.subcategory.toString() === s._id.toString());
    subcategory.subcategory = s;
  });

  return partner;
};

export const getFeaturedCashbackCompanies = async (req: IGetFeaturedCashbackCompaniesRequest, query: FilterQuery<ICompany>) => {
  const { location } = req.query;
  let sectorQuery = {};
  let companiesQuery = {};

  if (!!location?.length) {
    const locationArray = location.split(',');
    companiesQuery = {
      'featuredCashback.location': {
        $in: locationArray,
      },
      'featuredCashback.status': {
        $eq: true,
      },
    };
  }

  if (!!req.query['sectors.sector']) {
    sectorQuery = {
      'sectors.sector': {
        $in: req.query['sectors.sector'].split(','),
      },
    };
  }

  const excludeNegativeCompanies = {
    rating: {
      $ne: CompanyRating.Negative,
    },
  };

  const merchantQuery: any = {
    merchant: { $ne: null },
  };

  const merchantFilter: any = {
    $or: [
      { 'merchant.integrations.wildfire.domains.Merchant.MaxRate': { $ne: null } },
      { $and:
          [
            { 'merchant.integrations.kard': { $exists: true } },
            { 'merchant.integrations.kard.maxOffer.totalCommission': { $ne: 0 } },
          ],
      },
    ],
  };

  const merchantLookup = {
    $lookup: {
      from: 'merchants',
      localField: 'merchant',
      foreignField: '_id',
      as: 'merchant',
    },
  };

  const merchantUnwind = {
    $unwind: {
      path: '$merchant',
      preserveNullAndEmptyArrays: true,
    },
  };

  const aggregateSteps: any = [
    {
      $match: {
        ...companiesQuery,
        ...sectorQuery,
        ...merchantQuery,
        ...excludeNegativeCompanies,
      },
    },
    merchantLookup,
    merchantUnwind,
    {
      $match: merchantFilter,
    },
  ];

  const options: any = {
    projection: query?.projection || '',
    page: query?.skip || 1,
    limit: query?.limit || 10,
    sort: query?.sort ? { ...query.sort, companyName: 1 } : { companyName: 1, _id: 1 },
  };

  const companyAggregate = CompanyModel.aggregate(aggregateSteps);
  const companies = await CompanyModel.aggregatePaginate(companyAggregate, options);

  return companies;
};

export const updateCompaniesFeaturedCashbackStatus = async (companiesToUpdate: IFeaturedCashbackUpdatesParams[]) => {
  for (const companyToUpdate of companiesToUpdate) {
    const { companyId, status } = companyToUpdate;
    const company = await CompanyModel.findById(companyId);
    const data = {
      status,
      location: companyToUpdate.location,
    };
    if (!company) continue;
    company.featuredCashback = data;
    await company.save();
  }
};
