import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import dayjs from 'dayjs';
import { Types } from 'mongoose';
import { MongoClient } from '../../../clients/mongo';
import { createSomeCards, createSomePromos, createSomeUsers } from '../../../lib/testingUtils';
import { ICardDocument } from '../../../models/card';
import { ICompanyDocument } from '../../../models/company';
import { IPromoDocument } from '../../../models/promo';
import { ITransactionDocument } from '../../../models/transaction';
import { IUserDocument, IUserIntegrations } from '../../../models/user';
import { IRequest } from '../../../types/request';
import { getPromosReport, IAccountStatusAggData, ICampaignAggData, ISourceAggData } from '../promos';
import { IReportRequestParams, IReportRequestQuery, ReportType } from '../utils/types';

const numUsersInFirstPromo = 5;
const numUsersInSecondPromo = 3;
const numUsersInThirdPromo = 1;
const numUsersInFourthPromo = 1;

const sources = [
  { name: 'facebook', total: numUsersInFirstPromo + numUsersInSecondPromo },
  { name: 'linkedin', total: numUsersInFourthPromo },
];

const campaigns = ['TestCampaign1', 'TestCampaign2', 'TestCampaign3'];

const getCreateTestUsersRequest = (testPromos: IPromoDocument[]) => {
  let testIntegrations: IUserIntegrations[] = [];

  for (let i = 0; i < numUsersInFirstPromo; i++) {
    testIntegrations.push({
      promos: [testPromos[0]],
      referrals: {
        params: [
          { key: 'utm_source', value: sources[0].name },
          { key: 'utm_campaign', value: campaigns[0] },
          { key: 'extra_param', value: 'TEST' },
        ],
      },
    });
  }
  for (let i = 0; i < numUsersInSecondPromo; i++) {
    testIntegrations.push({
      promos: [testPromos[0]],
      referrals: {
        params: [
          { key: 'utm_source', value: sources[0].name },
          { key: 'extra_param', value: 'TEST' },
          { key: 'utm_campaign', value: campaigns[1] },
        ],
      },
    });
  }
  for (let i = 0; i < numUsersInThirdPromo; i++) {
    testIntegrations.push({
      promos: [testPromos[0]],
    });
  }
  for (let i = 0; i < numUsersInFourthPromo; i++) {
    testIntegrations.push({
      promos: [testPromos[0]],
      referrals: {
        params: [
          { key: 'utm_source', value: sources[1].name },
          { key: 'utm_campaign', value: campaigns[2] },
        ],
      },
    });
  }
  return testIntegrations;
};
describe('promo report generation logic tests', () => {
  let testUsers: IUserDocument[];
  let testPromos: IPromoDocument[];
  let testCards: ICardDocument[];

  afterEach(() => {
    /* clean up between tests */
  });

  afterAll(async () => {
    /* clean up linked accounts */
    await Promise.all(
      testCards?.map(async (card) => {
        try {
          await card.remove();
        } catch (err) {
          console.log('error removing cards', err);
        }
      })
    );

    /* clean up users */
    await Promise.all(
      testUsers?.map(async (user) => {
        try {
          await user.remove();
        } catch (err) {
          console.log('error removing users', err);
        }
      })
    );

    /* clean up promos */
    await Promise.all(
      testPromos?.map(async (promo) => {
        try {
          await promo.remove();
        } catch (err) {
          console.log('error removing promos', err);
        }
      })
    );

    // clean up db
    MongoClient.disconnect();
  });

  beforeAll(async () => {
    await MongoClient.init();

    try {
      // create test Promo(s)
      testPromos = await createSomePromos({ promos: [{}, {}, {}, {}, {}] });

      // create test users associated with the promos
      const testUsersRequest = getCreateTestUsersRequest(testPromos);
      testUsers = await createSomeUsers({
        users: testUsersRequest.map((integration) => {
          return { integrations: integration };
        }),
      });

      // create linked accounts for about half of the users
      const testUsersWithcards = testUsers.filter((_, i) => i % 2 === 0);
      const cardRequest = testUsersWithcards.map((user) => {
        return { userId: user._id };
      });
      testCards = await createSomeCards({ cards: cardRequest });
    } catch (err) {
      console.log('error creating test data', err);
    }
  });

  it('getPromosReport created sources report', async () => {
    const mockRequest = {
      params: { reportId: ReportType.PromoUsersBySource },
      requestor: {},
      authKey: '',
    } as IRequest<IReportRequestParams, IReportRequestQuery>;
    let data = await getPromosReport(mockRequest);
    expect(data).toBeDefined();
    const sourceAggData = data as { data: ISourceAggData[] };
    expect(sourceAggData.data.length).toBe(testPromos.length);
    // TODO: add better assertions
  });

  it('getPromosReport created campaigns report', async () => {
    const mockRequest = {
      params: { reportId: ReportType.PromoUsersByCampaign },
      requestor: {},
      authKey: '',
    } as IRequest<IReportRequestParams, IReportRequestQuery>;
    let data = await getPromosReport(mockRequest);
    expect(data).toBeDefined();
    const campaignAggData = data as { data: ICampaignAggData[] };
    expect(campaignAggData.data.length).toBe(testPromos.length);
    // TODO: add better assertions
  });

  it('getPromosReport created linked accounts report', async () => {
    const mockRequest = {
      params: { reportId: ReportType.PromoUsersByAccountStatus },
      requestor: {},
      authKey: '',
    } as IRequest<IReportRequestParams, IReportRequestQuery>;
    let data = await getPromosReport(mockRequest);
    expect(data).toBeDefined();
    const linkedAccountAggData = data as { data: IAccountStatusAggData[] };
    expect(linkedAccountAggData.data.length).toBe(testPromos.length);
    // TODO: add better assertions
  });
});
