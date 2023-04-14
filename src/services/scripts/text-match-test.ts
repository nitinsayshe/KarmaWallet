/* eslint-disable no-restricted-syntax */
import Fuse from 'fuse.js';
import { parse, transforms } from 'json2csv';
import fs from 'fs';
import path from 'path';
import { Transaction } from 'plaid';
import { CompanyModel, ICompany } from '../../models/company';

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

const THRESHOLD = 0.02;

enum MatchType {
  MerchantName = 'merchantName',
  Name = 'name',
}

interface IMatch {
  companyId: string;
  companyName: string;
  cleanedCompanyName: string;
  matchType: MatchType;
  score: number;
}

interface IResult {
  name: string;
  merchantName: string;
  originalName: string;
  originalMerchantName: string;
  merchantMatch?: IMatch;
  nameMatch?: IMatch;
  existingCompanyMatch?: string;
}

interface ICompanyWithCleanedName extends ICompany {
  companyCleanedName: string;
}

export const matchCompaniesToTransactions = async (transactions: Transaction[]) => {
  const results: IResult[] = [];
  const companies = await CompanyModel.find({}).select('companyName').lean() as ICompany[];
  const companiesCleaned: ICompanyWithCleanedName[] = companies.map((company: ICompany) => {
    let companyCleanedName = company.companyName;
    for (const replacement of stringReplacements) companyCleanedName = companyCleanedName.replace(new RegExp(replacement, 'gi'), '');
    for (const replacement of regexReplacements) companyCleanedName = companyCleanedName.replace(replacement, '');
    const companyCleaned = {
      ...company,
      companyCleanedName: companyCleanedName.trim().toLowerCase(),
    };
    return companyCleaned;
  });
  const options = {
    findAllMatches: false,
    includeScore: true,
    threshold: THRESHOLD,
    keys: ['companyCleanedName'],
  };
  for (const transaction of transactions) {
    let { name } = transaction;
    let merchantName = transaction?.merchant_name;
    const originalName = name;
    const originalMerchantName = merchantName;
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
    const result: IResult = {
      name,
      merchantName,
      merchantMatch: null,
      nameMatch: null,
      originalName,
      originalMerchantName,
    };
    console.log({ name, merchantName });
    console.time('Searching for a match');
    const fuse = new Fuse(companiesCleaned, options);
    const nameResult = fuse.search(name);
    console.log(`\n\n///// MERCHANT NAME: ${merchantName} | NAME: ${name} /////`);
    console.log('\nNAME RESULT LENGTH: ', nameResult.length);
    console.log('\nNAME RESULT: ', JSON.stringify(nameResult.slice(0, 5), null, 2));
    let merchantNameResult: any[] = [];
    if (merchantName) {
      merchantNameResult = fuse.search(merchantName);
      console.log('\nMERCHANT NAME RESULT LENGTH: ', merchantNameResult.length);
      console.log('\nMERCHANT NAME RESULT: ', JSON.stringify(merchantNameResult.slice(0, 5), null, 2));
    }
    console.timeEnd('Searching for a match');

    const hasMerchantResults = merchantNameResult.length > 0;
    const firstMerchantResult = hasMerchantResults ? merchantNameResult[0] : null;

    // merchant match meets threshold
    if (firstMerchantResult?.score < THRESHOLD) {
      const merchantMatch: IMatch = {
        companyId: firstMerchantResult.item._id.toString(),
        companyName: firstMerchantResult.item.companyName,
        cleanedCompanyName: firstMerchantResult.item.companyCleanedName,
        matchType: MatchType.MerchantName,
        score: firstMerchantResult.score,
      };
      result.merchantMatch = merchantMatch;
    }
    // name match meets threshold
    if (nameResult.length > 0 && nameResult[0]?.score < THRESHOLD) {
      const nameMatch: IMatch = {
        companyId: nameResult[0].item._id.toString(),
        companyName: nameResult[0].item.companyName,
        cleanedCompanyName: nameResult[0].item.companyCleanedName,
        matchType: MatchType.Name,
        score: nameResult[0].score,
      };
      result.nameMatch = nameMatch;
    }
    results.push(result);
  }
  const _csv = parse(results, { transforms: [transforms.flatten({ objects: true, arrays: true })] });
  fs.writeFileSync(path.join(__dirname, '.tmp', 'text-match-test.csv'), _csv);
};
