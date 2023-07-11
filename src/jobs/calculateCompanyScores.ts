import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { FilterQuery } from 'mongoose';
import { getCompanyRatingFromScore } from '../lib/company';
import { CompanyRating } from '../lib/constants/company';
import { CompanyModel, ICategoryScore, ICompany, ICompanyDocument, ISubcategoryScore } from '../models/company';
import { CompanyDataSourceModel, ICompanyDataSourceModel } from '../models/companyDataSource';
import { CompanyUnsdgModel, ICompanyUnsdgDocument } from '../models/companyUnsdg';
import { DataSourceMappingModel, IDataSourceMappingModel } from '../models/dataSourceMapping';
import { JobReportStatus } from '../models/jobReport';
import { IUnsdgDocument, UnsdgModel } from '../models/unsdg';
import { IUnsdgCategoryDocument, UnsdgCategoryModel } from '../models/unsdgCategory';
import { IUnsdgSubcategoryDocument, UnsdgSubcategoryModel } from '../models/unsdgSubcategory';
import { updateJobReport } from '../services/jobReport/utils';

dayjs.extend(utc);

interface ICalculateCompanyScoresData {
  jobReportId?: string;
  companyIds?: string[];
}

interface IUpdatableCompanyData {
  combinedScore: number;
  rating: CompanyRating;
  subcategoryScores: ISubcategoryScore[];
  categoryScores: ICategoryScore[];
}

const UNSDG_MAX_SCORE = 1;
const UNSDG_MIN_SCORE = -1;

const ensureUndsgScoreMaxAndMin = (unsdgScore: number, max = UNSDG_MAX_SCORE) => {
  if (unsdgScore > max) return max;
  if (unsdgScore < UNSDG_MIN_SCORE) return UNSDG_MIN_SCORE;
  return unsdgScore;
};

export const calculateUnsdgScore = (unsdgPoints: number[]) => {
  const numberOfValues: number = unsdgPoints.length;

  if (numberOfValues === 1) return unsdgPoints[0];

  const unsdgPointsSum = unsdgPoints.reduce((a, b) => a + b, 0);

  const includesOne = unsdgPoints.includes(1);

  if (includesOne) return ensureUndsgScoreMaxAndMin(unsdgPointsSum);

  if (!includesOne) return ensureUndsgScoreMaxAndMin(unsdgPointsSum, 0.5);
};

export const calculateCompanyScore = (score: number) => ((score + 16) / 32) * 100;

