import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import {
  AddCardToUserRequest,
  CreateUserRequest,
  KardClient,
  QueueTransactionsRequest,
  TransactionStatus,
  UpdateUserRequest,
} from '../kard';

describe('kard client interface can fetch session tokes, create, update, and delete users, and queue transactions for processing', () => {
  afterEach(() => {
    /* clean up between tests */
  });

  afterAll(async () => {
    // clean up db
  });

  beforeAll(async () => {});

  it.skip('getSessionToken fetches a new access token', async () => {
    const kard = new KardClient();
    const token = await kard.getSessionToken();
    expect(token).toBeDefined();
    expect(token.expires_in).toBeTruthy();
    expect(token.expires_in).toBeTruthy();
    expect(token.token_type).toBeTruthy();
  });

  it.skip('createUser creates a new user', async () => {
    const kard = new KardClient();
    const req: CreateUserRequest = {
      email: 'andy@test-TEST.com',
      userName: 'TestUser12345',
      cardInfo: {
        last4: '4321',
        bin: '123456',
        issuer: 'TEST',
        network: 'VISA',
      },
      referringPartnerUserId: '12345',
    };
    const res = await kard.createUser(req);
    expect(res).toBeDefined();
    expect(res.status).toBe(201);
  });

  it.skip('deleteUser deletes a user', async () => {
    const kard = new KardClient();
    const res = await kard.deleteUser('1234567890');
    expect(res).toBeDefined();
    expect(res.status).toBe(200);
  });

  it.skip('updateUser updates a user', async () => {
    const kard = new KardClient();
    const req: UpdateUserRequest = {
      email: 'test_update@test-TEST.com',
      referringPartnerUserId: '12345',
    };
    const res = await kard.updateUser(req);
    expect(res).toBeDefined();
    expect(res.status).toBe(200);
  });

  it.skip('addCardToUser adds a card to a user', async () => {
    const kard = new KardClient();
    const req: AddCardToUserRequest = {
      referringPartnerUserId: '12345',
      cardInfo: {
        last4: '0999',
        bin: '789012',
        issuer: 'TEST2',
        network: 'VISA',
      },
    };

    const res = await kard.addCardToUser(req);
    expect(res).toBeDefined();
    expect(res.email).not.toBe('');
    expect(res.id).not.toBe('');
    expect(res.cards?.length).toBeGreaterThan(0);
  });

  it.skip('getRewardsMerchants fetched merchats that offer rewards', async () => {
    const kard = new KardClient();
    const res = await kard.getRewardsMerchants();
    expect(res).toBeDefined();
    expect(res.length).toBeGreaterThan(0);
  });

  it.skip('queueTransactionsForProcessing sends well formatted reqeust and returns success', async () => {
    const kard = new KardClient();
    // test queing one transaction of each type
    const req: QueueTransactionsRequest = [
      {
        transactionId: 'TestTransactionId_00',
        referringPartnerUserId: '12345',
        amount: 100,
        status: TransactionStatus.RETURNED,
        currency: 'USD',
        description: 'Test Merchant 0',
        transactionDate: new Date().toISOString(),
        cardLastFour: '4321',
      },
      {
        transactionId: 'TestTransactionId_01',
        referringPartnerUserId: '12345',
        amount: 100,
        status: TransactionStatus.APPROVED,
        currency: 'USD',
        description: 'Test Merchant 1',
        authorizationDate: new Date().toISOString(),
        merchantName: 'Test Merchant 1',
        cardBIN: '123456',
        cardLastFour: '4321',
      },
      {
        transactionId: 'TestTransactionId_02',
        referringPartnerUserId: '12345',
        amount: 1000,
        status: TransactionStatus.SETTLED,
        currency: 'USD',
        description: 'Walmart',
        settledDate: new Date().toISOString(),
        merchantName: 'Walmart',
        cardBIN: '123456',
        cardLastFour: '4321',
      },
      {
        transactionId: 'TestTransactionId_03',
        referringPartnerUserId: '12345',
        amount: 100,
        status: TransactionStatus.DECLINED,
        currency: 'USD',
        description: 'Best Buy',
        transactionDate: new Date().toISOString(),
        merchantName: 'Test Merchant 3',
        cardBIN: '123456',
        cardLastFour: '4321',
      },
      {
        transactionId: 'TestTransactionId_04',
        referringPartnerUserId: '12345',
        amount: 100,
        status: TransactionStatus.REVERSED,
        currency: 'USD',
        description: 'Best Buy',
        transactionDate: new Date().toISOString(),
        merchantName: 'Test Merchant 4',
        cardBIN: '123456',
        cardLastFour: '4321',
      },
    ];

    const res = await kard.queueTransactionsForProcessing(req);
    expect(res).toBeDefined();
    expect(res.status).toBe(201);
  });
});
