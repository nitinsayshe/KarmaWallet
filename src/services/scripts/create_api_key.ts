import 'dotenv/config';
import argon2 from 'argon2';
import { v4 as uuid } from 'uuid';
import { MongoClient } from '../../clients/mongo';
import { ApiKeyStatus } from '../../lib/constants';
import { UUID_REGEX } from '../../lib/constants/regex';
import { asCustomError } from '../../lib/customError';
import { ApiKeyModel } from '../../models/apiKey';
import { IAppDocument, IApp, AppModel } from '../../models/app';
import { Logger } from '../logger';

const { KW_NEW_API_KEY, KW_NEW_APP_MONGO_ID } = process.env;

async function createApiKeys(apps: Partial<IAppDocument & { key: string }>[]) {
  const createdApiKeys = await Promise.all(
    apps.map(async (app: Partial<IAppDocument & { key: string }>) => {
      const hash = await argon2.hash(app.key);
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

(async () => {
  try {
    await MongoClient.init();

    if (!KW_NEW_APP_MONGO_ID) {
      console.error('Please set the app to update as `KW_NEW_APP_ID` in the .env file');
      throw new Error('No KW_NEW_APP_ID provided');
    }

    const app: Partial<IApp & { key: string }> = await AppModel.findOne({
      _id: KW_NEW_APP_MONGO_ID,
    });
    if (!app) {
      console.error(`No app found with id ${KW_NEW_APP_MONGO_ID}`);
      throw new Error('No app found');
    }

    let key = KW_NEW_API_KEY;
    if (!key) {
      console.error('No api key provided in .env as `KW_NEW_API_KEY`. Generating a new one');
      key = uuid();
      console.log(`Generated new api key: ${key}`);
      console.log('Please store this key somewhere safe as it will not be shown again');
    } else if (!UUID_REGEX.test(key)) {
      console.log('The new API key must be a valid UUID');
      throw new Error('KW_NEW_API_KEY is invalid');
    }

    app.key = key;

    await createApiKeys([app as unknown as IAppDocument & { key: string }]);
  } catch (err) {
    Logger.error(asCustomError(err));
  } finally {
    MongoClient.disconnect();
  }
})();
