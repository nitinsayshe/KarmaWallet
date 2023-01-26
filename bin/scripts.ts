/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
import 'dotenv/config';
import { K } from 'handlebars';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { Logger } from '../src/services/logger';
import { manuallyUpdateTransactionsFalsePositiveNegatives } from '../src/services/scripts/update_false_positive_negatives_transactions';
import { calculateAvgScores } from '../src/services/scripts/calculate_avg_sector_scores';
import { checkCompanySectorsForMainTierSector } from '../src/services/scripts/check_company_sectors_for_main_tier_sector';
import matchExistingTransactions, { singleBatchMatch } from '../src/services/scripts/match-existing-transactions';
import * as GenerateUserImpactTotals from '../src/jobs/generateUserImpactTotals';
import { updateCompanies, updateDataSources, updateCompanyDataSources, updateDataSourceMapping, updateMatchedCompanyNames } from '../src/services/scripts/batch_company_updates';
import { removeDuplicatePlaidTransactions } from '../src/services/scripts/remove_duplicate_plaid_transactions';
import { CompanyDataSourceModel } from '../src/models/companyDataSource';
import { monthlyBatchUpdateEffects } from '../src/services/scripts/monthly_batch_update_effects';
import { sanitizeEmails } from '../src/services/scripts/sanitizeEmails';
import { associateWildfireMatches, matchWildfireCompanies, searchResultsProcessing } from '../src/services/scripts/wildfire';
import { updateCompaniesUrls } from '../src/services/scripts/update_companies_urls';
import { generateMicrosoftWildfireCompanies } from '../src/services/scripts/generate_microsoft_wildfire_companies';
import * as uploadCsvToGoogleDrive from '../src/jobs/uploadCsvToGoogleDrive';
import { CsvReportTypes } from '../src/lib/constants/jobScheduler';
import { deleteUser } from '../src/services/scripts/delete_user';
import { emailIds } from './emailIds';
import { CardModel } from '../src/models/card';
import { UserModel } from '../src/models/user';
import { CardStatus } from '../src/lib/constants';
import { getUtcDate } from '../src/lib/date';

dayjs.extend(utc);

const BATCH_SIZE = 50000;
const STARTING_INDEX = 4;

// get users with a dateJoined after startDate and before endDate
// get cards $in these ids
// get unique userIds in these cards

const getFacebookBonusUsers = async (startDate: string, endDate: string) => {
  const users = await UserModel.find({ dateJoined: { $gte: dayjs(startDate).utc().toDate(), $lt: dayjs(endDate).utc().toDate() } }).select('name emails');
  const userIds = users.map((user) => user._id);
  const cards = await CardModel.find({ userId: { $in: userIds }, status: CardStatus.Linked });
  const uniqueIds: string[] = [];
  cards.forEach(card => {
    if (!uniqueIds.includes(card.userId.toString())) {
      uniqueIds.push(card.userId.toString());
    }
  });
  // console.log('cards', JSON.stringify(cards.map(c => c._id.toString())));
  // console.log('users', JSON.stringify(uniqueIds));
  return { users: uniqueIds, numberOfUsers: uniqueIds.length };
};

// iterate over all userIds from the emailIds array
// get all cards that are linked for userId
// if card is found for user make sure it has a createdOn date that is after the startDate and before the endDate
// return uniqueIds for these users (push onto array)

const getBonusUsersFromEmailCampaign = async (startDate: string, endDate: string) => {
  const uniqueIds = [];
  for (const userId of emailIds) {
    const cards = await CardModel.find({ userId, status: CardStatus.Linked });
    if (cards.length > 0) {
      for (const card of cards) {
        if (card.createdOn >= dayjs(startDate).utc().toDate() && card.createdOn <= dayjs(endDate).utc().toDate()) {
          uniqueIds.push(userId);
          break;
        }
      }
    }
  }
  return { users: uniqueIds, numberOfUsers: uniqueIds.length };
};

(async () => {
  try {
    // const mockRequest = ({
    //   requestor: { },
    //   authKey: '',
    // } as IRequest);
    await MongoClient.init();
    const data = await getFacebookBonusUsers('2023-01-24', '2023-01-25');
    console.log('Facebook: ', data.numberOfUsers);
    // const data2 = await getBonusUsersFromEmailCampaign('2023-01-23', '2023-01-26');
    // console.log('Email: ', data2.numberOfUsers);
    // await matchExistingTransactions({
    //   startingIndex: STARTING_INDEX,
    //   endingIndex: null,
    //   batchSize: BATCH_SIZE,
    // });
    await MongoClient.disconnect();
  } catch (err) {
    Logger.error(asCustomError(err));
    console.log(err);
    // await MongoClient.disconnect();
  }
})();
