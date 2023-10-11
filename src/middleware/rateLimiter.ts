import { Express } from 'express';
import { NextFunction, Response } from 'express-serve-static-core';
import { isNaN } from 'lodash';
import { IRateLimiterStoreOptions, RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { RedisClient } from '../clients/redis';
import { ErrorTypes } from '../lib/constants';
import CustomError from '../lib/customError';
import { error } from '../services/output';
import { ILoginData } from '../services/user';
import { RateLimiterHeaders } from '../types/headers';
import { IRequest } from '../types/request';

export const DefaultLimiterPoints = 10;
export const DefaultLimiterDuration = 1;
export const DefaultEmailLimiterPoints = 3;
export const DefaultEmailLimiterDuration = 60;
export const DefaultEmailLimiterBlockDuration = 60;
export const MaxLoginResetAttemptsPerSecond = 5;

export const getRateLimiterInstanceKeyFromKeyPrefix = (keyPrefix: string) => `${keyPrefix}-instance`;

export const KWRateLimiterKeyPrefixes = {
  Main: 'main-middleware',
  ResetPasswordTokenCreate: 'reset-password-token-creation-rate-limiter',
  Login: 'login-rate-limiter',
  DefaultEmailLimiter: 'email-rate-limiter-middleware',
  DefaultRateLimiter: 'rate-limiter-middleware',
} as const;

export const rateLimiter = async (opts: Partial<IRateLimiterStoreOptions>) => {
  if (!opts?.keyPrefix) opts.keyPrefix = KWRateLimiterKeyPrefixes.DefaultRateLimiter;
  if (!opts?.points) opts.points = DefaultLimiterPoints;
  if (!opts?.duration) opts.duration = DefaultLimiterDuration;
  const { keyPrefix, points, duration } = opts;
  const rateLimiterInstance = new RateLimiterRedis({
    storeClient: RedisClient.pub,
    keyPrefix,
    points, // no. of requests
    duration, // per  (in seconds)
  });
  return async (req: IRequest, res: Response, next: NextFunction) => {
    const ip = req.headers?.['x-forwarded-for'];
    try {
      await rateLimiterInstance
        .consume(ip)
        .then(() => console.log('Connected successfully to Redis'))
        .catch((rateLimiterRes) => {
          console.log('rate limiter error');
          console.log(rateLimiterRes);
        });
      next();
    } catch (e) {
      error(req, res, new CustomError('Too many requests', ErrorTypes.TOO_MANY_REQUESTS));
    }
  };
};

export const unblockEmailFromLimiter = async (
  req: IRequest,
  email: string,
  limiterKey: typeof KWRateLimiterKeyPrefixes.Login | typeof KWRateLimiterKeyPrefixes.ResetPasswordTokenCreate,
): Promise<void> => {
  const savedEmailRateLimiter = req?.app?.get(getRateLimiterInstanceKeyFromKeyPrefix(limiterKey));
  if (!savedEmailRateLimiter) {
    console.error('Error retrieving rate limiter with key: ', limiterKey);
    return;
  }
  console.log(`Deleting key: ${email} from rate limiter with key: ${limiterKey}`);
  await savedEmailRateLimiter.delete(email);
};

export const unblockFromEmailLimiterOnSuccess = async (
  req: IRequest,
  res: Response,
  limiterKey: typeof KWRateLimiterKeyPrefixes.Login | typeof KWRateLimiterKeyPrefixes.ResetPasswordTokenCreate,
): Promise<void> => {
  const savedEmailRateLimiter = req?.app?.get(getRateLimiterInstanceKeyFromKeyPrefix(limiterKey));
  if (!savedEmailRateLimiter) {
    console.error('Error retrieving rate limiter with key: ', limiterKey);
    return;
  }
  const email = (req?.body as ILoginData)?.email;
  if (!email) return;
  console.log(`Deleting key: ${email} from rate limiter with key: ${limiterKey}`);
  if (savedEmailRateLimiter?.keyPrefix === KWRateLimiterKeyPrefixes.Login && res.statusCode === 200) {
    await savedEmailRateLimiter.delete(email);
  }
};

export const setRateLimiterHeaders = (req: IRequest, res: Response): void => {
  if (!!req?.rateLimiterHeaders) {
    res.set(req.rateLimiterHeaders);
  }
};

export const emailRateLimiter = async (opts: Partial<IRateLimiterStoreOptions>, app: Express) => {
  if (!opts?.keyPrefix) opts.keyPrefix = KWRateLimiterKeyPrefixes.DefaultEmailLimiter;
  if (!opts?.points) opts.points = DefaultEmailLimiterPoints;
  if (!opts?.duration) opts.duration = DefaultEmailLimiterDuration;
  if (!opts?.blockDuration) opts.blockDuration = DefaultEmailLimiterBlockDuration;

  const { keyPrefix, points, duration, blockDuration } = opts;

  // initialize a redis client if not already initialized
  if (!RedisClient?.pub) RedisClient.init();
  const rateLimiterInstance = new RateLimiterRedis({
    storeClient: RedisClient.pub,
    keyPrefix,
    points, // no. of requests
    duration, // per  (in seconds)
    blockDuration,
  });
  // save a reference to the rate limiter instance in the app
  app.set(getRateLimiterInstanceKeyFromKeyPrefix(keyPrefix), rateLimiterInstance);
  return async (req: IRequest, res: Response, next: NextFunction) => {
    const email = (req?.body as ILoginData)?.email;
    let headers: RateLimiterHeaders = {};
    let rateLimiterRes: RateLimiterRes;

    try {
      if (!!email) {
        await rateLimiterInstance
          .consume(email)
          .then((r) => {
            rateLimiterRes = r;

            headers = {
              'Retry-After': rateLimiterRes.msBeforeNext / 1000,
              'X-RateLimit-Limit': points,
              'X-RateLimit-Remaining': rateLimiterRes.remainingPoints,
              'X-RateLimit-Reset': new Date(Date.now() + rateLimiterRes.msBeforeNext),
            };
            console.log('Connected successfully to Redis');
          })
          .catch((err) => {
            console.log('rate limiter error');
            console.error(err);
            throw err;
          });
      }
      req.rateLimiterHeaders = headers;
      next();
    } catch (e) {
      let errorMessage = 'Error: Too many requests';
      if ((e as RateLimiterRes)?.remainingPoints === 0 && !isNaN((e as RateLimiterRes)?.msBeforeNext)) {
        errorMessage = 'Error: Too many requests. Please try again in a little while.';
        console.log(`email: ${email} blocked for ${(e as RateLimiterRes).msBeforeNext / 1000} seconds`);
      }
      error(req, res, new CustomError(errorMessage, ErrorTypes.TOO_MANY_REQUESTS));
    }
  };
};