export const exec = async ({ jobReportId, companyIds = [] }: ICalculateCompanyScoresData) => {
  console.log('calculating scores for all companies...');

  let companies: ICompanyDocument[];
  let categories: IUnsdgCategoryDocument[];
  let subcategories: IUnsdgSubcategoryDocument[];

  try {
    const companyQuery: FilterQuery<ICompany> = {};

    if (companyIds?.length) {
      companyQuery._id = { $in: companyIds };
    }

    companies = await CompanyModel.find();
    categories = await UnsdgCategoryModel.find({});
    subcategories = await UnsdgSubcategoryModel.find({})
      .populate([{
        path: 'category',
        model: UnsdgCategoryModel,
      }]);
  } catch (err) {
    console.log('[-] err retrieving companies, categories, and/or subcategories');
    console.log(err);
  }

  if (!companies) return;

  let count = 0;
  let errorCount = 0;

  for (const company of companies) {
    let companyDataSources: ICompanyDataSourceModel[];
    let unsdgMappings: IDataSourceMappingModel[];

    try {
      const now = dayjs().utc().toDate();
      companyDataSources = await CompanyDataSourceModel.find({
        $and: [
          { company: company._id },
          { 'dateRange.start': { $lte: now } },
          { 'dateRange.end': { $gte: now } },
        ],
      });

      unsdgMappings = await DataSourceMappingModel
        .find({ source: { $in: companyDataSources.map(c => c.source) } })
        .populate([
          {
            path: 'unsdgs.unsdg',
            model: UnsdgModel,
          },
        ]);
    } catch (err) {
      errorCount += 1;
      console.log(`[-] error retrieving company data sources and unsdg mappings for company: ${company._id}`);
      continue;
    }

    if (!companyDataSources || !unsdgMappings) continue;

    const promises: Promise<any>[] = [];

    const companyUnsdgs: { [key: string]: ICompanyUnsdgDocument } = {};

    for (const companyDataSource of companyDataSources) {
      const unsdgMapping = unsdgMappings.find(u => u.source.toString() === companyDataSource.source.toString());
      const existingCompanyUnsdgs = await CompanyUnsdgModel
        .find({ company })
        .populate([
          {
            path: 'unsdg',
            model: UnsdgModel,
          },
        ]);

      if (!unsdgMapping) {
        console.log(`[-] failed to find unsdg mapping for companyDataSource: ${companyDataSource._id}`);
        continue;
      }

      for (let i = 0; i < unsdgMapping.unsdgs.length; i++) {
        const { goalNum, title, _id } = unsdgMapping.unsdgs[i].unsdg as IUnsdgDocument;
        if (goalNum === 17) continue;

        const { value } = unsdgMapping.unsdgs[i];
        let unsdgScore: number;

        let overwritePrevCompanyUnsdg = false;
        if (companyUnsdgs[title]) {
          overwritePrevCompanyUnsdg = true;
        } else {
          const existingCompanyUnsdg = existingCompanyUnsdgs.find(u => u.unsdg.toString() === _id.toString());
          companyUnsdgs[title] = existingCompanyUnsdg || new CompanyUnsdgModel({
            company,
            unsdg: unsdgMapping.unsdgs[i].unsdg,
            value: 0,
            createdAt: dayjs().utc().toDate(),
          });
        }

        if (value === null) {
          unsdgScore = 0;
        } else if (value === 0) {
          unsdgScore = -1;
        } else {
          unsdgScore = companyDataSource.status === -1 ? -1 : value;
        }

        let existingAllValue = companyUnsdgs[title].allValues.find(v => v.dataSource.toString() === unsdgMapping.source.toString());

        if (overwritePrevCompanyUnsdg && !!existingAllValue) {
          existingAllValue = {
            value: unsdgScore,
            dataSource: unsdgMapping.source,
          };
        } else {
          companyUnsdgs[title].allValues.push({
            value: unsdgScore,
            dataSource: unsdgMapping.source,
          });
        }
      }
    }

    // TODO: calculate category scores and subcategory scores

    const unsdgScores: number[] = [];
    const allCategoryScores: { [key: string]: number[] } = {};
    const allSubcategoryScores: { [key: string]: number[] } = {};

    for (const companyUnsdg of Object.values(companyUnsdgs)) {
      const score = calculateUnsdgScore(companyUnsdg.allValues.map(a => a.value));
      unsdgScores.push(score);
      companyUnsdg.value = score;

      const unsdgSubcategory = subcategories.find(s => s._id.toString() === (companyUnsdg.unsdg as IUnsdgDocument).subCategory.toString());
      const unsdgCategory = categories.find(c => c._id.toString() === (unsdgSubcategory.category as IUnsdgCategoryDocument)._id.toString());

      if (!allSubcategoryScores[unsdgSubcategory._id.toString()]) {
        allSubcategoryScores[unsdgSubcategory._id.toString()] = [];
      }

      if (!allCategoryScores[unsdgCategory._id.toString()]) {
        allCategoryScores[unsdgCategory._id.toString()] = [];
      }

      allSubcategoryScores[unsdgSubcategory._id.toString()].push(score);
      allCategoryScores[unsdgCategory._id.toString()].push(score);

      promises.push(companyUnsdg.save());
    }

    const combinedScore = unsdgScores.reduce((acc, curr) => acc + curr, 0);
    const rating = await getCompanyRatingFromScore(combinedScore);

    const subcategoryScores: ISubcategoryScore[] = Object.entries(allSubcategoryScores).map(([key, scores]) => ({
      subcategory: subcategories.find(s => s._id.toString() === key),
      score: scores.reduce((acc, curr) => acc + curr, 0),
    }));
    const categoryScores: ICategoryScore[] = Object.entries(allCategoryScores).map(([key, scores]) => ({
      category: categories.find(c => c._id.toString() === key),
      score: scores.reduce((acc, curr) => acc + curr, 0),
    }));

    const updatedData: IUpdatableCompanyData = { combinedScore, rating, subcategoryScores, categoryScores };

    try {
      await CompanyModel.updateOne({ _id: company._id }, updatedData);
      await Promise.all(promises);
      count += 1;
    } catch (err) {
      console.log('[-] error updating score for company: ', company._id);
    }
  }

  if (!!jobReportId) {
    let finalMessage: string;
    let finalStatus: JobReportStatus;

    if (errorCount > 0) {
      if (count > 0) {
        finalMessage = `${count} company scores calculated, but ${errorCount} errors occurred`;
        finalStatus = JobReportStatus.CompletedWithErrors;
      } else {
        finalMessage = `${errorCount} errors occurred`;
        finalStatus = JobReportStatus.Failed;
      }
    } else {
      if (count > 0) {
        finalMessage = `${count} company scores calculated`;
        finalStatus = JobReportStatus.Completed;
      } else {
        finalMessage = 'Something strange happened...';
        finalStatus = JobReportStatus.Unknown;
      }
    }

    await updateJobReport(jobReportId, null, { message: finalMessage, status: finalStatus });
  }

  console.log(`[-] ${errorCount} errors occurred`);
  console.log(`[+] ${count} company scores calculated`);
};
