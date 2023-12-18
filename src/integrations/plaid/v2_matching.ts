/* eslint-disable no-restricted-syntax */
import fs from 'fs';
import Fuse from 'fuse.js';
import { parse, transforms } from 'json2csv';
import { Schema } from 'mongoose';
import path from 'path';
import { PlaidCompanyMatchType } from '../../lib/constants/plaid';
import { CompanyModel, ICompany } from '../../models/company';
import { PlaidCategoriesToSectorMappingModel } from '../../models/plaidCategoriesToKarmaSectorMapping';
import { ISector } from '../../models/sector';
import {
  IV2TransactionMatchedCompanyName,
  V2TransactionMatchedCompanyNameModel,
} from '../../models/v2_transaction_matchedCompanyName';
import { IRef } from '../../types/model';
import { ICompanyMatchingResult, IMatchedTransaction } from './types';
import { CombinedPartialTransaction } from '../../types/transaction';

interface ICompanyWithCleanedName extends ICompany {
  companyCleanedName: string;
  _id: Schema.Types.ObjectId;
}

type FuseCleanedCompanyNameResult = Fuse.FuseResult<ICompanyWithCleanedName>[];
const stringReplacements = [
  ' W/D',
  ' INC',
  ' INCORPORATED',
  ' CORPORATION',
  ' CORP',
  ' COMPANIES',
  ' COMPANY',
  ' CO',
  ' LLC',
  ' LIMITED',
  ' LTD',
  ' HOLDINGS',
  ' HOLDING',
  ' PLC',
  ' PBC',
  ' LP',
  ' GROUP',
  '.COM',
  '.ORG',
  '.NET',
  '#',
  'GIFTCARD',
  ',',
  '-',
  "'",
];

const regexReplacements = [/[0-9]+/gi, /\.$/, /-$/, /,$/];

const THRESHOLD = 0.000000101;

interface IMatchTransactionsToCompaniesParams {
  transactions: CombinedPartialTransaction[];
  cleanedCompanies: ICompanyWithCleanedName[];
  writeToDisk?: boolean;
  saveMatches?: boolean;
}

export const getCleanCompanies = async () => {
  const companies = await CompanyModel.find({ 'hidden.status': false }).select('companyName');

  const companiesCleaned: ICompanyWithCleanedName[] = companies.map((company: ICompany) => {
    // TODO: fix these to adjust company names from QA
    // https://docs.google.com/spreadsheets/d/1llrGNNRHOUpkieyGW-HpV0mRSbouTBKQwsu-7mH_3uw/edit?usp=sharing
    let companyCleanedName = company.companyName;
    for (const replacement of stringReplacements) {
      companyCleanedName = companyCleanedName.replace(new RegExp(replacement, 'gi'), '');
    }
    for (const replacement of regexReplacements) companyCleanedName = companyCleanedName.replace(replacement, '');
    const companyCleaned = {
      ...company,
      companyCleanedName: companyCleanedName.trim().toLowerCase(),
      _id: company._id,
    };
    return companyCleaned;
  });
  return companiesCleaned;
};

export const getCompanyPrimarySectorDictionary = async () => {
  const companyPrimarySectors = await CompanyModel.aggregate([
    {
      $project: {
        sectors: 1,
      },
    },
    {
      $unwind: {
        path: '$sectors',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        'sectors.primary': true,
      },
    },
    {
      $addFields: {
        sector: '$sectors.sector',
      },
    },
    {
      $project: {
        sector: 1,
      },
    },
  ]);
  const dictionary = companyPrimarySectors.reduce((acc, company) => {
    acc[company._id] = company.sector;
    return acc;
  }, {});
  return dictionary;
};

export const getPlaidCategoryMappingDictionary = async () => {
  const mappings = await PlaidCategoriesToSectorMappingModel.find({}).select('plaidCategoriesId sector').lean();
  const dictionary = mappings.reduce((acc: { [key: string]: IRef<Schema.Types.ObjectId, ISector> }, mapping) => {
    acc[mapping.plaidCategoriesId] = mapping.sector;
    return acc;
  }, {});
  return dictionary;
};

