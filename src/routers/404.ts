import { Express, Router } from 'express';
import { ErrorTypes } from '../lib/constants';
import { error } from '../services/output';
import CustomError from '../lib/customError';
import { IRequestHandler } from '../types/request';

const router = Router();

const sendNotFound: IRequestHandler = (req, res) => error(req, res, new CustomError(`Method ${req.method} for path ${req.originalUrl} not found`, ErrorTypes.NOT_FOUND));

router.get('*', sendNotFound);
router.post('*', sendNotFound);
router.put('*', sendNotFound);
router.patch('*', sendNotFound);
router.delete('*', sendNotFound);

export default (app: Express) => app.use('/', router);
