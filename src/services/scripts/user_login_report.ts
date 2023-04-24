import dayjs from 'dayjs';
import fs from 'fs';
import { parse } from 'json2csv';
import path from 'path';
import { CardStatus } from '../../lib/constants';
import { roundToPercision, sleep } from '../../lib/misc';
import { CardModel, ICardDocument } from '../../models/card';
import { CommissionModel, ICommissionDocument } from '../../models/commissions';
import { IShareableCompany } from '../../models/company';
import { IUserDocument, UserModel } from '../../models/user';
import { UserLogModel } from '../../models/userLog';

/* WARNING: This script pulls sensitive user data. The output should be handled with care. */

type UserLoginReport = {
  id: string;
  email: string;
  name: string;
  total_logins: number;
  account_created_date: string;
  total_linked_accounts: number;
  linked_depository_accounts: number;
  linked_credit_accounts: number;
  linked_other_accounts: number;
  linked_account_institutions: string[];
  first_account_linked_date: string;
  earned_cashback: boolean;
  cashback_amount: number;
  cashback_companies: string[];
};

const getUserLoginCount = async (user: IUserDocument): Promise<number> => {
  const email = user?.emails?.find((e) => e.primary)?.email || '';
  try {
    const loginCount = await UserLogModel.find({ userId: user._id }).countDocuments();
    return loginCount;
  } catch (e) {
    console.log('Error getting user logins for user with email: ', email, ': ', e);
    return 0;
  }
};

const getCardsSortedByAscDate = async (user: IUserDocument): Promise<ICardDocument[]> => {
  const email = user?.emails?.find((e) => e.primary)?.email || '';
  try {
    const cards = await CardModel.find({ userId: user._id, status: CardStatus.Linked }).sort({ createdOn: 1 });
    return cards;
  } catch (e) {
    console.log('Error getting user cards for user with email: ', email, ': ', e);
    return [];
  }
};

const getUserCommissionsWithCompanyNames = async (user: IUserDocument): Promise<ICommissionDocument[]> => {
  const email = user?.emails?.find((e) => e.primary)?.email || '';
  try {
    const commissions = await CommissionModel.aggregate()
      .match({ user: user._id })
      .lookup({
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        as: 'company',
      })
      .unwind('company')
      .sort({
        createdOn: 1,
      });
    return commissions;
  } catch (e) {
    console.log('Error getting user commissions for user with email: ', email, ': ', e);
    return [];
  }
};

export const getUserLoginReport = async (): Promise<UserLoginReport[]> => {
  const msDelayBetweenBatches = 1000;
  const batchLimit = 25;

  const report: UserLoginReport[] = [];

  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const userBatch = await UserModel.paginate(
      {},
      {
        page,
        limit: batchLimit,
      },
    );

    console.log('total users matching query: ', userBatch.totalDocs);
    console.log(`Preparing batch ${page} of ${userBatch.totalPages}`);

    // do stuff with userBatch.docs
    const res: UserLoginReport[] = await Promise.all(
      userBatch.docs.map(async (user: IUserDocument) => {
        const { _id, emails, name, dateJoined } = user;
        const email = emails?.find((e) => e.primary)?.email || '';
        console.log('getting data for ', email);
        try {
          // # Query user_logins collection
          // count total logins
          const totalLogins = (await getUserLoginCount(user)) || 0;

          // # Query cards collection
          // get all linked accounts (sorted by ascending date)
          const cards = await getCardsSortedByAscDate(user);

          // log first account linked date
          const firstAccountLinkedDate = cards?.[0]?.createdOn || null;
          // count depository accounts
          const numDepositoryAccounts = cards?.filter((c) => c.type === 'depository').length || 0;
          // count credit accounts
          const numCreditAccounts = cards?.filter((c) => c.type === 'credit').length || 0;
          // oter accounts = total - (depository + credit)
          const numOtherAccounts = cards?.length ? cards.length - (numDepositoryAccounts + numCreditAccounts) : 0;

          // compile unique list of institutions
          const institutions: string[] = cards?.reduce((fis, c) => {
            if (c.institution && !fis.includes(c.institution)) {
              fis.push(c.institution);
            }
            return fis;
          }, []) || [];

          // # Query commissisons collection
          // get commissions earned
          const commissions = await getUserCommissionsWithCompanyNames(user);
          // get cashback amount
          const cashbackAmount = roundToPercision(
            commissions?.reduce((total, c) => total + c.amount, 0),
            2,
          ) || 0;
          // compile unique list of cashback companies
          const companies: string[] = commissions?.reduce((cs, c) => {
            if (
              (c?.company as IShareableCompany)?.companyName
                && !cs.includes((c?.company as IShareableCompany)?.companyName)
            ) {
              cs.push((c.company as IShareableCompany)?.companyName);
            }
            return cs;
          }, []) || [];

          return {
            id: _id,
            email,
            name,
            total_logins: totalLogins,
            account_created_date: !!dateJoined ? dayjs(dateJoined)?.utc()?.format('MM-DD-YYYY') : '',
            total_linked_accounts: cards?.length ? cards.length : 0,
            linked_depository_accounts: numDepositoryAccounts,
            linked_credit_accounts: numCreditAccounts,
            linked_other_accounts: numOtherAccounts,
            linked_account_institutions: institutions,
            first_account_linked_date: !!firstAccountLinkedDate
              ? dayjs(firstAccountLinkedDate)?.utc()?.format('MM-DD-YYYY')
              : '',
            earned_cashback: commissions?.length > 0,
            cashback_amount: cashbackAmount,
            cashback_companies: companies,
          };
        } catch (e) {
          console.log('Error getting user data for: ', user?._id.toString(), ': ', e);
          return {
            id: _id || '',
            email: email || '',
            name: name || '',
            total_logins: 0,
            account_created_date: '',
            total_linked_accounts: 0,
            linked_depository_accounts: 0,
            linked_credit_accounts: 0,
            linked_other_accounts: 0,
            linked_account_institutions: [],
            first_account_linked_date: '',
            earned_cashback: false,
            cashback_amount: 0,
            cashback_companies: [],
          };
        }
      }),
    );
    report.push(...res);

    sleep(msDelayBetweenBatches);

    hasNextPage = userBatch?.hasNextPage || false;
    page++;
  }
  // write to csv
  const csv = parse(report);
  fs.writeFileSync(
    path.join(
      __dirname,
      '.tmp',
      `user_login_report_${dayjs()?.utc()?.format('MM-DD-YYYY')}.csv`,
    ),
    csv,
  );
  return report;
};
