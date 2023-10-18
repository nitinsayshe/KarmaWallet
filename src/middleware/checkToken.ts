import argon2 from 'argon2';
import { ApiKeyStatus, ErrorTypes } from '../lib/constants';
import { UUID_REGEX } from '../lib/constants/regex';
import CustomError from '../lib/customError';
import { ApiKeyModel } from '../models/apiKey';
import { AppModel, IAppDocument } from '../models/app';
import { error } from '../services/output';
import { IRequest, IRequestHandler } from '../types/request';

const checkToken: IRequestHandler = async (req, res, next) => {
  if (req.headers['plaid-verification'] && req.url === '/webhook/plaid') {
    return next();
  }

  if (req?.headers['x-wf-signature'] && req?.url === '/webhook/wildfire') return next();

  if (req?.url === '/webhook/paypal') return next();
  if (req?.url === '/webhook/kard') return next();
  if (req?.url === '/webhook/marqeta') return next();

  const token = req.headers.authorization;
  if (!!token && token.replace('Bearer ', '') === process.env.PUBLIC_TOKEN) {
    return next(); // kw-frontend auth
  }

  try {
    // do we have x-kw-api-id and x-kw-api-key
    const apiId = req?.headers['x-kw-api-id'];
    const apiKey = req?.headers['x-kw-api-key'];

    // validate that this thing is a uuid
    if (!apiId || !UUID_REGEX.test(apiId)) {
      throw new Error(`missing or invalid api id: ${apiId?.toString()}`);
    }

    if (!apiKey || !UUID_REGEX.test(apiKey)) {
      throw new Error(`missing or invalid api key: ${apiKey?.toString()}for apiId: ${apiId}`);
    }

    // look up this apiId in the database -- apiKeys are registered to Apps
    const app = await AppModel.findOne({ apiId }).lean();
    if (!app) {
      throw new Error(`invalid app id. app not found: ${req}`);
    }

    const key = await ApiKeyModel.findOne({
      app: app._id,
      status: ApiKeyStatus.Active,
    }).lean();
    if (!key) {
      throw new Error(`invalid api key. key not found: ${req}`);
    }

    // if it exists, check the apiKey hash against the apiKey in the database
    const keyMatch = await argon2.verify(key?.keyHash, apiKey);
    if (!keyMatch) {
      throw new Error(`invalid app key: ${req}`);
    }

    (req as IRequest).apiRequestor = app as IAppDocument;
  } catch (e) {
    console.error(e);
    return error(
      req,
      res,
      new CustomError(
        'Access denied. Invalid credentials.',
        ErrorTypes.AUTHENTICATION,
      ),
    );
  }

  // is the api request going to an authorized endpoint?
  if (!!(req as IRequest).apiRequestor && !req.url.startsWith('/api')) {
    const err = `app with apiId: ${(req as IRequest).apiRequestor.apiId} requested an unauthorized endpoint: ${req.url}`;
    console.log(err);
    return error(
      req,
      res,
      new CustomError(err, ErrorTypes.FORBIDDEN),
    );
  }

  next();
};

export default checkToken;
