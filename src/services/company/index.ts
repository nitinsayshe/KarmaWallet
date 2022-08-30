import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { FilterQuery, isValidObjectId, ObjectId, Types } from 'mongoose';
import { ErrorTypes, sectorsToExclude } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { getRandomInt } from '../../lib/number';
import { slugify } from '../../lib/slugify';
import {
  CompanyCreationStatus,
  CompanyModel,
  ICompany,
  ICompanyDocument,
  IShareableCompany,
} from '../../models/company';
import { CompanyUnsdgModel, ICompanyUnsdg, ICompanyUnsdgDocument } from '../../models/companyUnsdg';
import { ISectorModel, SectorModel } from '../../models/sector';
import { IUnsdgDocument, UnsdgModel } from '../../models/unsdg';
import { IUnsdgCategoryDocument, UnsdgCategoryModel } from '../../models/unsdgCategory';
import { IUnsdgSubcategoryDocument, UnsdgSubcategoryModel } from '../../models/unsdgSubcategory';
import { IRef } from '../../types/model';
import { IRequest } from '../../types/request';
import { getCompanyRatingsThresholds } from '../misc';
import { getShareableSector } from '../sectors';
import { getShareableCategory, getShareableSubCategory, getShareableUnsdg } from '../unsdgs';
import { CompanyRatings } from './utils';
import { Logger } from '../logger';
import { IJobReportDocument, JobReportModel, JobReportStatus } from '../../models/jobReport';
import { JobNames } from '../../lib/constants/jobScheduler';
import { MainBullClient } from '../../clients/bull/main';
import { IMerchantDocument, IShareableMerchant, MerchantModel } from '../../models/merchant';
import { getShareableMerchant } from '../merchant';
import { MerchantRateModel } from '../../models/merchantRate';

dayjs.extend(utc);

const MAX_SAMPLE_SIZE = 25;

export interface ICompanyRequestParams {
  companyId: string;
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

    return { company, unsdgs, companiesOwned };
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getCompanies = (__: IRequest, query: FilterQuery<ICompany>, includeHidden = false) => {
  const options = {
    projection: query?.projection || '',
    populate: query.population || [
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

export const compare = async (__: IRequest, query: FilterQuery<ICompany>, includeHidden = false) => {
  let topPick: ICompanyDocument = null;
  let noClearPick = false;
  let topPickScore = -5;

  const _query: FilterQuery<ICompany> = {
    _id: { $in: query.companies },
    'creation.status': { $nin: [CompanyCreationStatus.PendingDataSources, CompanyCreationStatus.PendingScoreCalculations] },
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
      const invalidRatings = _ratings.filter(r => !Object.values(CompanyRatings).find(cr => cr === r));
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
  };
};

export const getShareableCompanyUnsdg = ({
  unsdg,
  value,
}: ICompanyUnsdgDocument) => ({
  unsdg: getShareableUnsdg(unsdg as IUnsdgDocument),
  value,
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
  return merchantRates;
};
