import { RateLimiterRedis } from 'rate-limiter-flexible';
import { NextFunction, Response } from 'express-serve-static-core';
import { error } from '../services/output';
import { RedisClient } from '../clients/redis';
import CustomError from '../lib/customError';
import { ErrorTypes } from '../lib/constants';
import { IRequest } from '../types/request';

const rateLimiter = async ({
  keyPrefix = 'middleware',
  points = 10,
  duration = 1,
}) => {
  const rateLimiterInstance = new RateLimiterRedis({
    storeClient: RedisClient.pub,
    keyPrefix,
    points, // no. of requests
    duration, // per  (in seconds)
  });
  return async (req: IRequest, res: Response, next: NextFunction) => {
    const ip = req.headers?.['x-forwarded-for'];
    try {
      await rateLimiterInstance.consume(ip)
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

export default rateLimiter;
