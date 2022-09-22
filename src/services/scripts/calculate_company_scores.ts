import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { getCompanyRatingFromScore } from '../../lib/company';
import { CompanyModel, ICategoryScore, ICompanyDocument, ISubcategoryScore } from '../../models/company';
import { CompanyDataSourceModel, ICompanyDataSourceModel } from '../../models/companyDataSource';
import { CompanyUnsdgModel, ICompanyUnsdgDocument } from '../../models/companyUnsdg';
import { DataSourceMappingModel, IDataSourceMappingModel } from '../../models/dataSourceMapping';
import { IUnsdgDocument, UnsdgModel } from '../../models/unsdg';
import { IUnsdgCategoryDocument, UnsdgCategoryModel } from '../../models/unsdgCategory';
import { IUnsdgSubcategoryDocument, UnsdgSubcategoryModel } from '../../models/unsdgSubcategory';

dayjs.extend(utc);

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

export const calculateAllCompanyScores = async () => {
  console.log('calculating scores for all companies...');

  let companies: ICompanyDocument[];
  let categories: IUnsdgCategoryDocument[];
  let subcategories: IUnsdgSubcategoryDocument[];

  try {
    companies = await CompanyModel.find({}).sort({ createdAt: 1 });
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
  let companyIndex = 1;

  for (const company of companies) {
    const childCompanyDataSources: ICompanyDataSourceModel[] = [];
    let parentCompanyDataSources: ICompanyDataSourceModel[] = [];
    let companyDataSources: ICompanyDataSourceModel[] = [];
    let unsdgMappings: IDataSourceMappingModel[] = [];

    try {
      console.log(`[+] calculating scores for company ${company.companyName} (${companyIndex}/${companies.length})`);
      companyIndex += 1;
      console.log(`[+] currently ${count} companies have been calculated with ${errorCount} errors`);
      const now = dayjs().utc().toDate();
      companyDataSources = await CompanyDataSourceModel.find({
        $and: [
          { company: company._id },
          { 'dateRange.start': { $lte: now } },
          { 'dateRange.end': { $gte: now } },
        ],
      });

      if (company.parentCompany) {
        parentCompanyDataSources = await CompanyDataSourceModel.find({
          $and: [
            { company: company.parentCompany },
            { 'dateRange.start': { $lte: now } },
            { 'dateRange.end': { $gte: now } },
          ],
        });
      }

      // Saving children dictionary for faster lookup
      const childCompanyDataSourceDictionary = childCompanyDataSources.reduce((acc, curr) => {
        const key = curr.source.toString();
        acc[key] = true;
        return acc;
      }, {} as { [key: string]: boolean });

      parentCompanyDataSources = parentCompanyDataSources.filter((ps) => !childCompanyDataSourceDictionary[ps.source.toString()]);

      companyDataSources = [...companyDataSources, ...parentCompanyDataSources];

      console.log(`[+] ${company.companyName} has ${companyDataSources.length} data sources`);

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

    try {
      console.log(`[+] saving company: ${company._id}: ${company.companyName} (combined score: ${combinedScore})`);
      await CompanyModel.updateOne({ _id: company._id }, { combinedScore, rating, subcategoryScores, categoryScores });
      await Promise.all(promises);
      count += 1;
    } catch (err) {
      console.log('[-] error updating score for company: ', company._id);
    }
  }

  console.log(`${errorCount} errors thrown`);
  console.log(`${count} company scores updated`);
};
