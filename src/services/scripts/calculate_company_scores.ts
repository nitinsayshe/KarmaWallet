import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { CompanyDataSourceModel, ICompanyDataSourceModel } from '../../models/companyDataSource';
import { DataSourceMappingModel, IDataSourceMappingModel } from '../../models/dataSourceMapping';
import { IUnsdgDocument, UnsdgModel } from '../../models/unsdg';

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

export const calulcateCompanyScore = (score: number) => (score + 16) / 32;

export const calculateAllCompanyScores = async () => {
  console.log('calculating scores for all companies...');

  let companies: ICompanyDocument[];

  try {
    companies = await CompanyModel.find({});
  } catch (err) {
    console.log('[-] err retrieving companies');
    console.log(err);
  }

  if (!companies) return;

  let count = 0;
  let errorCount = 0;

  for (const company of companies) {
    let companyDataSources: ICompanyDataSourceModel[];
    let unsdgMappings: IDataSourceMappingModel[];

    try {
      companyDataSources = await CompanyDataSourceModel.find({ company });
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

    const allScores: number[][] = [];

    for (const companyDataSource of companyDataSources) {
      const unsdgMapping = unsdgMappings.find(u => u.source.toString() === companyDataSource.source.toString());

      if (!unsdgMapping) {
        console.log(`[-] failed to find unsdg mapping for companyDataSource: ${companyDataSource._id}`);
        continue;
      }

      for (let i = 0; i < unsdgMapping.unsdgs.length; i++) {
        const { goalNum } = unsdgMapping.unsdgs[i].unsdg as IUnsdgDocument;
        const { value } = unsdgMapping.unsdgs[i];

        while (allScores.length < goalNum) {
          allScores.push([]);
        }

        if (value === null) {
          allScores[goalNum - 1].push(0);
        } else if (value === 0) {
          allScores[goalNum - 1].push(-1);
        } else {
          allScores[goalNum - 1].push(value);
        }
      }
    }

    const unsdgScores = allScores.map(scores => calculateUnsdgScore(scores));
    const combinedScore = unsdgScores.reduce((acc, curr) => acc + curr, 0);

    try {
      await CompanyModel.updateOne({ _id: company._id }, { combinedScore });
      count += 1;
    } catch (err) {
      console.log('[-] error updating score for company: ', company._id);
    }
  }

  console.log(`${errorCount} errors thrown`);
  console.log(`${count} company scores updated`);
};
