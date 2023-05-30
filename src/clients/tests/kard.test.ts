import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { AddCardToUserRequest, CreateUserRequest, KardClient, UpdateUserRequest } from '../kard';

describe.skip('kard client interface can fetch session tokes, create, update, and delete users, and queue transactions for processing', () => {
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
});
