import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { MongoClient } from '../../../clients/mongo';
import { cleanUpDocuments } from '../../../lib/model';
import { createSomeCards, createSomePromos, createSomeUsers } from '../../../lib/testingUtils';
import { ICardDocument } from '../../../models/card';
import { IPromoDocument } from '../../../models/promo';
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

const campaigns = [
  { name: 'testcampaign1', total: numUsersInFirstPromo },
  { name: 'testcampaign2', total: numUsersInSecondPromo },
  { name: 'testcampaign3', total: numUsersInFourthPromo },
];

const getCreateTestUsersRequest = (testPromos: IPromoDocument[]) => {
  const testIntegrations: IUserIntegrations[] = [];

  for (let i = 0; i < numUsersInFirstPromo; i++) {
    testIntegrations.push({
      promos: [testPromos[0]],
      referrals: {
        params: [
          { key: 'utm_source', value: sources[0].name },
          { key: 'utm_campaign', value: campaigns[0].name },
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
          { key: 'utm_campaign', value: campaigns[1].name },
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
          { key: 'utm_campaign', value: campaigns[2].name },
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
    await cleanUpDocuments([...testCards, ...testUsers, ...testPromos]);

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
        users: testUsersRequest.map((integration) => ({ integrations: integration })),
      });

      // create linked accounts for about half of the users
      const testUsersWithcards = testUsers.filter((_, i) => i % 2 === 0);
      const cardRequest = testUsersWithcards.map((user) => ({ userId: user._id }));
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
    const data = await getPromosReport(mockRequest);
    expect(data).toBeDefined();
    const sourceAggData = data as { data: ISourceAggData[] };
    expect(sourceAggData.data.length).toBeGreaterThanOrEqual(testPromos.length);
    const promoNames = testPromos.map((promo) => promo.name);
    promoNames.forEach((promoName) => {
      expect(sourceAggData.data.find((source) => source.promo === promoName)).toBeDefined();
    });
  });

  it('getPromosReport created campaigns report', async () => {
    const mockRequest = {
      params: { reportId: ReportType.PromoUsersByCampaign },
      requestor: {},
      authKey: '',
    } as IRequest<IReportRequestParams, IReportRequestQuery>;
    const data = await getPromosReport(mockRequest);
    expect(data).toBeDefined();
    const campaignAggData = data as { data: ICampaignAggData[] };
    expect(campaignAggData.data.length).toBeGreaterThanOrEqual(testPromos.length);

    let userCampaigns = campaignAggData.data.map((campaignData) => campaignData?.campaigns);
    userCampaigns = userCampaigns.filter((campaign) => Object.keys(campaign)?.length > 0);
    campaigns.forEach((campaign) => {
      const usersInCampaign = userCampaigns.filter((c) => !!Object.keys(c)?.find((key) => key === campaign.name));

      const numUsersInCampaign = usersInCampaign.reduce((acc, curr) => acc + (curr[campaign.name] || 0), 0);
      expect(numUsersInCampaign).toBeGreaterThanOrEqual(campaign.total);
    });
  });

  it('getPromosReport created linked accounts report', async () => {
    const mockRequest = {
      params: { reportId: ReportType.PromoUsersByAccountStatus },
      requestor: {},
      authKey: '',
    } as IRequest<IReportRequestParams, IReportRequestQuery>;
    const data = await getPromosReport(mockRequest);
    expect(data).toBeDefined();
    const linkedAccountAggData = data as { data: IAccountStatusAggData[] };
    expect(linkedAccountAggData.data.length).toBeGreaterThanOrEqual(testPromos.length);
    // TODO: add better assertions
  });
});
