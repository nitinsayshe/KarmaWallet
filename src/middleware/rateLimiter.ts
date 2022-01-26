import { RateLimiterRedis } from 'rate-limiter-flexible';
import { NextFunction, Response } from 'express';
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
  await RedisClient.init();
  const rateLimiterInstance = new RateLimiterRedis({
    storeClient: RedisClient.pub,
    keyPrefix,
    points, // no. of requests
    duration, // per  (in seconds)
  });
  return async (req: IRequest, res: Response, next: NextFunction) => {
    const { ip } = req;
    try {
      await rateLimiterInstance.consume(ip);
      next();
    } catch (e) {
      error(req, res, new CustomError('Too many requests', ErrorTypes.TOO_MANY_REQUESTS));
    }
  };
};

export default rateLimiter;
