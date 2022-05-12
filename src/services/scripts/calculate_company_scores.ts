import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { CompanyDataSourceModel, ICompanyDataSourceModel } from '../../models/companyDataSource';
import { CompanyUnsdgModel, ICompanyUnsdgDocument } from '../../models/companyUnsdg';
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

    // const allScores: number[][] = [];
    const promises: Promise<any>[] = [];

    const companyUnsdgs: { [key: string]: ICompanyUnsdgDocument } = {};

    for (const companyDataSource of companyDataSources) {
      const unsdgMapping = unsdgMappings.find(u => u.source.toString() === companyDataSource.source.toString());

      if (!unsdgMapping) {
        console.log(`[-] failed to find unsdg mapping for companyDataSource: ${companyDataSource._id}`);
        continue;
      }

      for (let i = 0; i < unsdgMapping.unsdgs.length; i++) {
        const { goalNum, title } = unsdgMapping.unsdgs[i].unsdg as IUnsdgDocument;
        if (goalNum === 17) continue;

        const { value } = unsdgMapping.unsdgs[i];
        let unsdgScore: number;

        if (!companyUnsdgs[title]) {
          companyUnsdgs[title] = new CompanyUnsdgModel({
            company,
            unsdg: unsdgMapping.unsdgs[i].unsdg,
            value: 0,
            createdAt: dayjs().utc().toDate(),
          });
        }

        // while (allScores.length < goalNum) {
        //   allScores.push([]);
        // }

        if (value === null) {
          unsdgScore = 0;
        } else if (value === 0) {
          unsdgScore = -1;
        } else {
          unsdgScore = companyDataSource.status === -1 ? -1 : value;
        }

        // allScores[goalNum - 1].push(unsdgScore);

        // const companyUnsdg = new CompanyUnsdgModel({
        //   company,
        //   unsdg: unsdgMapping.unsdgs[i].unsdg,
        //   value: unsdgScore,
        //   createdAt: dayjs().utc().toDate(),
        // });

        companyUnsdgs[title].allValues.push({
          value: unsdgScore,
          dataSource: unsdgMapping.source,
        });

        // promises.push(companyUnsdg.save());
      }
    }

    const unsdgScores: number[] = [];

    Object.values(companyUnsdgs).forEach(companyUnsdg => {
      const score = calculateUnsdgScore(companyUnsdg.allValues.map(a => a.value));
      unsdgScores.push(score);
      companyUnsdg.value = score;
      promises.push(companyUnsdg.save());
    });

    const combinedScore = unsdgScores.reduce((acc, curr) => acc + curr, 0);

    try {
      await CompanyModel.updateOne({ _id: company._id }, { combinedScore });
      await Promise.all(promises);
      count += 1;
    } catch (err) {
      console.log('[-] error updating score for company: ', company._id);
    }
  }

  console.log(`${errorCount} errors thrown`);
  console.log(`${count} company scores updated`);
};
