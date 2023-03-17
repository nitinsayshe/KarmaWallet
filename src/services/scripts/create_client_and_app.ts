import { MongoClient } from '../../clients/mongo';
import { asCustomError } from '../../lib/customError';
import { IApp, AppModel } from '../../models/app';
import { ClientModel, IClient, IClientDocument } from '../../models/client';
import { Logger } from '../logger';

// Set the name and settings for the new app here
const newClient: Partial<IClient> = {
  name: 'ImpactKarma',
};
const newApp: Partial<IApp> = {
  name: 'KarmaWallet',
  settings: {
    url: 'https://karmawallet.io',
  },
};

async function createClient(client: Partial<IClient>) {
  return ClientModel.create(client);
}

async function createApp(client: IClientDocument, app: Partial<IApp>) {
  app.client = client;
  return AppModel.create(app);
}

(async function createClientWithApp() {
  try {
    await MongoClient.init();

    const client = await createClient(newClient);
    const kwApp = await createApp(client as unknown as IClientDocument, newApp);

    console.log(JSON.stringify({ client, kwApp }, null, 2));
  } catch (err) {
    Logger.error(asCustomError(err));
  } finally {
    MongoClient.disconnect();
  }
}());
