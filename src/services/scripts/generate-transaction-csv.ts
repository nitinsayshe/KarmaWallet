import fs from 'fs';
import path from 'path';
import { parse, transforms } from 'json2csv';
import { LeanDocument, ObjectId } from 'mongoose';
import { ITransactionDocument, TransactionModel } from '../../models/transaction';
import { ISectorDocument, SectorModel } from '../../models/sector';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { UserModel } from '../../models/user';
import { CompanyDataSourceModel, ICompanyDataSourceDocument } from '../../models/companyDataSource';

const CSV_PATH = path.join(__dirname, '.tmp', 'transactions.csv');
export interface ITransactionReportTransaction {
  date: Date;
  amount: number;
  user: string;
  card: string;
  company: {
    companyName: string;
    _id: ObjectId | string;
    combinedScore: number;
    parentCompany: {
      _id: ObjectId | string;
      companyName: string;
    }
  },
  sector: {
    _id: ObjectId | string;
    name: string;
    carbonMultiplier: number;
    tier: number;
  }
  plaidCategory: string;
  plaidName: string;
  carbonMultiplier?: number;
  hasDataSource: boolean;
}

interface ICompanyDataSourceMap {
  [companyId: string]: boolean,
}

const enrichAndFormatTransactionsForReport = async (transactions: LeanDocument<ITransactionDocument>[], companyDataSourceMap: ICompanyDataSourceMap): Promise<ITransactionReportTransaction[]> => {
  const _transactions: ITransactionReportTransaction[] = [];
  for (const transaction of transactions) {
    const { date, amount, user, card } = transaction;
    const sector = transaction?.sector as ISectorDocument;
    const company = transaction?.company as ICompanyDocument;
    const parentCompany = company?.parentCompany as ICompanyDocument;
    const transactionReportTransaction: ITransactionReportTransaction = {
      date,
      amount,
      card: card?.toString(),
      plaidCategory: transaction.integrations.plaid?.category?.join(',') || '',
      plaidName: transaction.integrations.plaid?.name || '',
      user: user.toString(),
      hasDataSource: false,
      company: {
        companyName: company?.companyName || '',
        _id: company?._id?.toString() || '',
        combinedScore: company?.combinedScore || null,
        parentCompany: {
          _id: parentCompany?._id?.toString() || '',
          companyName: parentCompany?.companyName || '',
        },
      },
      sector: {
        _id: sector?._id || '',
        name: sector?.name || '',
        carbonMultiplier: sector?.carbonMultiplier || null,
        tier: sector?.tier || null,
      },
    };
    if (company) {
      const companyId = company._id.toString();
      const companyHasDataSource = companyDataSourceMap[companyId];
      if (companyHasDataSource === undefined) {
        const companyDataSource: ICompanyDataSourceDocument = await CompanyDataSourceModel.findOne({ company: companyId });
        companyDataSourceMap[companyId] = !!companyDataSource;
        transactionReportTransaction.hasDataSource = !!companyDataSource;
      } else {
        transactionReportTransaction.hasDataSource = companyHasDataSource;
      }
    }
    _transactions.push(transactionReportTransaction);
  }
  return _transactions;
};

export const generateTransactionCsv = async ({ writeToDisk = true }) => {
  console.log('\ngenerating transaction csv...');
  const companyDataSourceMap: ICompanyDataSourceMap = {};
  try {
    if (fs.existsSync(CSV_PATH)) fs.unlinkSync(CSV_PATH);

    const users = await UserModel.find({}).select('_id').lean();
    let allTransactions: ITransactionReportTransaction[] = [];

    for (const user of users) {
      const transactions = await TransactionModel.find({ user })
        .populate(
          [
            {
              path: 'sector',
              model: SectorModel,
            },
            {
              path: 'company',
              model: CompanyModel,
              populate: [
                {
                  path: 'sectors',
                  populate: [
                    {
                      path: 'sector',
                      model: SectorModel,
                    },
                  ],
                },
                {
                  path: 'parentCompany',
                  model: CompanyModel,
                },
              ],
            },
          ],
        )
        .lean();

      if (!transactions?.length) continue;

      const _transactions = await enrichAndFormatTransactionsForReport(transactions, companyDataSourceMap);
      allTransactions = [...allTransactions, ..._transactions];
    }
    const csv = parse(allTransactions, { header: true, transforms: [transforms.flatten({ objects: true, arrays: true })] });
    if (writeToDisk) fs.writeFileSync(CSV_PATH, csv);
    console.log(`[+] transaction report generated successfully with ${allTransactions.length} transactions\n`);
    return csv;
  } catch (err: any) {
    console.log('[-] error generating transaction csv');
    console.log(err.message);
  }
};
