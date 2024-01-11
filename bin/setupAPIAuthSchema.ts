import 'dotenv/config';
import argon2 from 'argon2';
import { MongoClient } from '../src/clients/mongo';
import { asCustomError } from '../src/lib/customError';
import { ApiKeyModel } from '../src/models/apiKey';
import { IApp, AppModel, IAppDocument } from '../src/models/app';
import { ClientModel, IClientDocument } from '../src/models/client';
import { Logger } from '../src/services/logger';
import { ApiKeyStatus } from '../src/lib/constants';

const { KW_API_PUBLIC_TOKEN } = process.env;

function createKWClient(name: string) {
  // create new client
  const client = { name };
  return ClientModel.create(client);
}

async function createKWApps(
  client: IClientDocument,
  apps: Partial<IApp & { key: string }>[],
) {
  // create new app
  const createdApps: Partial<IApp & { key: string }>[] = await Promise.all(
    apps.map(async (app) => {
      const newApp: Partial<IApp & { key: string }> = await AppModel.create({
        name: app.name,
        settings: app.settings,
        client,
      });
      newApp.key = app.key;
      return newApp;
    }),
  );
  return createdApps;
}

async function createApiKeys(apps: Partial<IAppDocument & { key: string }>[]) {
  const createdApiKeys = await Promise.all(
    apps.map(async (app: Partial<IAppDocument & { key: string }>) => {
      console.log(`app: ${app}`);
      const hash = await argon2.hash(app.key);
      console.log(`hash: ${hash}`);
      console.log('creating api key');
      return ApiKeyModel.create({
        app,
        keyHash: hash,
        status: ApiKeyStatus.Active,
      });
    }),
  );

  // create new api apiKey
  return createdApiKeys;
}

async function setupClientAndApps(
  clientName: string,
  apps: Partial<IApp & { key: string }>[] = [],
) {
  // create new client
  const client = await createKWClient(clientName);
  console.log(client);

  // create new app
  const createdApps = await createKWApps(
    client as unknown as IClientDocument,
    apps,
  );
  console.log(createdApps);

  // create new api key
  const key = await createApiKeys(
    createdApps as unknown as (IAppDocument & { key: string })[],
  );
  console.log(key);
}

(async () => {
  try {
    await MongoClient.init();

    const testApps: Partial<IApp & { key: string }>[] = [
      {
        name: 'karmawallet-frontend-test',
        key: '88d48be3-3dc7-4b97-81f7-d3350c1b76ca',
        settings: {
          url: 'https://test.karma-wallet.io',
          ip: '1.1.1.1',
          dataAccess: [
            {
              carbonEmissins: true,
            },
          ],
        },
      },
    ];
    await setupClientAndApps('Karma Wallet Test', testApps);
  } catch (err) {
    Logger.error(asCustomError(err));
  } finally {
    MongoClient.disconnect();
  }
})();
