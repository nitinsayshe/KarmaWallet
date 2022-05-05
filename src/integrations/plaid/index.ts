/* eslint-disable camelcase */
import { SandboxItemFireWebhookRequestWebhookCodeEnum } from 'plaid';
import { asCustomError } from '../../lib/customError';
import { PlaidItemModel } from '../../models/plaidItem';
import { IRequest } from '../../types/request';
import { PlaidMapper } from './mapper';
import { PlaidClient } from '../../clients/plaid';

export interface ICreateLinkTokenBody {
  accessToken?: string;
}
export interface IExchangePublicTokenBody {
  publicToken?: string;
}

export interface ISandboxItemFireWebhookBody {
  webhookCode?: SandboxItemFireWebhookRequestWebhookCodeEnum;
  accessToken?: string;
}

export const mapExistingItems = async (_: IRequest) => {
  try {
    console.log('\nstarting process to map existing plaid items...');
    console.log(`timestamp: ${new Date().toString()}\n`);

    console.log('\nretrieving all plaid items...');
    const plaidItems = await PlaidItemModel.find({}).lean();
    console.log('[+] plaid items retrieved\n');

    const mapper = new PlaidMapper(plaidItems);
    await mapper.mapItems();
    await mapper.mapSectorsToTransactions();
    await mapper.mapTransactionsToCompanies();
    await mapper.saveTransactions();
    await mapper.saveSummary();
    mapper.printSummary();

    console.log('\n[+] process complete');
  } catch (err) {
    throw asCustomError(err);
  }
};

export const mapTransactionsFromPlaid = async (_: IRequest, acs: string[] = [], daysInPast = 90) => {
  try {
    const mapper = new PlaidMapper();
    await mapper.mapTransactionsFromPlaid(acs, daysInPast);

    if (!mapper.transactions.length) {
      const message = 'no transactions received from plaid';
      console.log(message);
      return { message };
    }

    await mapper.mapSectorsToTransactions();
    await mapper.mapTransactionsToCompanies();
    await mapper.saveTransactions();
    await mapper.saveSummary();
    mapper.printSummary();
  } catch (err: any) {
    throw asCustomError(err);
  }
};

// write the collection of mapped categories to our db
// this collection will then be used to map each transaction
// with our categories and carbon multiplier score
export const mapPlaidCategoriesToKarmaCategoriesAndCarbonMultiplier = async (_: IRequest) => {
  try {
    const mapper = new PlaidMapper();
    await mapper.mapPlaidCategoriesToKarmaCategoriesAndCarbonMultiplier();
  } catch (err) {
    throw asCustomError(err);
  }
};

export const reset = async (_: IRequest) => {
  const mapper = new PlaidMapper();
  await mapper.reset();
};

export const createLinkToken = async (req: IRequest<{}, {}, ICreateLinkTokenBody>) => {
  const userId = req.requestor._id.toString();
  const { accessToken: access_token } = req.body;
  const client = new PlaidClient();
  return client.createLinkToken({ userId, access_token });
};

export const exchangePublicToken = async (req: IRequest<{}, {}, IExchangePublicTokenBody>) => {
  // const userId = req.requestor._id.toString();
  const { publicToken: public_token } = req.body;
  const client = new PlaidClient();
  return client.exchangePublicTokenForAccessToken({ public_token });
};

export const sandboxFireTestWebhook = async (req: IRequest<{}, {}, ISandboxItemFireWebhookBody>) => {
  const { accessToken: access_token, webhookCode: webhook_code } = req.body;
  const client = new PlaidClient();
  return client.sandboxFireTestWebhook({ access_token, webhook_code });
};