// TEXT MATCHING ALGORITHM
export const getMatchResults = async ({
  transactions,
  cleanedCompanies,
  saveMatches = false,
  writeToDisk = false,
}: IMatchTransactionsToCompaniesParams) => {
  const logId = '[mtch] - ';
  const log = (message: string) => console.log(`${logId}${message}`);
  const timeString = `${logId}matchTransactionsToCompanies for ${transactions.length} transactions`;
  console.time(timeString);
  const results: ICompanyMatchingResult[] = [];

  for (const transaction of transactions) {
    let { name } = transaction;
    let merchantName = transaction?.merchant_name;
    const originalName = name;
    const originalMerchantName = merchantName;

    // BEGIN Name/MerchantName cleanup
    for (const stringValue of stringReplacements) {
      name = name.replace(new RegExp(stringValue, 'gi'), '');
      if (merchantName) merchantName = merchantName.replace(new RegExp(stringValue, 'gi'), '');
    }

    for (const regexValue of regexReplacements) {
      name = name.replace(regexValue, '');
      if (merchantName) merchantName = merchantName.replace(regexValue, '');
    }

    name = name.trim().toLowerCase();

    if (merchantName) merchantName = merchantName.trim().toLowerCase();
    // END Name/MerchantName cleanup

    // BEGIN SEARCH ALL COMPANIES FOR MATCHES
    const fuseOptions = {
      findAllMatches: false,
      includeScore: true,
      threshold: THRESHOLD,
      keys: ['companyCleanedName'],
    };
    const fuse = new Fuse(cleanedCompanies, fuseOptions);
    const nameResult: FuseCleanedCompanyNameResult = fuse.search(name);
    let merchantNameResult: FuseCleanedCompanyNameResult = [];
    if (merchantName) merchantNameResult = fuse.search(merchantName);
    // END SEARCH ALL COMPANIES FOR MATCHES

    const hasMerchantResults = merchantNameResult.length > 0;
    const hasNameResults = nameResult.length > 0;

    const firstMerchantResult = hasMerchantResults ? merchantNameResult[0] : null;
    const firstNameResult = nameResult.length > 0 ? nameResult[0] : null;

    const hasMerchantMatch = hasMerchantResults && firstMerchantResult?.score < THRESHOLD;
    const hasNameMatch = hasNameResults && firstNameResult?.score < THRESHOLD;

    const result: ICompanyMatchingResult = {
      matchType: null,
      value: null,
      originalValue: null,
      company: null,
    };

    if (hasNameMatch) {
      const { item } = firstNameResult;
      result.matchType = PlaidCompanyMatchType.Name;
      result.value = name;
      result.originalValue = originalName;
      result.company = item._id;
    }

    // merchant match meets threshold
    if (!hasNameMatch && hasMerchantMatch) {
      const { item } = firstMerchantResult;
      result.matchType = PlaidCompanyMatchType.MerchantName;
      result.value = merchantName;
      result.originalValue = originalMerchantName;
      result.company = item._id;
    }

    if (result.matchType) results.push(result);
  }

  if (writeToDisk) {
    const _csv = parse(results, { transforms: [transforms.flatten({ objects: true, arrays: true })] });
    fs.writeFileSync(path.join(__dirname, '.tmp', 'text-match-test.csv'), _csv);
  }
  if (saveMatches) {
    log(`saving ${results.length} matches to DB`);
    for (const result of results) {
      if (!result.company) {
        console.log('no company found for result', result);
        continue;
      }
      await V2TransactionMatchedCompanyNameModel.findOneAndUpdate(result, result, { upsert: true });
    }
  }
  console.timeEnd(timeString);

  return results;
};

export const matchTransactionsToCompanies = (
  transactions: CombinedPartialTransaction[],
  results: ICompanyMatchingResult[] | IV2TransactionMatchedCompanyName[],
) => {
  const matchedTransactions: IMatchedTransaction[] = [];
  const nonMatchedTransactions: CombinedPartialTransaction[] = [];
  transactions.forEach((transaction) => {
    const alreadyMatchedCompany = results.find((amc) => amc.originalValue === transaction[amc.matchType]);
    if (alreadyMatchedCompany) {
      matchedTransactions.push({
        ...transaction,
        company: alreadyMatchedCompany.company,
      });
      return;
    }
    nonMatchedTransactions.push(transaction);
  }, []);
  return [matchedTransactions, nonMatchedTransactions];
};
